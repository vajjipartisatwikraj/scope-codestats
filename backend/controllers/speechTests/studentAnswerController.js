/**
 * Speech tests, student side: saving answers and the microphone check.
 *
 * Wired to URLs in routes/speechTests.js, which also applies the login check and the raw
 * body parser that turns an uploaded recording into a Buffer.
 */
const SpeechTestAnswer = require("../../models/SpeechTestAnswer");
const SpeechTestAttempt = require("../../models/SpeechTestAttempt");
const User = require("../../models/User");
const speechJudge = require("../../services/speechJudgeClient");
const engine = require("../../services/speechTestService");
const { isValidId, attemptSectionOf } = require("../../services/speechTestState");
const { ServiceError } = require("../../utils/ServiceError");
const { parseWav } = require("../../utils/wav");
const { handle, loadStudentTest, findSection, log } = require("./common");

// Last audio-check time per student, so the (heavier) judge call cannot be spammed.
const audioCheckLastCall = new Map();
const AUDIO_CHECK_MIN_GAP_MS = 3000;
const AUDIO_CHECK_MAX_SECONDS = 20;

const AUDIO_ISSUES = {
  EXCESSIVE_NOISE: "There is a lot of background noise. Move somewhere quieter.",
  CLIPPING: "Your voice is distorted. Lower your microphone volume or sit a little further back.",
};

/** The uploaded recording as a parsed WAV, or a 400 when it is missing or not a WAV file. */
function readWavUpload(req) {
  const audio = req.body;
  if (!Buffer.isBuffer(audio) || audio.length === 0) {
    throw new ServiceError(400, "Send the recording as audio/wav");
  }
  const wav = parseWav(audio);
  if (!wav) throw new ServiceError(400, "That is not a valid WAV recording");
  return { audio, wav };
}

async function saveAudioAnswer({ req, res, section, key, base }) {
  const { audio, wav } = readWavUpload(req);

  const limit = engine.MAX_RECORD_SECONDS[section.type] + 5;
  if (wav.durationS > limit) {
    throw new ServiceError(400, `Recording is too long (max ${limit - 5} seconds)`);
  }

  await SpeechTestAnswer.findOneAndUpdate(
    key,
    { $set: { ...base, audio, durationS: Math.round(wav.durationS * 10) / 10, text: "" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ saved: true, kind: "audio", durationS: wav.durationS });
}

async function saveTextAnswer({ req, res, section, question, key, base }) {
  let text = String(req.body?.text || "").trim();
  const maxChars = engine.MAX_TEXT_ANSWER_CHARS[section.type] || 1000;
  if (text.length > maxChars) throw new ServiceError(400, "Answer is too long");

  // A multiple-choice answer is the ids of the chosen options, comma separated.
  if (section.type === "MCQ" && text) {
    const valid = new Set((question.options || []).map((o) => String(o._id)));
    const picked = [...new Set(text.split(",").map((id) => id.trim()).filter(Boolean))];
    if (picked.some((id) => !valid.has(id))) throw new ServiceError(400, "That is not one of the options");
    text = picked.sort().join(",");
  }

  // Clearing an on-screen answer removes it, so a half-built answer is not scored.
  if (!text) {
    await SpeechTestAnswer.deleteOne(key);
    return res.json({ saved: true, kind: "text", cleared: true });
  }

  await SpeechTestAnswer.findOneAndUpdate(
    key,
    { $set: { ...base, audio: null, durationS: 0, text } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  res.json({ saved: true, kind: "text" });
}

/** Saves (or replaces) one answer the moment it is given. */
const saveAnswer = handle(async (req, res) => {
  const test = await loadStudentTest(req);
  const section = findSection(test, req.params.sectionId);
  if (!isValidId(req.params.questionId)) throw new ServiceError(404, "Question not found");
  const question = section.questions.find((q) => String(q._id) === req.params.questionId);
  if (!question) throw new ServiceError(404, "Question not found");

  const attempt = await SpeechTestAttempt.findOne({ test: test._id, user: req.user.id });
  const state = attempt && attemptSectionOf(attempt, section._id);
  const now = new Date();

  if (!attempt || attempt.status !== "in_progress" || !state || state.status !== "in_progress") {
    throw new ServiceError(409, "This section is not open for answers", { code: "SECTION_CLOSED" });
  }
  if (now.getTime() > new Date(state.deadlineAt).getTime() + engine.UPLOAD_GRACE_MS) {
    throw new ServiceError(409, "Time is up for this section", { code: "SECTION_TIME_UP" });
  }

  const kind = engine.questionAnswerKind(section, question);
  const key = { attempt: attempt._id, questionId: question._id };
  const base = { test: test._id, user: req.user.id, sectionId: section._id, kind };

  if (kind === "audio") return saveAudioAnswer({ req, res, section, key, base });
  return saveTextAnswer({ req, res, section, question, key, base });
});

/**
 * Microphone check shown before the test starts.
 *
 * The student says their name; the judge transcribes it (scored as a short
 * reading of their own name) and we report what it heard plus whether the
 * recording was clean. Nothing is stored. If the judge is unreachable the
 * response says so, and the student is not blocked from starting.
 */
const checkAudio = handle(async (req, res) => {
  await loadStudentTest(req);

  const last = audioCheckLastCall.get(req.user.id) || 0;
  if (Date.now() - last < AUDIO_CHECK_MIN_GAP_MS) {
    throw new ServiceError(429, "Please wait a moment before checking again");
  }
  audioCheckLastCall.set(req.user.id, Date.now());

  const { audio, wav } = readWavUpload(req);
  if (wav.durationS > AUDIO_CHECK_MAX_SECONDS) {
    throw new ServiceError(400, "Recording is too long for a quick check");
  }

  const student = await User.findById(req.user.id).select("name").lean();
  const spokenName = String(student?.name || "").trim() || "my name";

  let result;
  try {
    result = await speechJudge.evaluate({
      requestId: `audio-check:${req.user.id}:${Date.now()}`,
      questionType: "READING",
      audio: audio.toString("base64"),
      expectedText: spokenName,
    });
  } catch (error) {
    if (error instanceof speechJudge.SpeechJudgeError) {
      log.warn(`[SpeechTest] audio check unavailable: ${error.message}`);
      return res.json({ available: false });
    }
    throw error;
  }

  const transcript = String(result?.evaluation?.transcription?.text || "").trim();
  const flags = Array.isArray(result?.flags) ? result.flags : [];

  const issues = [];
  if (result?.status === "LOW_AUDIO_QUALITY") {
    issues.push(result.reason || "We could not hear you clearly. Speak a little louder.");
  }
  flags.forEach((flag) => {
    if (AUDIO_ISSUES[flag]) issues.push(AUDIO_ISSUES[flag]);
  });
  if (!transcript && issues.length === 0) {
    issues.push("We could not make out any words. Say your name clearly and try again.");
  }

  res.json({
    available: true,
    clear: issues.length === 0 && Boolean(transcript),
    transcript,
    issues,
  });
});

module.exports = { saveAnswer, checkAudio };
