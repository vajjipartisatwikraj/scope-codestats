// End-to-end probe: mints a token for the real user and calls the catalogue
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI.replace(/localhost/g, "127.0.0.1"));
  const User = require("./models/User");
  const user = await User.findOne({ rollNumber: /^23R21A05Y9$/i })
    .select("_id sessionToken")
    .lean();

  const token = jwt.sign(
    { userId: user._id.toString(), sessionToken: user.sessionToken },
    process.env.JWT_SECRET,
    { expiresIn: "5m" },
  );

  const res = await fetch(
    "http://127.0.0.1:5000/api/achievements/certifications/catalog",
    { headers: { Authorization: `Bearer ${token}` } },
  );

  console.log("status:", res.status);
  const body = await res.json();
  const list = body.certifications || [];
  console.log("entries returned:", list.length);
  console.log(
    "servicenow entries:",
    list.filter((c) => c.issuer === "ServiceNow").map((c) => c.code).join(", ") || "NONE",
  );

  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error("failed:", err.message);
  await mongoose.disconnect().catch(() => {});
});
