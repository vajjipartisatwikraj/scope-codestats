import { useEffect, useState } from "react";
import { levelFromRms, rmsOf } from "../../../utils/waveformMath";

/**
 * A coarse "Quiet / Good / Loud" reading of the live microphone, refreshed a few
 * times a second. It is only a hint for the student: the waveform itself draws
 * the detailed signal.
 */
const useInputLevel = (analyser) => {
  const [label, setLabel] = useState("Good");

  useEffect(() => {
    if (!analyser) return undefined;

    const samples = new Float32Array(analyser.fftSize);
    // A short average, so one cough does not flip the label.
    let smoothed = 0.5;

    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      smoothed = smoothed * 0.6 + levelFromRms(rmsOf(samples)) * 0.4;
      setLabel(smoothed < 0.2 ? "Low" : smoothed > 0.9 ? "Loud" : "Good");
    }, 400);

    return () => clearInterval(timer);
  }, [analyser]);

  return label;
};

export default useInputLevel;
