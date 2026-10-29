import { useEffect, useState } from "react";
import { levelFromRms, rmsOf, shapeLevel, smoothLevel } from "../../../utils/waveformMath";

/** How often the level is published to React (ms). The analyser itself is read every frame. */
const PUBLISH_MS = 70;

/**
 * Reads an AnalyserNode and reports the loudness of what it hears, for the level meter and the
 * "input level" check. Display only: it never touches the recorder.
 *
 *   level   0..1, the current level (same decibel scale as the waveform), smoothed
 *   peak    0..1, the loudest level since this analyser appeared. It is kept after the recording
 *           ends, and starts again from 0 with the next analyser.
 *
 * Pass `null` when nothing is being recorded: the level drops to 0 and the peak stays.
 */
const useInputLevel = (analyser) => {
  const [reading, setReading] = useState({ level: 0, peak: 0 });

  useEffect(() => {
    if (!analyser) {
      setReading((current) => (current.level === 0 ? current : { ...current, level: 0 }));
      return undefined;
    }

    setReading({ level: 0, peak: 0 });
    const samples = new Float32Array(analyser.fftSize);
    let raf = 0;
    let smooth = 0;
    let peak = 0;
    let lastPublish = 0;

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      analyser.getFloatTimeDomainData(samples);
      smooth = smoothLevel(smooth, shapeLevel(levelFromRms(rmsOf(samples))));
      if (smooth > peak) peak = smooth;
      if (now - lastPublish >= PUBLISH_MS) {
        lastPublish = now;
        setReading({ level: smooth, peak });
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      // Keep the final peak so the check can judge the whole recording
      setReading((current) => ({ level: 0, peak: Math.max(current.peak, peak) }));
    };
  }, [analyser]);

  return reading;
};

export default useInputLevel;
