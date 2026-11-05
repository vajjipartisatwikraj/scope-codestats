/**
 * Imports a folder of scraped questions into the bank library (S3 bucket + catalog).
 *
 * The folder is one bank; each sub-folder is a topic; each topic holds one or more JSON files in the
 * bulk upload format ({ "questions": [ ... ] }). It writes exactly what the bank library page would:
 * bankInfo.json, one topicInfo.json per topic and one file per question, then the catalog rows.
 *
 *   node scripts/importBankFolder.js <folder> [--manifest <file.json>] [--status published|draft] [--dry-run]
 *
 * The manifest names the bank and its topics (see indiaBix_scrape/bank-info/arithmetic-aptitude.json):
 *   { "name", "description", "status", "tags": [], "topics": { "<folder name>": { "name", "description" } } }
 * Topics are created in the order of the manifest. A folder that is not in the manifest is added at
 * the end with its folder name in title case. Without a manifest every topic is named that way.
 *
 * Every question is checked first with the same rules as the cohort bulk upload; if any is invalid
 * nothing is written. A bank with the same name stops the import (delete it in the bank library
 * first, then run again). --dry-run checks and prints the plan and writes nothing.
 *
 * Needs backend/.env: BANK_LIBRARY_S3_* for the bucket and MONGODB_URI for the catalog.
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "warn";
const mongoose = require("mongoose");
const { isConfigured, getConfig } = require("../config/bankLibrary");
const { checkQuestion } = require("../services/bulkQuestionUploadService");
const store = require("../services/bankLibrary/s3Store");
const catalog = require("../services/bankLibrary/catalogService");
const { bankPrefix } = require("../services/bankLibrary/common");

// ---- Arguments --------------------------------------------------------------------------------------

function readArgs(argv) {
  const args = { folder: null, manifest: null, status: null, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--manifest") args.manifest = argv[(i += 1)];
    else if (arg === "--status") args.status = argv[(i += 1)];
    else if (!arg.startsWith("--") && !args.folder) args.folder = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.folder) throw new Error("Usage: node scripts/importBankFolder.js <folder> [--manifest <file.json>] [--status published|draft] [--dry-run]");
  return args;
}

const BATCH = 250; // questions written per call (the library accepts up to 500)

const titleCase = (slug) => slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

// ---- Reading the folder ------------------------------------------------------------------------------

/** The questions of one topic folder, in file order, in the shape the library keeps */
function readTopicQuestions(folder) {
  const files = fs.readdirSync(folder).filter((name) => name.toLowerCase().endsWith(".json")).sort();
  const questions = [];
  files.forEach((file) => {
    const data = JSON.parse(fs.readFileSync(path.join(folder, file), "utf8"));
    const list = Array.isArray(data) ? data : Array.isArray(data.questions) ? data.questions : [data];
    list.forEach((question) => {
      const clean = { ...question };
      // A missing list of companies is an empty list, not null
      if (!Array.isArray(clean.companies)) clean.companies = [];
      questions.push({ file, question: clean });
    });
  });
  return questions;
}

function plan(args) {
  const root = path.resolve(args.folder);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`${root} is not a folder`);
  const manifest = args.manifest ? JSON.parse(fs.readFileSync(path.resolve(args.manifest), "utf8")) : {};
  const present = fs.readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();

  const listed = Object.keys(manifest.topics || {});
  const missing = listed.filter((slug) => !present.includes(slug));
  if (missing.length > 0) throw new Error(`The manifest names topics that are not in the folder: ${missing.join(", ")}`);
  const order = [...listed, ...present.filter((slug) => !listed.includes(slug))];

  return {
    name: manifest.name || titleCase(path.basename(root)),
    description: manifest.description || "",
    status: args.status || manifest.status || "draft",
    tags: manifest.tags || [],
    topics: order.map((slug) => ({
      slug,
      name: manifest.topics?.[slug]?.name || titleCase(slug),
      description: manifest.topics?.[slug]?.description || "",
      questions: readTopicQuestions(path.join(root, slug)),
    })),
  };
}

// ---- Checks ----------------------------------------------------------------------------------------------

