import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Plays back a recorded clip (a Blob) and exposes an AnalyserNode for it, so
 * the waveform can react to the playback exactly as it does while recording.
 *
 * Each play builds a fresh <audio> element and audio context, and everything is
 * torn down when the clip ends, is stopped, or changes.
 */
const useClipPlayback = (clip) => {
  const [playing, setPlaying] = useState(false);
  const [analyser, setAnalyser] = useState(null);

  const audioRef = useRef(null);
  const contextRef = useRef(null);
  const urlRef = useRef(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
    setAnalyser(null);
    setPlaying(false);
  }, []);

  const play = useCallback(async () => {
    if (!clip) return;
    stop();

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const url = URL.createObjectURL(clip);
      const audio = new Audio(url);
      const ctx = new AudioCtx();

      const source = ctx.createMediaElementSource(audio);
      const node = ctx.createAnalyser();
      node.fftSize = 1024;
      source.connect(node);
      node.connect(ctx.destination);

      urlRef.current = url;
      audioRef.current = audio;
      contextRef.current = ctx;
      audio.onended = stop;
      audio.onerror = stop;

      if (ctx.state === "suspended") await ctx.resume();
      await audio.play();

      setAnalyser(node);
      setPlaying(true);
    } catch {
      stop();
    }
  }, [clip, stop]);

  const toggle = useCallback(() => (playing ? stop() : play()), [playing, play, stop]);

  // Stop when the clip is replaced and when the screen goes away.
  useEffect(() => stop, [clip, stop]);

  return { playing, analyser, play, stop, toggle };
};

export default useClipPlayback;
