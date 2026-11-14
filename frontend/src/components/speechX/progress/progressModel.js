/**
 * What the progress page does with the server's answer: which students are on which list. No React
 * in this file.
 */

/** "Dr Rao (CRT), Ms Lee (E-Cell)" */
export const mentorsText = (mentors = []) => mentors.map((mentor) => `${mentor.name} (${mentor.mentorship})`).join(", ");

const fromEntry = (entry) => ({
  id: String(entry.user._id),
  name: entry.user.name,
  email: entry.user.email,
  rollNumber: entry.user.rollNumber,
  department: entry.user.department,
  section: entry.user.section,
  year: entry.user.graduatingYear,
  mobile: entry.user.mobileNumber,
  status: entry.status === "completed" ? "completed" : "in_progress",
  score: typeof entry.finalScore === "number" ? entry.finalScore : null,
  rank: entry.rank,
  mentors: entry.mentors || [],
});

const fromWaiting = (user) => ({
  id: String(user._id),
  name: user.name,
  email: user.email,
  rollNumber: user.rollNumber,
  department: user.department,
  section: user.section,
  year: user.graduatingYear,
  mobile: user.mobileNumber,
  status: "not_started",
  score: null,
  rank: null,
  mentors: user.mentors || [],
});

/**
 * The four lists behind the tiles, each a title, a sentence and the students on it.
 * `entries` come ranked (finished first), `notStarted` by roll number.
 */
export function listsOf({ entries = [], notStarted = [] }) {
  const started = entries.map(fromEntry);
  const waiting = notStarted.map(fromWaiting);
  return {
    all: { title: "All students", description: "Finished students come first, in rank order.", rows: [...started, ...waiting] },
    notStarted: { title: "Not yet started", description: "Students who have not opened the test.", rows: waiting },
    inProgress: { title: "In progress", description: "Students who started and have not finished.", rows: started.filter((row) => row.status === "in_progress") },
    finished: { title: "Finished", description: "In rank order.", rows: started.filter((row) => row.status === "completed") },
  };
}

/** The leaderboard's own entries: the finished students only */
export const finishedEntries = (entries = []) => entries.filter((entry) => entry.status === "completed");
