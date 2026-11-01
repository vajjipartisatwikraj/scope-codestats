/**
 * Sample data: a few cohorts, so the student's cohort page (/cohorts) has something to show.
 *
 *   node scripts/seedSampleCohorts.js                        add the sample cohorts
 *   node scripts/seedSampleCohorts.js --remove               delete them again (and only them)
 *   node scripts/seedSampleCohorts.js --email=a@b.c          make another student eligible
 *
 * The student defaults to 23r21a05y9@mlrit.ac.in and must already have an account (nothing here
 * creates a user). There are no questions: each cohort only has a few empty modules, so a card has
 * a module count to show.
 *
 * What it covers, one cohort per case, so every section and status of the page is visible:
 *   Scheduled tests       an exam that is live now, one that starts in two days, one that has ended
 *   My enrolled cohorts   two in progress (one of them open to everyone) and one completed
 *   Global cohorts        two open to everyone that the student has not joined
 *   Assigned to me        two for eligible students only, not started
 *
 * Every sample title starts with "Sample: " and --remove deletes by that prefix together with the
 * exact titles below, so real cohorts are never touched. Running it again does not duplicate: a
 * cohort that already exists is kept and its dates, eligibility and enrolment are brought up to date.
 *
 * Uses MONGODB_URI from backend/.env (or the environment).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Cohort = require("../models/Cohort");
const CohortProctor = require("../models/CohortProctor");
const Module = require("../models/Module");
const User = require("../models/User");
const UserCohort = require("../models/UserCohort");

const DEFAULT_EMAIL = "23r21a05y9@mlrit.ac.in";
const PREFIX = "Sample: ";
const HOUR = 3600e3;
const DAY = 24 * HOUR;

/**
 * kind     tests | enrolled | global | assigned (what the page sorts it under)
 * access   global (everyone) or userGroups (only eligible students)
 * joined   enrolled | completed | undefined (the student's own status)
 * exam     [startOffsetMs, endOffsetMs] from now, for an exam
 */
const SAMPLES = [
  { kind: "tests", title: "Data Structures Midterm", description: "Timed assessment on arrays, linked lists, stacks and queues. Open now.", modules: ["Arrays and strings", "Linked lists", "Stacks and queues"], access: "userGroups", exam: [-1 * HOUR, 3 * HOUR] },
  { kind: "tests", title: "Operating Systems Quiz", description: "Processes, scheduling and memory management. Starts in two days.", modules: ["Processes and threads", "Memory management"], access: "userGroups", exam: [2 * DAY, 2 * DAY + 2 * HOUR] },
  { kind: "tests", title: "Aptitude Screening Test", description: "Quantitative and logical reasoning screening used for campus drives.", modules: ["Quantitative aptitude", "Logical reasoning"], access: "userGroups", exam: [-3 * DAY, -3 * DAY + 2 * HOUR] },

  { kind: "enrolled", title: "Python Basics", description: "Syntax, loops, functions and collections, taught through short guided exercises.", modules: ["Getting started", "Control flow", "Functions", "Lists and dictionaries", "Files and errors", "Mini project"], access: "userGroups", joined: "enrolled" },
  { kind: "enrolled", title: "Java and Spring Boot", description: "Core Java, then REST services with Spring Boot. Open to every student.", modules: ["Core Java", "Collections", "Spring Boot basics", "REST APIs"], access: "global", joined: "enrolled" },
  { kind: "enrolled", title: "Web Development Fundamentals", description: "HTML, CSS and JavaScript from the ground up, finished with a small site.", modules: ["HTML and CSS", "JavaScript", "DOM and events", "Final project"], access: "userGroups", joined: "completed" },

  { kind: "global", title: "Problem Solving Starter", description: "A gentle start to competitive programming: patterns, complexity and your first contests.", modules: ["Thinking in steps", "Complexity", "Searching and sorting", "Recursion", "Practice round"], access: "global" },
  { kind: "global", title: "Git and GitHub Essentials", description: "Version control for teams: branches, pull requests and resolving conflicts.", modules: ["Git basics", "Branching", "Pull requests"], access: "global" },

  { kind: "assigned", title: "SQL Foundations", description: "Queries, joins, grouping and window functions with problems that mirror what companies ask in a first technical round.", modules: ["SELECT and filtering", "Joins", "Grouping", "Window functions", "Design and indexes"], access: "userGroups" },
  { kind: "assigned", title: "Competitive Programming Bootcamp", description: "Dynamic programming, graphs and number theory for the final-year placement season.", modules: ["Dynamic programming", "Graph algorithms", "Number theory", "Contest strategy"], access: "userGroups" },
].map((sample) => ({ ...sample, title: PREFIX + sample.title }));

