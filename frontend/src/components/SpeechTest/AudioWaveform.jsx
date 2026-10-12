import React, { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import {
  barCountFor,
  barHeightFor,
  levelFromRms,
  rmsOf,
  shapeLevel,
  smoothLevel,
} from "../../utils/waveformMath";

/**
 * Live voice waveform: rounded vertical bars, centred on a midline, that scroll
 * left as you speak.
 *
 * It reads the microphone straight from a Web Audio `AnalyserNode` inside its
 * own animation loop and draws on a canvas, so a recording never causes React
 * re-renders. Each bar is the loudness (RMS, on a decibel scale) of one short
 * slice of audio; a new bar enters on the right every `sampleIntervalMs` and
 * the whole row glides left in between. With no signal it shows a row of dots.
 *
 * @param {object}  props
 * @param {AnalyserNode|null} props.analyser  source of the audio signal
 * @param {boolean} [props.active]            false freezes the display on idle dots
 * @param {number}  [props.height]            canvas height in px
 * @param {number}  [props.barWidth]          bar thickness in px
 * @param {number}  [props.gap]               space between bars in px
 * @param {string}  [props.color]             bar colour
 * @param {number}  [props.sampleIntervalMs]  how often a new bar is produced
 */
const AudioWaveform = ({
  analyser = null,
  active = true,
  height = 64,
  barWidth = 6,
  gap = 5,
  color = "#e8484f",
  sampleIntervalMs = 60,
  ariaLabel = "Microphone level",
}) => {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    const ctx = canvas.getContext("2d");
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const live = Boolean(analyser && active);
    const step = barWidth + gap;

    let width = 0;
    let count = 1;
    let levels = []; // oldest -> newest; one extra entry for the bar scrolling in
    let raf = 0;

    // Signal accumulation between two bars.
    let sumSquares = 0;
    let frames = 0;
    let lastPush = performance.now();
    let lastLevel = 0;
    const samples = analyser ? new Float32Array(analyser.fftSize) : null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = Math.max(1, Math.floor(wrap.clientWidth));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      count = barCountFor(width, barWidth, gap) + 2;
      // Keep the most recent history when the width changes.
      levels = [...new Array(Math.max(0, count - levels.length)).fill(0), ...levels].slice(-count);
    };

    const draw = (frac) => {
      ctx.clearRect(0, 0, width, height);
      ctx.lineCap = "round";
      ctx.lineWidth = barWidth;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;

      const midY = height / 2;
      const fadeZone = step * 3;

      for (let i = 0; i < levels.length; i += 1) {
        const age = levels.length - 1 - i; // 0 = newest
        const x = width - barWidth / 2 - (age + frac) * step + step;
        if (x < -barWidth || x > width + barWidth) continue;

        // The newest bar grows in as it arrives instead of popping.
        const grow = age === 0 ? Math.min(1, 0.25 + frac * 1.5) : 1;
        const h = barHeightFor(levels[i] * grow, barWidth, height);
        const half = Math.max(0, h / 2 - barWidth / 2);

        // Bars fade out towards the left edge.
        const edge = Math.min(1, Math.max(0, x / fadeZone));
        ctx.globalAlpha = (live ? 1 : 0.6) * edge;

        ctx.beginPath();
        if (half < 0.5) {
          // A silent bar is a dot. Filling a circle is drawn reliably everywhere,
          // whereas a zero-length rounded stroke is not.
          ctx.arc(x, midY, barWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.moveTo(x, midY - half);
          ctx.lineTo(x, midY + half);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const push = (level) => {
      levels.push(level);
      if (levels.length > count) levels.shift();
    };

    const tick = (now) => {
      raf = requestAnimationFrame(tick);

      analyser.getFloatTimeDomainData(samples);
      const rms = rmsOf(samples);
      sumSquares += rms * rms;
      frames += 1;

      const elapsed = now - lastPush;
      if (elapsed >= sampleIntervalMs) {
        // Several intervals may have passed if the tab was in the background.
        const due = Math.min(count, Math.floor(elapsed / sampleIntervalMs));
        const reading = levelFromRms(Math.sqrt(sumSquares / Math.max(1, frames)));
        for (let n = 0; n < due; n += 1) {
          const value = n === 0 ? reading : 0;
          lastLevel = smoothLevel(lastLevel, shapeLevel(value));
          push(lastLevel);
        }
        lastPush = elapsed > sampleIntervalMs * count ? now : lastPush + due * sampleIntervalMs;
        sumSquares = 0;
        frames = 0;
      }

      const frac = reducedMotion ? 0 : Math.min(1, (now - lastPush) / sampleIntervalMs);
      draw(frac);
    };

    resize();
    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            resize();
            if (!live) draw(0);
          })
        : null;
    observer?.observe(wrap);

    if (live) {
      lastPush = performance.now();
      raf = requestAnimationFrame(tick);
    } else {
      draw(0); // idle dots
    }

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [analyser, active, height, barWidth, gap, color, sampleIntervalMs]);

  return (
    <Box
      ref={wrapRef}
      role="img"
      aria-label={ariaLabel}
      sx={{ width: "100%", height, overflow: "hidden", lineHeight: 0 }}
    >
      <canvas ref={canvasRef} />
    </Box>
  );
};

export default AudioWaveform;
