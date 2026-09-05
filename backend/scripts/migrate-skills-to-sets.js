// One-off migration: converts the legacy flat skills array
//   skills: ["Java", "Python"]
// into the grouped skill-set format
//   skills: [{ name: "Skills", skills: ["Java", "Python"] }]
//
// Run with: node scripts/migrate-skills-to-sets.js
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const { normalizeSkillSets } = require("../utils/skillSets");

async function migrate() {
  let uri = process.env.MONGODB_URI;
  if (uri.includes("localhost")) uri = uri.replace(/localhost/g, "127.0.0.1");
  await mongoose.connect(uri);
  console.log("Connected to DB");

  // Read through the raw collection so mongoose doesn't try to cast the old shape
  const collection = mongoose.connection.collection("users");
  const legacyUsers = await collection
    .find({ skills: { $type: "string" } }, { projection: { skills: 1, email: 1 } })
    .toArray();

  console.log(`Found ${legacyUsers.length} user(s) with legacy skills`);

  for (const user of legacyUsers) {
    const skills = normalizeSkillSets(user.skills);
    await collection.updateOne({ _id: user._id }, { $set: { skills } });
    console.log(`  ${user.email}: ${JSON.stringify(skills)}`);
  }

  await mongoose.disconnect();
  console.log("Done");
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
