/**
 * The only file that talks to S3 for the bank library. Everything else asks it for JSON documents by
 * key, so the rest of the library never sees the AWS SDK.
 *
 * "Delete" never removes an object for good: `moveToTrash` copies it under trash/<time>/ first (the
 * bucket's lifecycle rule empties trash/ after a while, and bucket versioning keeps older versions),
 * then removes the original.
 */
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} = require("@aws-sdk/client-s3");
const { getConfig } = require("../../config/bankLibrary");
const logger = require("../../utils/logger");
const { BankLibraryError, mapLimit, trashKeyFor } = require("./common");

const log = logger.scope("BANK-LIBRARY");

let cached = null; // { signature, client }

/** One client for the current settings; a new one when a setting changes */
function client() {
  const config = getConfig();
  if (!config.bucket) {
    throw new BankLibraryError("The bank library is not set up. Set BANK_LIBRARY_S3_BUCKET in the backend environment.", 503, "BANK_LIBRARY_NOT_CONFIGURED");
  }
  if (config.hasPartialCredentials) {
    throw new BankLibraryError("Set both BANK_LIBRARY_S3_ACCESS_KEY_ID and BANK_LIBRARY_S3_SECRET_ACCESS_KEY, or neither.", 503, "BANK_LIBRARY_NOT_CONFIGURED");
  }
  const signature = JSON.stringify([config.bucket, config.region, config.endpoint, config.credentials?.accessKeyId]);
  if (!cached || cached.signature !== signature) {
    cached = {
      signature,
      client: new S3Client({
        region: config.region,
        credentials: config.credentials, // undefined = the default chain (the EC2 instance role)
        // An S3-compatible server (MinIO, LocalStack) often does not know the newer checksum headers
        ...(config.endpoint ? { endpoint: config.endpoint, forcePathStyle: true, requestChecksumCalculation: "WHEN_REQUIRED", responseChecksumValidation: "WHEN_REQUIRED" } : {}),
        maxAttempts: 4,
      }),
    };
  }
  return { s3: cached.client, bucket: config.bucket };
}

/** Turns an AWS failure into an error that says what to fix, without leaking internals */
function toLibraryError(error, action) {
  if (error instanceof BankLibraryError) return error;
  const name = error?.name || "";
  const status = error?.$metadata?.httpStatusCode;

  // S3 says which region the bucket is really in; the usual cause of a 400/301 on a new setup
  const bucketRegion = error?.$response?.headers?.["x-amz-bucket-region"];
  if (bucketRegion && bucketRegion !== getConfig().region && [301, 307, 400].includes(status)) {
    return new BankLibraryError(`The bucket is in the region ${bucketRegion}. Set BANK_LIBRARY_S3_REGION=${bucketRegion} in the backend environment.`, 503, "BANK_LIBRARY_UNAVAILABLE");
  }
  if (name === "NoSuchKey" || name === "NotFound" || status === 404) {
    return new BankLibraryError("That item is not in the bank library.", 404, "NOT_FOUND");
  }
  if (name === "NoSuchBucket") {
    return new BankLibraryError("The bank library bucket does not exist. Check BANK_LIBRARY_S3_BUCKET and the region.", 503, "BANK_LIBRARY_UNAVAILABLE");
  }
  if (name === "AccessDenied" || name === "Forbidden" || status === 403 || name === "InvalidAccessKeyId" || name === "SignatureDoesNotMatch") {
    return new BankLibraryError("The server is not allowed to use the bank library bucket. Check its IAM permissions.", 503, "BANK_LIBRARY_UNAVAILABLE");
  }
  const wrapped = new BankLibraryError(`The bank library storage failed while ${action}. Try again.`, 502, "BANK_LIBRARY_STORAGE");
  wrapped.cause = error;
  return wrapped;
}

async function run(action, work) {
  try {
    return await work();
  } catch (error) {
    const mapped = toLibraryError(error, action);
    if (mapped.status >= 500) log.error(`S3 failed while ${action}:`, error);
    throw mapped;
  }
}

// ---- Documents -----------------------------------------------------------------------------------------

/** The JSON document at `key`; answers 404 when there is none */
function getJson(key) {
  return run("reading a file", async () => {
    const { s3, bucket } = client();
    const response = await logger.timed("s3.get", () => s3.send(new GetObjectCommand({ Bucket: bucket, Key: key })));
    const body = await response.Body.transformToString("utf-8");
    try {
      return JSON.parse(body);
    } catch {
      throw new BankLibraryError("A file in the bank library is not valid JSON.", 502, "BANK_LIBRARY_CORRUPT");
    }
  });
}

/** The JSON document at `key`, or null when there is none */
async function tryGetJson(key) {
  try {
    return await getJson(key);
  } catch (error) {
    if (error instanceof BankLibraryError && error.status === 404) return null;
    throw error;
  }
}

function putJson(key, document) {
  return run("saving a file", async () => {
    const { s3, bucket } = client();
    await logger.timed("s3.put", () =>
      s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: JSON.stringify(document, null, 2),
          ContentType: "application/json; charset=utf-8",
        })
      )
    );
  });
}

// ---- Listing --------------------------------------------------------------------------------------------

/** Every key under `prefix`, with its size and time */
function listObjects(prefix) {
  return run("listing files", async () => {
    const { s3, bucket } = client();
    const found = [];
    let token;
    do {
      const page = await logger.timed("s3.list", () => s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })));
      (page.Contents || []).forEach((item) => found.push({ key: item.Key, size: item.Size, modifiedAt: item.LastModified }));
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    return found;
  });
}

// ---- Deleting (to the trash) ----------------------------------------------------------------------------

/** Removes up to 1000 keys at a time and reports the ones S3 refused */
async function deleteKeys(keys) {
  const { s3, bucket } = client();
  const failed = [];
  for (let start = 0; start < keys.length; start += 1000) {
    const batch = keys.slice(start, start + 1000);
    const result = await s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true } }));
    (result.Errors || []).forEach((entry) => failed.push(entry.Key));
  }
  return failed;
}

/**
 * Moves every object under `prefix` (or the one object at `key`) to trash/<time>/. The copy comes
 * first and the original is removed only when every copy worked, so a failure leaves nothing lost.
 * Resolves with how many objects moved.
 */
function moveToTrash({ prefix, key }) {
  return run("deleting", async () => {
    const { s3, bucket } = client();
    const keys = key ? [key] : (await listObjects(prefix)).map((item) => item.key);
    if (keys.length === 0) return 0;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await mapLimit(keys, 10, (from) =>
      s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: trashKeyFor(from, stamp),
          // The source is "bucket/key"; the SDK wants it URL-encoded but with the slashes kept
          CopySource: encodeURI(`${bucket}/${from}`),
        })
      )
    );

    const failed = await deleteKeys(keys);
    if (failed.length > 0) {
      throw new BankLibraryError(`Some files could not be removed (${failed.length}). Try again.`, 502, "BANK_LIBRARY_STORAGE");
    }
    return keys.length;
  });
}

// ---- Health ----------------------------------------------------------------------------------------------

/** Whether the bucket can be reached with the current settings; never throws */
async function checkReachable() {
  try {
    const { s3, bucket } = client();
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return { reachable: true };
  } catch (error) {
    const mapped = toLibraryError(error, "checking the bucket");
    return { reachable: false, reason: mapped.message };
  }
}

module.exports = { getJson, tryGetJson, putJson, listObjects, moveToTrash, checkReachable };
