import React from "react";

/**
 * The authored mark of the empty list: a resume sheet with a heading, lines of text and a small
 * plus. 120px, tonal (it is drawn with the surface roles, so it follows the theme).
 */
export default function EmptyMark() {
  return (
    <svg
      className="rbl-mark"
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle className="rbl-mark__disc" cx="60" cy="60" r="56" />
      <rect className="rbl-mark__sheet" x="34" y="20" width="52" height="72" rx="8" />
      <rect className="rbl-mark__ink" x="42" y="30" width="24" height="5" rx="2.5" />
      <rect className="rbl-mark__line" x="42" y="42" width="36" height="3" rx="1.5" />
      <rect className="rbl-mark__line" x="42" y="49" width="30" height="3" rx="1.5" />
      <rect className="rbl-mark__line" x="42" y="56" width="36" height="3" rx="1.5" />
      <rect className="rbl-mark__line" x="42" y="67" width="24" height="3" rx="1.5" />
      <rect className="rbl-mark__line" x="42" y="74" width="32" height="3" rx="1.5" />
      <circle className="rbl-mark__badge" cx="84" cy="88" r="14" />
      <path className="rbl-mark__plus" d="M84 81v14M77 88h14" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
