import { isSpeechSupported } from "../../../utils/browserSpeech";

/**
 * The checklist of the audio step, worked out from the state of the recorder. Display only: the
 * only thing that unlocks "Start exam" is still `passed` from useAudioCheck.
 *
 * Each check is { key, title, detail, status, label, fix }
 *   status   'idle' (not checked yet) | 'active' (happening now) | 'pass' | 'skip' (not available,
 *            the student may go on) | 'warn' | 'fail'
 *   label    the word of the badge ("Allowed", "Blocked"), so status is never colour alone
 *   fix      null, or { title, steps: string[], issues?: string[] } explaining how to put it right
 */

/** Below this peak level (0..1 on the waveform's decibel scale, about -44 dBFS) speech is too quiet. */
export const LOW_LEVEL = 0.3;

export const detectBrowser = () => {
  if (typeof navigator === "undefined") return "other";
  const agent = navigator.userAgent || "";
  if (/Edg\//.test(agent)) return "edge";
  if (/Firefox\//.test(agent)) return "firefox";
  if (/Chrome\/|Chromium\/|CriOS\//.test(agent)) return "chrome";
  if (/Safari\//.test(agent)) return "safari";
  return "other";
};

/** Can this browser record from the microphone at all? */
export const recordingSupported = () =>
  typeof navigator !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia) &&
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined";

const BLOCKED_STEPS = {
  chrome: [
    "Select the settings icon at the left of the address bar, then open Site settings.",
    "Set Microphone to Allow.",
    "Reload the page if your browser asks you to, then record again.",
  ],
  edge: [
    "Select the lock icon at the left of the address bar, then open Permissions for this site.",
    "Set Microphone to Allow.",
    "Reload the page if your browser asks you to, then record again.",
  ],
  firefox: [
    "Select the microphone icon with a line through it in the address bar.",
    "Remove the Blocked setting for the microphone.",
    "Record again and choose Allow when Firefox asks.",
  ],
  safari: [
    "Open Safari, then Settings, then Websites, then Microphone.",
    "Set this website to Allow.",
    "Come back to this page and record again.",
  ],
  other: [
    "Open the site settings from the address bar.",
    "Allow the microphone for this site.",
    "Reload the page if your browser asks you to, then record again.",
  ],
};

const FIXES = {
  blocked: (browser) => ({
    title: "How to allow the microphone",
    steps: BLOCKED_STEPS[browser] || BLOCKED_STEPS.other,
  }),
  missing: () => ({
    title: "How to connect a microphone",
    steps: [
      "Plug in a microphone, or earphones with a microphone.",
      "Choose it as the input device in your system sound settings.",
      "Select the record button again.",
    ],
  }),
  unavailable: () => ({
    title: "How to free the microphone",
    steps: [
      "Close other apps and tabs that use the microphone, such as calls or recorders.",
      "Check that the microphone is connected and chosen in your system sound settings.",
      "Select the record button again.",
    ],
  }),
  quiet: () => ({
    title: "How to raise your level",
    steps: [
      "Move closer to the microphone and speak a little louder.",
      "Check the input volume in your device sound settings.",
      "Record again.",
    ],
  }),
  unclear: (issues) => ({
    title: "How to get a clearer sample",
    issues,
    steps: [
      "Move to a quiet room and keep other devices away.",
      "Hold the microphone close and speak at a steady pace.",
      "Record and check again.",
    ],
  }),
  browser: () => ({
    title: "How to switch browser",
    steps: [
      "Open this page in a recent version of Chrome, Edge, Firefox or Safari.",
      "Use the secure (https) address of the site.",
    ],
  }),
};

const MIC_ERROR_LABEL = { blocked: "Blocked", missing: "Not found", unavailable: "Unavailable" };
const MIC_ERROR_DETAIL = {
  blocked: "Your browser is blocking the microphone for this site.",
  missing: "No microphone was found on this device.",
  unavailable: "The microphone could not start. Another app may be using it.",
};

/**
 * @param {object} input
 *   phase, errorKind, result, checking, hasClip, passed   from useAudioCheck
 *   micAllowed   true once a recording has started on this screen
 *   peak         loudest level of the last recording (useInputLevel)
 *   browser      detectBrowser()
 */
export const buildChecks = ({ phase, errorKind, result, checking, hasClip, passed, micAllowed, peak, browser }) => {
  const recording = phase === "recording";
  const micProblem = ["blocked", "missing", "unavailable"].includes(errorKind) ? errorKind : "";

  // 1. Microphone access
  const mic = micProblem
    ? {
        key: "mic",
        title: "Microphone access",
        detail: MIC_ERROR_DETAIL[micProblem],
        status: "fail",
        label: MIC_ERROR_LABEL[micProblem],
        fix: FIXES[micProblem](browser),
      }
    : micAllowed
    ? { key: "mic", title: "Microphone access", detail: "Your browser lets this site use the microphone.", status: "pass", label: "Allowed", fix: null }
    : {
        key: "mic",
        title: "Microphone access",
        detail: "Choose Allow when your browser asks to use the microphone.",
        status: "idle",
        label: "Not checked",
        fix: null,
      };

  // 2. Input level
  let level;
  if (recording) {
    level = { key: "level", title: "Input level", detail: "Say your name now. The bars should move as you speak.", status: "active", label: "Listening", fix: null };
  } else if (hasClip && peak >= LOW_LEVEL) {
    level = { key: "level", title: "Input level", detail: "Your voice was picked up at a good level.", status: "pass", label: "Good level", fix: null };
  } else if (hasClip) {
    level = {
      key: "level",
      title: "Input level",
      detail: "Your voice was very quiet.",
      status: "warn",
      label: "Very quiet",
      fix: FIXES.quiet(),
    };
  } else {
    level = { key: "level", title: "Input level", detail: "Record a short sample to test it.", status: "idle", label: "Not tested", fix: null };
  }

  // 3. Clear speech in a quiet room
  let clarity;
  if (checking) {
    clarity = { key: "clarity", title: "Clear speech", detail: "Listening to your sample.", status: "active", label: "Checking", fix: null };
  } else if (result && result.available === false) {
    clarity = {
      key: "clarity",
      title: "Clear speech",
      detail: "This check is not available right now. Your microphone is still used in the test, so you can go on.",
      status: "skip",
      label: "Skipped",
      fix: null,
    };
  } else if (result && result.clear) {
    clarity = {
      key: "clarity",
      title: "Clear speech",
      detail: "Your voice came through clearly. The room is quiet enough.",
      status: "pass",
      label: "Clear",
      fix: null,
    };
  } else if (result) {
    clarity = {
      key: "clarity",
      title: "Clear speech",
      detail: passed ? "Your sample was hard to follow, but you can go on. A quieter place gives a better score." : "Your sample was hard to follow.",
      status: "warn",
      label: "Unclear",
      fix: FIXES.unclear(Array.isArray(result.issues) ? result.issues : []),
    };
  } else {
    clarity = {
      key: "clarity",
      title: "Clear speech",
      detail: hasClip ? "Select Check audio to test your sample." : "We test your sample to make sure the room is quiet.",
      status: "idle",
      label: "Not checked",
      fix: null,
    };
  }

  // 4. Browser and speaker support
  const canRecord = recordingSupported();
  const canSpeak = isSpeechSupported();
  const support = !canRecord
    ? {
        key: "support",
        title: "Browser support",
        detail: "This browser cannot record audio.",
        status: "fail",
        label: "Not supported",
        fix: FIXES.browser(),
      }
    : !canSpeak
    ? {
        key: "support",
        title: "Browser support",
        detail: "Recording works. This browser cannot play the speaker test sound, so that step was skipped.",
        status: "warn",
        label: "Partly supported",
        fix: null,
      }
    : { key: "support", title: "Browser support", detail: "Recording and sound playback both work in this browser.", status: "pass", label: "Supported", fix: null };

  return [mic, level, clarity, support];
};

/** SegmentedProgress state for a check */
export const SEGMENT_STATE = { pass: "done", skip: "done", active: "current", idle: "todo", warn: "review", fail: "review" };

export const SEGMENT_WORDS = { done: "Passed", current: "In progress", todo: "Not checked", review: "Needs attention" };
