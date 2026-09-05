/**
 * Re-derives the `recognized` flag on every certification achievement.
 *
 * Run after adding entries to constants/certifications.js, or once to backfill
 * certificates created before the flag existed.
 *
 *   node scripts/backfill-recognized-certifications.js           (dry run)
 *   node scripts/backfill-recognized-certifications.js --apply
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const Achievement = require("../models/Achievement");
const { findRecognizedCertification } = require("../constants/certifications");

const apply = process.argv.includes("--apply");

const run = async () => {
  let uri = process.env.MONGODB_URI;
  if (uri.includes("localhost")) uri = uri.replace(/localhost/g, "127.0.0.1");
  await mongoose.connect(uri);

  const certifications = await Achievement.find({ type: "certification" }).select(
    "title issuer recognized",
  );

  console.log(
    `${certifications.length} certification(s) found. Mode: ${apply ? "APPLY" : "DRY RUN"}\n`,
  );

  let changed = 0;

  for (const certification of certifications) {
    const match = findRecognizedCertification(certification.title);
    const recognized = Boolean(match);

    if (recognized === Boolean(certification.recognized)) {
      console.log(`  unchanged (${recognized}) ${certification.title}`);
      continue;
    }

    changed += 1;
    console.log(
      `  ${certification.recognized ? "true" : "false"} -> ${recognized}  ${certification.title}`,
    );

    if (apply) {
      await Achievement.updateOne({ _id: certification._id }, { $set: { recognized } });
    }
  }

  console.log(`\n${changed} record(s) ${apply ? "updated" : "would change"}.`);
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
