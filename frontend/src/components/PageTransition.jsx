import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * PageTransition
 *
 * Wraps a route's content to provide a smooth, professional enter/exit
 * animation when navigating between the public landing pages
 * (Landing, About, Docs, Contact).
 *
 * Design note: we intentionally avoid any positive vertical/horizontal
 * translate or scale > 1. A downward translate (or a zoom-out) would push
 * the tall page content beyond its natural size and momentarily grow the
 * scroll container, causing a scrollbar to flash in during the transition.
 * By using opacity + blur + a subtle inward scale that never exceeds 1, the
 * content stays within its natural bounds, so no transient scrollbar appears.
 *
 * Must be rendered inside an <AnimatePresence mode="wait"> in the router so
 * the outgoing page finishes exiting before the incoming page enters.
 */
const easing = [0.22, 1, 0.36, 1]; // easeOutExpo-ish, smooth and modern

const variants = {
  initial: {
    opacity: 0,
    scale: 0.985,
    filter: 'blur(6px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.5,
      ease: easing,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.99,
    filter: 'blur(6px)',
    transition: {
      duration: 0.3,
      ease: easing,
    },
  },
};

const PageTransition = ({ children }) => {
  // Reset scroll to the top whenever a new page is entered. Because the
  // Routes are keyed by pathname, this wrapper remounts on every landing
  // navigation, and with AnimatePresence's "wait" mode the new page mounts
  // only after the previous one has finished exiting - so this fires at the
  // right moment and keeps the effect scoped to the landing pages.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{
        width: '100%',
        // Scale from the top so a tall page grows/settles naturally
        transformOrigin: '50% 0%',
        willChange: 'opacity, transform, filter',
      }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
