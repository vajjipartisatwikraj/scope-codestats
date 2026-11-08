import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion';

const Word = ({ children, progress, range, reduced, className = '' }) => {
  const opacity = useTransform(progress, range, [0.1, 1], {
    ease: (t) => t * t * (3 - 2 * t),
  });
  return (
    <motion.span
      style={reduced ? undefined : { opacity }}
      className={`inline-block mr-[0.25em] ${className}`}
    >
      {children}
    </motion.span>
  );
};

/**
 * A paragraph whose words fade in one after another as it scrolls into view.
 *
 *   segments   [{ text, className }]: runs of words, each run with its own style
 *   className  the paragraph
 */
const ScrollRevealText = ({ segments, className = '' }) => {
  const containerRef = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.85', 'end 0.45'],
  });

  const words = segments.flatMap((seg) =>
    seg.text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, className: seg.className }))
  );

  return (
    <p ref={containerRef} className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]} reduced={reduced} className={w.className}>
            {w.text}
          </Word>
        );
      })}
    </p>
  );
};

export default ScrollRevealText;
