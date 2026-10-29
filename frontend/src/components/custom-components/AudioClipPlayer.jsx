import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { PauseIcon } from '@phosphor-icons/react/dist/csr/Pause';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { ArrowClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowClockwise';
import './shared.css';
import './AudioClipPlayer.css';
import WaveformBars from './WaveformBars';
import useElementWidth from './useElementWidth';
import { clamp, colorVars, cx } from './chartUtils';

/**
 * AudioClipPlayer: one row to listen to a recorded clip. A 44px play and pause circle, a waveform
 * you can click, drag or use the keyboard on to seek, and the elapsed and total time.
 *
 * It wraps a native <audio> element (preloading only the metadata) and behaves like the
 * recorder's own preview did: starting one clip pauses any other clip that is playing, a clip
 * that ends goes back to its start, a clip that is replaced stops, and a clip that fails to load
 * says so and offers a retry instead of failing silently.
 *
 * Props
 *   src        URL of the audio (a blob: URL works)
 *   title      a name shown above the waveform and used in the accessible names ("Question 2 answer")
 *   peaks      optional number[] in 0..1: the real loudness of the clip, drawn as the waveform
 *              (any length; it is fitted to the width). WITHOUT peaks the waveform is a generated
 *              placeholder: a gentle, repeatable pattern that is NOT the audio. It is marked
 *              decorative (data-peaks="placeholder", hidden from assistive technology, and the
 *              seek control says so), so never read it as data.
 *   duration   optional seconds, used until the browser knows the real length. Recorded WebM files
 *              often report an infinite length; this is the fallback, and the player also tries
 *              the usual trick to find the real one.
 *   onPlay(event), onEnded(event), onError(event)   called from the audio element's events
 *   colors     { bg, button, onButton, wave, played, text, muted }, any CSS colour
 *   className, style   passed to the root element
 *
 * Seek control (role="slider"): drag or click the waveform; Left and Right arrows move 5s, Page
 * Up and Page Down 10s, Home and End go to the ends.
 *
 * States: loading (a spinner in the circle and "--:--" for the length), ready, playing, error (a
 * message with "Try again").
 *
 * CSS variables: --acp-bg --acp-button --acp-on-button --acp-wave --acp-played --acp-text --acp-muted
 */

const COLOR_VARS = {
  bg: '--acp-bg',
  button: '--acp-button',
  onButton: '--acp-on-button',
  wave: '--acp-wave',
  played: '--acp-played',
  text: '--acp-text',
  muted: '--acp-muted',
};

const BAR_WIDTH = 3;
const BAR_GAP = 3;
const SMALL_STEP = 5; // seconds
const BIG_STEP = 10;

// The clip that is playing now, so starting another one can pause it
let nowPlaying = null;

/** 83 -> "1:23", 3725 -> "1:02:05", unknown -> "--:--" */
function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** "1 minute 23 seconds": what a screen reader should hear for a time */
function spokenTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return 'unknown length';
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  const parts = [];
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minute' : 'minutes'}`);
  if (s > 0 || m === 0) parts.push(`${s} ${s === 1 ? 'second' : 'seconds'}`);
  return parts.join(' ');
}

/** A repeatable pattern of `count` heights, derived from `seed`. Not data. */
function placeholderPeaks(seed, count) {
  let state = 2166136261;
  for (let k = 0; k < seed.length; k += 1) {
    state ^= seed.charCodeAt(k);
    state = Math.imul(state, 16777619) >>> 0;
  }
  const next = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const phaseA = next() * Math.PI * 2;
  const phaseB = next() * Math.PI * 2;
  return Array.from({ length: count }, (_, i) => {
    const wave = 0.5 + 0.2 * Math.sin(i * 0.32 + phaseA) + 0.12 * Math.sin(i * 0.87 + phaseB) + (next() - 0.5) * 0.14;
    return clamp(wave, 0.22, 0.78);
  });
}

