function isTransactionsUnavailableError(error) {
  const messages = [];
  let current = error;
  let hasIllegalOperationCode = false;

  while (current) {
    if (current.message) messages.push(current.message);
    if (current.code === 20 || current.codeName === "IllegalOperation") {
      hasIllegalOperationCode = true;
    }
    current = current.cause;
  }

  const message = messages.join(" ").toLowerCase();
  return (
    message.includes("transaction numbers are only allowed") ||
    message.includes("transactions are not supported") ||
    message.includes("transaction support") ||
    message.includes("replica set member or mongos") ||
    (hasIllegalOperationCode && message.includes("transaction"))
  );
}

/**
 * Run a unit of work inside a MongoDB transaction when the deployment supports
 * transactions (replica set or sharded cluster).
 *
 * On a standalone server MongoDB rejects transactions outright, so the aborted
 * attempt writes nothing and the work is retried once without a session. The
 * retry is not atomic: it is a best-effort path so single-node development and
 * self-hosted deployments remain usable. Use `persistenceMode` in the result to
 * report which path executed.
 *
 * @param {(session: import("mongoose").ClientSession|null) => Promise<any>} work
 * @param {{label?: string}} [options]
 * @returns {Promise<{result: any, persistenceMode: "transaction"|"standalone"}>}
 */
async function runWithOptionalTransaction(work, options = {}) {
  const { label = "operation" } = options;
  const mongoose = require("mongoose");
  const session = await mongoose.startSession();
  let transactionsUnavailable = false;

  try {
    session.startTransaction();
    const result = await work(session);
    await session.commitTransaction();
    return { result, persistenceMode: "transaction" };
  } catch (error) {
    transactionsUnavailable = isTransactionsUnavailableError(error);
    if (session.inTransaction()) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error(`Error aborting ${label} transaction:`, abortError);
      }
    }
    if (!transactionsUnavailable) throw error;
  } finally {
    await session.endSession();
  }

  console.warn(
    `MongoDB transactions are unavailable; running ${label} without a transaction.`
  );
  const result = await work(null);
  return { result, persistenceMode: "standalone" };
}

module.exports = { isTransactionsUnavailableError, runWithOptionalTransaction };