async function validateAll(bank) {
  const problems = [];
  for (const topic of bank.topics) {
    for (let index = 0; index < topic.questions.length; index += 1) {
      const { file, question } = topic.questions[index];
      const { issues } = await checkQuestion(question, { moduleId: new mongoose.Types.ObjectId(), createdBy: new mongoose.Types.ObjectId() });
      if (issues.length > 0) problems.push(`${topic.slug}/${file} question ${index + 1}: ${issues.slice(0, 2).map((issue) => `${issue.path} ${issue.message}`).join("; ")}`);
    }
  }
  return problems;
}

// ---- Main ------------------------------------------------------------------------------------------------

async function main() {
  const args = readArgs(process.argv.slice(2));
  const bank = plan(args);
  const total = bank.topics.reduce((sum, topic) => sum + topic.questions.length, 0);

  console.log(`Bank:   ${bank.name} (${bank.status})`);
  console.log(`Topics: ${bank.topics.length}, questions: ${total}`);
  bank.topics.forEach((topic, index) => console.log(`  ${String(index + 1).padStart(2)}. ${topic.name.padEnd(32)} ${String(topic.questions.length).padStart(4)}`));

  const problems = await validateAll(bank);
  if (problems.length > 0) {
    console.error(`\n${problems.length} question(s) are not valid, so nothing was written:`);
    problems.slice(0, 20).forEach((line) => console.error("  " + line));
    process.exit(1);
  }
  console.log("\nAll questions pass the same checks as the cohort bulk upload.");
  if (args.dryRun) {
    console.log("Dry run: nothing was written.");
    return;
  }

  if (!isConfigured()) throw new Error("BANK_LIBRARY_S3_BUCKET is not set in backend/.env");
  const reach = await store.checkReachable();
  if (!reach.reachable) throw new Error(`The bucket cannot be reached: ${reach.reason}`);
  console.log(`Bucket reachable: ${getConfig().bucket} (${getConfig().region})`);

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  const User = require("../models/User");
  const admin = await User.findOne({ userType: "admin" }).select("_id").lean();
  if (!admin) throw new Error("No admin user found to own the bank");
  const actor = { id: String(admin._id), userType: "admin" };

  const started = Date.now();
  const created = await catalog.createBank({ name: bank.name, description: bank.description, status: bank.status, tags: bank.tags }, actor);
  console.log(`\nBank created: ${created.id}`);

  let written = 0;
  try {
    for (let index = 0; index < bank.topics.length; index += 1) {
      const topic = bank.topics[index];
      const made = await catalog.createTopic(created.id, { name: topic.name, description: topic.description, order: index }, actor);
      // The library takes at most 500 questions per call, so a big topic goes in several calls
      const all = topic.questions.map((entry) => entry.question);
      let added = 0;
      for (let start = 0; start < all.length; start += BATCH) {
        const result = await catalog.bulkCreateQuestions(created.id, made.id, { questions: all.slice(start, start + BATCH) }, actor);
        added += result.created;
      }
      written += added;
      console.log(`  ${String(index + 1).padStart(2)}/${bank.topics.length} ${topic.name.padEnd(32)} ${String(added).padStart(4)} questions   (${written}/${total})`);
    }
  } catch (error) {
    console.error(`\nStopped after ${written} of ${total} questions: ${error.message}`);
    console.error(`The bank ${created.id} is only partly written. Delete "${bank.name}" in the bank library and run the import again.`);
    process.exit(1);
  }

  // Check what is really there
  const files = await store.listObjects(bankPrefix(created.id));
  const summary = await catalog.getBank(created.id, actor);
  const expectedFiles = 1 + bank.topics.length + total;
  console.log(`\nIn the bucket: ${files.length} files (expected ${expectedFiles})`);
  console.log(`In the catalog: ${summary.topics.length} topics, ${summary.questionCount} questions`);
  if (files.length !== expectedFiles || summary.questionCount !== total) {
    console.error("The counts do not match. Press Rebuild index in the bank library and check again.");
    process.exit(1);
  }
  console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s.`);
}

main()
  .then(() => mongoose.disconnect().catch(() => {}))
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(`\nFailed: ${error.message}`);
    process.exit(1);
  });