function argValue(name) {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

/** The cohort fields for a sample, with dates measured from now */
function fieldsOf(sample, creatorId) {
  const now = Date.now();
  const base = {
    title: sample.title,
    description: sample.description,
    accessType: sample.access,
    isDraft: false,
    createdBy: creatorId,
    startDate: new Date(now - 14 * DAY),
    endDate: new Date(now + 60 * DAY),
    isActive: true,
  };
  if (!sample.exam) return { ...base, mode: "practice" };

  const [from, to] = sample.exam;
  return {
    ...base,
    mode: "exam",
    examStartTime: new Date(now + from),
    examEndTime: new Date(now + to),
    examDurationMinutes: null,
    startDate: new Date(now + from - 1 * DAY),
    endDate: new Date(now + to + 1 * DAY),
    // The sweeper switches a finished exam off; a published one stays listed
    isActive: to > 0,
  };
}

async function addSamples(student, creatorId) {
  for (const sample of SAMPLES) {
    const fields = fieldsOf(sample, creatorId);
    let cohort = await Cohort.findOne({ title: sample.title });
    const existed = Boolean(cohort);
    if (!cohort) cohort = new Cohort(fields);
    else cohort.set(fields);

    // Only students on the eligible list can open a cohort that is not global
    if (sample.access === "userGroups" && !cohort.eligibleUsers.some((id) => String(id) === String(student._id))) {
      cohort.eligibleUsers.push(student._id);
    }
    await cohort.save();

    // A few empty modules (no questions) so the card has a module count
    if (cohort.modules.length === 0) {
      const modules = await Module.insertMany(
        sample.modules.map((title, index) => ({ title, description: `${title}.`, order: index + 1, cohort: cohort._id }))
      );
      cohort.modules = modules.map((module) => module._id);
      await cohort.save();
    }

    // The student's own status in the cohort
    if (sample.joined) {
      const completed = sample.joined === "completed";
      await UserCohort.findOneAndUpdate(
        { user: student._id, cohort: cohort._id },
        {
          user: student._id,
          cohort: cohort._id,
          status: sample.joined,
          enrolledAt: new Date(Date.now() - 10 * DAY),
          ...(completed ? { completedAt: new Date(Date.now() - 2 * DAY) } : {}),
        },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }

    console.log(`  ${existed ? "kept   " : "created"}  [${sample.kind.padEnd(8)}]  ${sample.title}`);
  }
}

async function removeSamples() {
  const titles = SAMPLES.map((sample) => sample.title);
  const cohorts = await Cohort.find({ title: { $in: titles } }).select("_id title");
  const ids = cohorts.map((cohort) => cohort._id);
  if (ids.length === 0) {
    console.log("No sample cohorts to remove.");
    return;
  }
  const enrolments = await UserCohort.deleteMany({ cohort: { $in: ids } });
  const proctor = await CohortProctor.deleteMany({ cohort: { $in: ids } });
  const modules = await Module.deleteMany({ cohort: { $in: ids } });
  const removed = await Cohort.deleteMany({ _id: { $in: ids } });
  console.log(`Removed ${removed.deletedCount} cohorts, ${modules.deletedCount} modules, ${enrolments.deletedCount} enrolments, ${proctor.deletedCount} exam records.`);
}

async function main() {
  const email = (argValue("email") || DEFAULT_EMAIL).trim().toLowerCase();
  await connectDB();

  if (process.argv.includes("--remove")) {
    await removeSamples();
    return;
  }

  const student = await User.findOne({ email }).select("_id name email userType");
  if (!student) {
    throw new Error(`No account with the email ${email}. Sign in with it once, then run this again.`);
  }
  // Cohorts need an author: the first admin, or the student if there is none
  const admin = await User.findOne({ userType: "admin" }).select("_id");
  const creatorId = admin ? admin._id : student._id;

  console.log(`Student: ${student.name} <${student.email}> (${student.userType})`);
  await addSamples(student, creatorId);

  const open = await Cohort.find({ title: { $regex: `^${PREFIX}` }, $or: [{ accessType: "global" }, { eligibleUsers: student._id }] }).countDocuments();
  console.log(`\nDone. ${open} of ${SAMPLES.length} sample cohorts are open to ${student.email}.`);
}

main()
  .catch((err) => {
    console.error(`\nFailed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
