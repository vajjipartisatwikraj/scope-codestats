/**
 * Judge0 Auth Header Probe
 * Tries different header combinations to find which one works
 */
const axios = require("axios");
const path = require("path");
const result = require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
Object.assign(process.env, result.parsed);

const URL = process.env.JUDGE0_HOST;
const TOKEN = process.env.JUDGE0_AUTH_TOKEN;
const HEADER = process.env.JUDGE0_AUTH_HEADER;

const combos = [
  { label: "X-Auth-Token = JUDGE0_AUTH_TOKEN", headers: { "X-Auth-Token": TOKEN } },
  { label: "X-Auth-Token = JUDGE0_AUTH_HEADER", headers: { "X-Auth-Token": HEADER } },
  { label: "X-Auth-Token = TOKEN + X-Auth-User = HEADER", headers: { "X-Auth-Token": TOKEN, "X-Auth-User": HEADER } },
  { label: "X-Auth-Token = HEADER + X-Auth-User = TOKEN", headers: { "X-Auth-Token": HEADER, "X-Auth-User": TOKEN } },
  { label: "Authorization: Token TOKEN", headers: { "Authorization": `Token ${TOKEN}` } },
  { label: "Authorization: Token HEADER", headers: { "Authorization": `Token ${HEADER}` } },
  { label: "Authorization: Bearer TOKEN", headers: { "Authorization": `Bearer ${TOKEN}` } },
  { label: "No auth (baseline)", headers: {} },
];

async function main() {
  console.log(`Testing ${URL}/about with various auth headers...\n`);
  console.log(`JUDGE0_AUTH_TOKEN = ${TOKEN}`);
  console.log(`JUDGE0_AUTH_HEADER = ${HEADER}\n`);

  for (const { label, headers } of combos) {
    try {
      const res = await axios.get(`${URL}/about`, { headers, timeout: 8000 });
      console.log(`\x1b[32m✔ ${label}  -->  ${res.status} OK\x1b[0m`);
    } catch (err) {
      const status = err.response?.status || err.code;
      console.log(`\x1b[31m✘ ${label}  -->  ${status}\x1b[0m`);
    }
  }
}

main();
