import React from 'react';

/**
 * The mouse pointer used by the landing page's animated pictures: white with a dark edge, so it reads on a
 * dark card. Its tip is at the top left of the drawing. Position and move it with the .fx-pointer styles
 * (CohortsDemo.css), which also fade it in and out and make it dip when it clicks.
 */
export default function PointerArrow() {
  return (
    <svg viewBox="0 0 22 24" width="22" height="24" aria-hidden="true" focusable="false">
      <path d="M3 2 L3 19 L7.4 15 L10.2 21.4 L13 20.2 L10.2 13.9 L16 13.6 Z" fill="#fff" stroke="#0d0d0f" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
