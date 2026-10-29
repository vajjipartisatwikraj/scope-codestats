import React, { useEffect, useState } from 'react';
import { Avatar, YouBadge } from './Cells';
import { formatNumber, formatRank } from './leaderboardFormat';
import { TABS, valueOf } from './leaderboardModel';

/**
 * The signed-in student's place, kept in view while their own row is not on the screen: on
 * another page, or hidden by the filters. It is a floating layer at the bottom of the window
 * (the one kind of surface that casts a shadow) and it only exists while it is needed.
 *
 * It is positioned from the width of the page it belongs to, because the app's side rail and its
 * scrolling shell make "stick to the bottom of the table" unreliable.
 *
 * Props
 *   anchorRef   the page element whose left edge and width the bar takes
 *   row         the student
 *   tab         'score' | 'problems'
 *   rank        their rank in the filtered list, or null when the filters hide them
 *   onGo        brings their row into view (on another page) or clears the filters (hidden)
 */
export default function PositionBar({ anchorRef, row, tab, rank, onGo }) {
  const [box, setBox] = useState(null);
  const hidden = typeof rank !== 'number';
  const info = TABS.find((entry) => entry.key === tab);

  useEffect(() => {
    const node = anchorRef.current;
    if (!node) return undefined;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      setBox({ left: rect.left, width: rect.width });
    };
    measure();
    window.addEventListener('resize', measure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (observer) observer.observe(node);
    return () => {
      window.removeEventListener('resize', measure);
      if (observer) observer.disconnect();
    };
  }, [anchorRef]);

  if (!box) return null;

  return (
    <div className="lb-bar" role="region" aria-label="Your place" style={{ left: box.left, width: box.width }}>
      <Avatar name={row.name} picture={row.profilePicture} size={36} />
      <p className="lb-bar__text">
        <span className="lb-bar__name">
          {row.name}
          <YouBadge />
        </span>
        <span className="lb-bar__meta">
          {hidden ? 'The filters hide your row' : `${formatRank(rank)} \u00b7 ${formatNumber(valueOf(row, tab))} ${info.unit}`}
        </span>
      </p>
      <button type="button" className="lb-bar__button" onClick={onGo}>
        {hidden ? 'Reset filters' : 'Show my row'}
      </button>
    </div>
  );
}
