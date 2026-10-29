import { useCallback, useEffect, useState } from "react";
import { cancelSpeech, isSpeechSupported, speak } from "../../../utils/browserSpeech";

export const SPEAKER_PHRASE = "Welcome to SCOPE Codestats";

/**
 * Behind the speaker check: plays the phrase in a female British English
 * voice and tracks whether the student has confirmed they heard it.
 *
 * `heard` is null until the student answers, then true or false. `canContinue`
 * is true once they confirm, or straight away when the browser cannot speak at
 * all (so an unsupported browser never blocks the exam).
 */
const useSpeakerCheck = () => {
  const supported = isSpeechSupported();

  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(false);
  const [heard, setHeard] = useState(null);
  const [error, setError] = useState("");

  const play = useCallback(async () => {
    if (!supported) return;
    setError("");
    setHeard(null);
    setPlaying(true);
    try {
      await speak(SPEAKER_PHRASE, { accent: "en-GB", gender: "female", rate: 0.95 });
      setPlayed(true);
    } catch {
      setError("Could not play the sound. Check your device volume and output, then try again.");
    } finally {
      setPlaying(false);
    }
  }, [supported]);

  // Stop speaking if the student leaves the step mid-sentence.
  useEffect(() => () => cancelSpeech(), []);

  return {
    supported,
    playing,
    played,
    heard,
    error,
    canContinue: !supported || heard === true,
    play,
    confirm: setHeard,
  };
};

export default useSpeakerCheck;
