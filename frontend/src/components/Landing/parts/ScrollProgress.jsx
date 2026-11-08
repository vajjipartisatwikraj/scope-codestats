import React from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

/**
 * A thin line along the top of the screen that fills as the page is read. It follows the scroll through a
 * spring, so it glides with the smooth scrolling instead of jumping with each wheel step. Decorative
 * (aria-hidden); it is left out for people who asked for less motion.
 */
export default function ScrollProgress() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  if (reduced) return null;
  return <motion.div className="lp-progress" style={{ scaleX }} aria-hidden="true" />;
}
