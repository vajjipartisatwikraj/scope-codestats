/**
 * Speaks a sentence with the browser's built-in text-to-speech.
 *
 * Used for Repeat questions: the teacher stores only the sentence, and the
 * student's browser reads it aloud, so no audio is generated, stored or paid
 * for. Which voices exist depends on the device, so the accent is a preference:
 * an exact match (en-IN) first, then any English voice.
 */

export const ACCENTS = [
  { id: "en-IN", label: "Indian English" },
  { id: "en-US", label: "US English" },
  { id: "en-GB", label: "British English" },
  { id: "en-AU", label: "Australian English" },
];

export const isSpeechSupported = () =>
  typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

/** Voices load asynchronously in some browsers, so wait for them once. */
function loadVoices() {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const existing = synth.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      resolve(synth.getVoices());
    };
    synth.addEventListener("voiceschanged", done);
    // Some browsers never fire the event when there are no voices.
    setTimeout(done, 1500);
  });
}

const normalize = (lang) => String(lang || "").replace("_", "-").toLowerCase();

export const GENDERS = [
  { id: "female", label: "Female" },
  { id: "male", label: "Male" },
];

/**
 * Browsers do not report a voice's gender, so it is inferred from the voice
 * name. This covers the voices shipped with Windows, macOS, Android and Chrome.
 * Unknown names return null rather than a guess.
 */
const MALE_NAMES =
  /\b(male|david|mark|james|george|guy|ryan|thomas|daniel|alex|fred|rishi|ravi|prabhat|rocko|eddy|reed|aaron|arthur|brian|christopher|eric|roger|steffan|liam|william|oliver|matthew|stephen|henry|lee|gordon|oliver)\b/i;
const FEMALE_NAMES =
  /\b(female|zira|hazel|susan|jenny|aria|libby|sonia|samantha|karen|moira|veena|tessa|heera|neerja|kalpana|catherine|natasha|clara|emma|michelle|ava|ana|amy|olivia|serena|fiona|allison|kate|victoria|joanna|ruth|kajal|aditi|raveena|sara|linda|nancy)\b/i;

export function guessGender(voice) {
  const name = voice?.name || "";
  // "Female" contains "male", so it must be tested first.
  if (/\bfemale\b/i.test(name)) return "female";
  if (MALE_NAMES.test(name)) return "male";
  if (FEMALE_NAMES.test(name)) return "female";
  return null;
}

/**
 * Best available voice for an accent and gender.
 * Preference: exact accent + gender, then gender in any English accent, then
 * the accent with any gender, then any English voice.
 *
 * @returns {Promise<{voice: SpeechSynthesisVoice|null, genderMatched: boolean, accentMatched: boolean}>}
 */
export async function findVoice(accent, gender) {
  if (!isSpeechSupported()) return { voice: null, genderMatched: false, accentMatched: false };

  const voices = await loadVoices();
  const wanted = normalize(accent);
  const english = voices.filter((v) => normalize(v.lang).startsWith("en"));
  const sameAccent = english.filter((v) => normalize(v.lang) === wanted);
  const isGender = (v) => guessGender(v) === gender;

  const exact = sameAccent.find(isGender);
  if (exact) return { voice: exact, genderMatched: true, accentMatched: true };

  const otherAccent = english.find(isGender);
  if (otherAccent) return { voice: otherAccent, genderMatched: true, accentMatched: false };

  if (sameAccent[0]) return { voice: sameAccent[0], genderMatched: false, accentMatched: true };

  return { voice: english[0] || null, genderMatched: false, accentMatched: false };
}

/** Kept for callers that only need the voice. */
export async function pickVoice(accent, gender) {
  return (await findVoice(accent, gender)).voice;
}

export function cancelSpeech() {
  if (isSpeechSupported()) window.speechSynthesis.cancel();
}

/**
 * Speaks `text`. Resolves when it finishes (or is cancelled); rejects only when
 * the browser reports a real error.
 *
 * @param {string} text
 * @param {{accent?: string, gender?: "female"|"male", rate?: number, onStart?: function}} [options]
 */
export async function speak(text, { accent = "en-IN", gender = "female", rate = 0.95, onStart } = {}) {
  if (!isSpeechSupported()) throw new Error("This browser cannot speak text aloud.");

  const synth = window.speechSynthesis;
  synth.cancel();

  const { voice, genderMatched } = await findVoice(accent, gender);
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang || accent;
  if (voice) utterance.voice = voice;
  utterance.rate = rate;
  // No voice of the wanted gender on this device: shift the pitch so the
  // choice is still audible, rather than ignoring it.
  if (!genderMatched) utterance.pitch = gender === "male" ? 0.7 : 1.25;

  return new Promise((resolve, reject) => {
    utterance.onstart = () => onStart?.();
    utterance.onend = () => resolve();
    utterance.onerror = (event) => {
      // Cancelling (starting another sentence, leaving the page) is not a failure.
      if (event.error === "canceled" || event.error === "interrupted") resolve();
      else reject(new Error(event.error || "Speech failed"));
    };
    synth.speak(utterance);
  });
}
