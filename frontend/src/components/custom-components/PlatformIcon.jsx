import React from 'react';
import PLATFORM_ICON_PATHS from './platformIconPaths';

/**
 * PlatformIcon: the mark of a coding platform (LeetCode, CodeChef, HackerRank, Codeforces, GitHub) or of
 * CodeStats itself, as a small icon.
 *
 * Props
 *   platform   'leetcode' | 'codechef' | 'hackerrank' | 'codeforces' | 'github' | 'scopecodestats'
 *   size       the side of the icon in px (default 16)
 *   color      the fill of the mark. Default: a --ds-* data series colour that matches the platform
 *              (GitHub takes the text colour). The CodeStats mark is a picture and keeps its own colours.
 *   className  extra class for the icon
 *
 * The icon is decorative (aria-hidden): put the platform's name beside it as text.
 */
const DEFAULT_COLORS = {
  leetcode: 'var(--ds-series-amber)',
  codechef: 'var(--ds-series-coral)',
  hackerrank: 'var(--ds-series-green)',
  codeforces: 'var(--ds-series-blue)',
  github: 'var(--ds-text)',
};

export default function PlatformIcon({ platform, size = 16, color, className }) {
  if (platform === 'scopecodestats') {
    return (
      <img
        className={className}
        src="/codestats-color.png"
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        style={{ display: 'block', flex: 'none', width: size, height: size, objectFit: 'contain' }}
      />
    );
  }

  const path = PLATFORM_ICON_PATHS[platform];
  if (!path) return null;

  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color || DEFAULT_COLORS[platform] || 'currentColor'}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flex: 'none' }}
    >
      <path d={path} />
    </svg>
  );
}