export default function AudioClipPlayer({
  src,
  title,
  peaks,
  duration: durationHint,
  onPlay,
  onEnded,
  onError,
  colors,
  className,
  style,
}) {
  const audioRef = useRef(null);
  const waveRef = useRef(null);
  const headRef = useRef(null);
  const rafRef = useRef(0);
  const draggingRef = useRef(false);
  const fixingRef = useRef(false); // finding the real length of a clip that reports Infinity
  const durationRef = useRef(null);
  const describedId = useId();

  const [status, setStatus] = useState(src ? 'loading' : 'error'); // 'loading' | 'ready' | 'error'
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [elapsed, setElapsed] = useState(0); // whole seconds, for the text and the slider value
  const [mediaDuration, setMediaDuration] = useState(null);

  const hint = Number.isFinite(durationHint) && durationHint > 0 ? durationHint : null;
  const total = mediaDuration !== null ? mediaDuration : hint;
  durationRef.current = total;

  const [boxRef, boxWidth] = useElementWidth();
  const barCount = boxWidth > 0 ? Math.max(8, Math.floor((boxWidth + BAR_GAP) / (BAR_WIDTH + BAR_GAP))) : 48;
  const hasPeaks = Array.isArray(peaks) && peaks.length > 0;
  const seed = `${src || ''}|${title || ''}`;
  const shownPeaks = useMemo(
    () => (hasPeaks ? peaks : placeholderPeaks(seed, barCount)),
    [hasPeaks, peaks, seed, barCount]
  );

  // The waveform progress and the playhead follow the audio without rendering: the position is
  // written to a CSS variable
  const paint = useCallback(() => {
    const audio = audioRef.current;
    // While the real length is being found the position is a huge number: leave it alone
    if (audio && fixingRef.current) return;
    const length = durationRef.current;
    const share = audio && length ? clamp(audio.currentTime / length, 0, 1) : 0;
    const value = String(Math.round(share * 10000) / 10000);
    if (waveRef.current) waveRef.current.style.setProperty('--wb-progress', value);
    if (headRef.current) headRef.current.style.setProperty('--acp-progress', value);
    setElapsed(audio ? Math.floor(audio.currentTime) : 0);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const startLoop = useCallback(() => {
    stopLoop();
    const frame = () => {
      paint();
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
  }, [paint, stopLoop]);

  // A new clip: back to the start. Leaving the clip (or the screen) stops it.
  useEffect(() => {
    const audio = audioRef.current;
    fixingRef.current = false;
    setStatus(src ? 'loading' : 'error');
    setPlaying(false);
    setBuffering(false);
    setMediaDuration(null);
    setElapsed(0);
    paint();
    return () => {
      stopLoop();
      if (audio) audio.pause();
      if (nowPlaying === audio) nowPlaying = null;
    };
  }, [src, paint, stopLoop]);

  // ---- Events of the audio element ---------------------------------------------------------
  const handleDuration = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const length = audio.duration;
    if (length === Infinity) {
      // A recording made by MediaRecorder has no length in its header. Jumping far past the end
      // makes the browser read the file and learn it.
      if (!fixingRef.current) {
        fixingRef.current = true;
        try {
          audio.currentTime = 1e101;
        } catch {
          fixingRef.current = false;
        }
      }
    } else if (Number.isFinite(length) && length > 0) {
      setMediaDuration(length);
      if (fixingRef.current) {
        fixingRef.current = false;
        audio.currentTime = 0;
      }
    }
    setStatus((current) => (current === 'error' ? current : 'ready'));
  };

  const handlePlay = (event) => {
    const audio = audioRef.current;
    if (nowPlaying && nowPlaying !== audio) nowPlaying.pause();
    nowPlaying = audio;
    if (onPlay) onPlay(event);
  };

  const handlePlaying = () => {
    setPlaying(true);
    setBuffering(false);
    startLoop();
  };

  const handlePause = () => {
    stopLoop();
    setPlaying(false);
    setBuffering(false);
    paint();
    if (nowPlaying === audioRef.current) nowPlaying = null;
  };

  const handleEnded = (event) => {
    const audio = audioRef.current;
    stopLoop();
    setPlaying(false);
    if (audio) audio.currentTime = 0;
    paint();
    if (nowPlaying === audio) nowPlaying = null;
    if (onEnded) onEnded(event);
  };

  const handleError = (event) => {
    stopLoop();
    setPlaying(false);
    setBuffering(false);
    setStatus('error');
    if (onError) onError(event);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || status === 'error') return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch (error) {
      // AbortError: paused or replaced before it started, which is not a failure.
      // NotAllowedError: the browser wants a gesture; the next press works.
      if (error && error.name === 'NotSupportedError') setStatus('error');
    }
  };

  const retry = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setStatus('loading');
    fixingRef.current = false;
    audio.load();
  };

  // ---- Seeking -----------------------------------------------------------------------------
  const canSeek = status === 'ready' && total !== null;

  const seekTo = (seconds) => {
    const audio = audioRef.current;
    if (!audio || total === null) return;
    audio.currentTime = clamp(seconds, 0, total);
    paint();
  };

  const seekFromPointer = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    seekTo(clamp((event.clientX - box.left) / box.width, 0, 1) * total);
  };

  const onPointerDown = (event) => {
    if (!canSeek || (event.pointerType === 'mouse' && event.button !== 0)) return;
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromPointer(event);
  };
  const onPointerMove = (event) => {
    if (draggingRef.current) seekFromPointer(event);
  };
  const onPointerUp = (event) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onKeyDown = (event) => {
    if (!canSeek) return;
    const audio = audioRef.current;
    const now = audio ? audio.currentTime : 0;
    let target = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') target = now + SMALL_STEP;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') target = now - SMALL_STEP;
    else if (event.key === 'PageUp') target = now + BIG_STEP;
    else if (event.key === 'PageDown') target = now - BIG_STEP;
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = total;
    if (target === null) return;
    event.preventDefault();
    seekTo(target);
  };

  // ---- Rendering ---------------------------------------------------------------------------
  const name = title || 'audio clip';
  const busy = status === 'loading' || (playing && buffering);
  const buttonLabel = status === 'error' ? `Cannot play ${name}` : `${playing ? 'Pause' : 'Play'} ${name}`;
  const statusText = status === 'loading' ? 'Loading audio' : status === 'error' ? 'Could not load the audio' : '';
  const rootStyle = { ...colorVars(colors, COLOR_VARS), ...style };

  return (
    <div
      className={cx('cc acp', className)}
      style={rootStyle}
      data-state={status}
      data-playing={playing ? 'true' : 'false'}
      data-started={elapsed > 0 || playing ? 'true' : 'false'}
      data-peaks={hasPeaks ? 'audio' : 'placeholder'}
    >
      <audio
        ref={audioRef}
        src={src || undefined}
        preload="metadata"
        onLoadedMetadata={handleDuration}
        onDurationChange={handleDuration}
        onCanPlay={() => setStatus((current) => (current === 'error' ? current : 'ready'))}
        onWaiting={() => setBuffering(true)}
        onPlay={handlePlay}
        onPlaying={handlePlaying}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleError}
        onTimeUpdate={paint}
      />

      <button
        type="button"
        className="acp__button"
        onClick={toggle}
        aria-label={buttonLabel}
        aria-disabled={status === 'error' ? 'true' : undefined}
        data-busy={busy ? 'true' : 'false'}
      >
        {busy ? (
          <SpinnerGapIcon className="acp__spin" size={20} weight="bold" aria-hidden="true" />
        ) : playing ? (
          <PauseIcon size={20} weight="fill" aria-hidden="true" />
        ) : (
          <PlayIcon size={20} weight="fill" aria-hidden="true" />
        )}
      </button>

      <div ref={boxRef} className="acp__main">
        {title ? <span className="acp__title">{title}</span> : null}

        {status === 'error' ? (
          <div className="acp__error">
            <WarningCircleIcon size={20} weight="regular" aria-hidden="true" />
            <span className="acp__error-text">{src ? 'This audio could not be loaded.' : 'There is no audio to play.'}</span>
            {src ? (
              <button type="button" className="acp__retry" onClick={retry}>
                <ArrowClockwiseIcon size={16} weight="bold" aria-hidden="true" />
                Try again
              </button>
            ) : null}
          </div>
        ) : (
          <div
            className="acp__wave"
            role="slider"
            tabIndex={canSeek ? 0 : -1}
            aria-label={`Seek ${name}`}
            aria-valuemin={0}
            aria-valuemax={total !== null ? Math.floor(total) : 0}
            aria-valuenow={Math.min(elapsed, total !== null ? Math.floor(total) : elapsed)}
            aria-valuetext={`${spokenTime(elapsed)} of ${spokenTime(total === null ? NaN : total)}`}
            aria-disabled={canSeek ? undefined : 'true'}
            aria-describedby={hasPeaks ? undefined : describedId}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onKeyDown={onKeyDown}
          >
            <WaveformBars ref={waveRef} values={shownPeaks} bars={barCount} progress={0} height={40} gap={BAR_GAP} />
            <span ref={headRef} className="acp__head" aria-hidden="true">
              <span className="acp__head-mark" />
            </span>
            {!hasPeaks ? (
              <span id={describedId} className="cc-sr-only">
                The waveform is decorative. It does not show the loudness of this clip.
              </span>
            ) : null}
          </div>
        )}
      </div>

      <span className="acp__time" aria-hidden="true">
        <span className="acp__elapsed">{formatTime(status === 'error' ? 0 : elapsed)}</span>
        <span className="acp__sep"> / </span>
        <span>{formatTime(total === null ? NaN : total)}</span>
      </span>

      <span className="cc-sr-only" role="status">
        {statusText}
      </span>
    </div>
  );
}
