import React, { useRef } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';

/**
 * A background video that is only loaded once its section is near the screen, and not at all
 * for people who asked for less motion. Keeps a phone from downloading three videos at once.
 * Without a src there is no video. parallax lets it drift against the scroll (a CSS scroll timeline, in browsers that
 * have one), so a section's background seems to sit behind its content.
 */
export const BackdropVideo = ({ src, parallax = false }) => {
  const ref = useRef(null);
  const near = useInView(ref, { once: true, margin: '400px 0px' });
  const reduced = useReducedMotion();
  return (
    <div ref={ref} className={parallax ? 'absolute inset-0 z-0 lp-backdrop--parallax' : 'absolute inset-0 z-0'} aria-hidden="true">
      {src && near && !reduced ? (
        <video autoPlay loop muted playsInline className="h-full w-full object-cover" src={src} />
      ) : null}
    </div>
  );
};

/**
 * A video in a 16:9 frame, loaded when it is near the screen.
 *
 *   src       the video address
 *   speed     playback speed (1 is normal; the sample assessment recording is shown faster)
 *   controls  always show the player controls (they are always shown to people who asked for less
 *             motion, because the video does not start by itself for them)
 *   title     what the video shows, for screen readers
 *
 * It plays by itself, muted and looping, unless the visitor asked for less motion.
 */
export const DemoVideo = ({ src, speed = 1, controls = false, title }) => {
  const ref = useRef(null);
  const near = useInView(ref, { once: true, margin: '300px 0px' });
  const reduced = useReducedMotion();
  return (
    <div ref={ref} className="lp-demo">
      {near ? (
        <video
          autoPlay={!reduced}
          controls={controls || reduced}
          loop
          muted
          playsInline
          preload="metadata"
          src={src}
          aria-label={title}
          onLoadedMetadata={(e) => {
            if (speed !== 1) e.currentTarget.playbackRate = speed;
          }}
        />
      ) : null}
    </div>
  );
};
