import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * The hero moves with the scroll, in layers that travel at different speeds, so leaving the top of the page feels
 * like depth instead of a flat page sliding up:
 *
 *   the backdrop video   drifts down a little and grows slowly, so it seems farther away than the page
 *   the words            rise a little faster than the page and fade out before the hero has gone
 *
 * Only transform and opacity change, so the browser does it on the graphics card. For people who asked for less
 * motion nothing moves.
 *
 *   const hero = useHeroScroll();
 *   <section ref={hero.ref} className="lp-hero">
 *     <HeroBackdrop motion={hero}> ...the video... </HeroBackdrop>
 *     <HeroContent motion={hero} className="lp-hero-main"> ...the words... </HeroContent>
 *   </section>
 */
export function useHeroScroll() {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });

  const backdropY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const backdropScale = useTransform(scrollYProgress, [0, 1], [1, 1.14]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  // Written as a function on purpose: framer-motion would otherwise hand a plain opacity ramp to the browser's own scroll
  // timeline, which measures the hero from before the top of the page and so fades it at the wrong moment.
  const contentOpacity = useTransform(() => Math.min(1, Math.max(0, 1 - scrollYProgress.get() / 0.65)));

  return {
    ref,
    backdropStyle: reduced ? undefined : { y: backdropY, scale: backdropScale },
    contentStyle: reduced ? undefined : { y: contentY, opacity: contentOpacity },
  };
}

export function HeroBackdrop({ motion: hero, children }) {
  return (
    <motion.div className="lp-hero-backdrop" style={hero.backdropStyle}>
      {children}
    </motion.div>
  );
}

export function HeroContent({ motion: hero, className, children }) {
  return (
    <motion.div className={className} style={hero.contentStyle}>
      {children}
    </motion.div>
  );
}
