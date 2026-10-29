import { useEffect, useState } from "react";
import { levelFromRms, rmsOf } from "../../../utils/waveformMath";

const IDLE = { label: "Good", level: 0 };

/**
 * The live microphone level, for the recording screen.
 *
 * Returns { label, level }:
 *   level  0..1, refreshed ten times a second and lightly smoothed, for the LevelMeter bars
 *   label  a coarse "Low / Good / Loud" reading (the same slow average and thresholds the
 *          old screen used, so one cough does not flip it), for the words next to the meter
 *
 * It is only a hint for the student: the waveform itself draws the detailed signal.
 */
const useInputLevel = (analyser) => {
  const [reading, setReading] = useState(IDLE);

  useEffect(() => {
    if (!analyser) {
      setReading((previous) => (previous.level === 0 ? previous : { ...previous, level: 0 }));
      return undefined;
    }

    const samples = new Float32Array(analyser.fftSize);
    let slow = 0.5; // for the label
    let quick = 0; // for the bars

    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(samples);
      const now = levelFromRms(rmsOf(samples));
      slow = slow * 0.88 + now * 0.12;
      quick = quick * 0.5 + now * 0.5;

      const label = slow < 0.2 ? "Low" : slow > 0.9 ? "Loud" : "Good";
      const level = Math.round(quick * 100) / 100;
      setReading((previous) => (previous.label === label && previous.level === level ? previous : { label, level }));
    }, 100);

    return () => clearInterval(timer);
  }, [analyser]);

  return reading;
};

export default useInputLevel;
