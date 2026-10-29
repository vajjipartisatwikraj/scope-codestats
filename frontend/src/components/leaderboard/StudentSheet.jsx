import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { Avatar, Consistency, ScoreChange, YouBadge } from './Cells';
import { formatNumber, formatRank, profilePath } from './leaderboardFormat';
import { PLATFORMS, TAB_PLATFORMS, TABS, platformValue, valueOf } from './leaderboardModel';

/**
 * The rest of a student's row, in a sheet that rises from the bottom of a phone.
 *
 * It is a dialog: it names itself by the student, moves focus into itself, keeps Tab inside, closes
 * on Escape, on the scrim and on its close button, and gives the focus back to the row that
 * opened it. The page behind cannot scroll while it is open. The scrim is a flat colour, with no
 * blur (DESIGN.md), and the sheet casts the float shadow, as a layer above the page should.
 *
 * Props
 *   row            the student
 *   tab            'score' | 'problems'
 *   rank           their rank in the filtered list
 *   departmentRank their rank in their department
 *   own            whether this is the signed-in student
 *   yearName(graduatingYear)
 *   onClose
 */
const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function StudentSheet({ row, tab, rank, departmentRank, own, yearName, onClose }) {
  const titleId = useId();
  const sheet = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const node = sheet.current;
    if (node) node.focus({ preventScroll: true });

    // The page behind stays where it is
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previous;
      if (opener.current && typeof opener.current.focus === 'function') opener.current.focus({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !sheet.current) return;
    const focusable = [...sheet.current.querySelectorAll(FOCUSABLE)];
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const tabInfo = TABS.find((entry) => entry.key === tab);
  const platforms = TAB_PLATFORMS[tab];
  const path = profilePath(row.email);
  const meta = [row.department, row.section ? `Section ${row.section}` : null, yearName(row.graduatingYear) !== '\u2013' ? yearName(row.graduatingYear) : null]
    .filter(Boolean)
    .join(' \u00b7 ');

  return createPortal(
    <div className="lb-layer" onKeyDown={onKeyDown}>
      <div className="lb-scrim" onClick={onClose} aria-hidden="true" />
      <section ref={sheet} className="lb-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="lb-sheet__header">
          <Avatar name={row.name} picture={row.profilePicture} size={56} />
          <div className="lb-sheet__who">
            <h2 className="lb-sheet__name" id={titleId}>
              {row.name || 'Unnamed student'}
              {own && <YouBadge />}
            </h2>
            <p className="lb-sheet__meta">
              {row.rollNumber ? `${String(row.rollNumber).toUpperCase()}` : ''}
              {row.rollNumber && meta ? ' \u00b7 ' : ''}
              {meta}
            </p>
          </div>
          <button type="button" className="lb-icon-button" onClick={onClose} aria-label="Close">
            <XIcon size={20} weight="regular" aria-hidden="true" />
          </button>
        </header>

        <dl className="lb-sheet__figures">
          <div>
            <dt>Rank</dt>
            <dd>{formatRank(rank)}</dd>
          </div>
          <div>
            <dt>{tabInfo.valueLabel}</dt>
            <dd>{formatNumber(valueOf(row, tab))}</dd>
          </div>
          <div>
            <dt>In {row.department || 'department'}</dt>
            <dd>{departmentRank ? formatRank(departmentRank) : '\u2013'}</dd>
          </div>
        </dl>

        <div className="lb-sheet__line">
          <span>Last 7 days</span>
          <span className="lb-sheet__inline">
            <Consistency index={row.consistencyIndex} />
            <ScoreChange change={row.scoreChange} />
          </span>
        </div>

        <h3 className="lb-sheet__heading">{tab === 'problems' ? 'Problems by platform' : 'Score by platform'}</h3>
        <ul className="lb-sheet__platforms">
          {platforms.map((key) => {
            const value = platformValue(row, key, tab);
            return (
              <li key={key} data-empty={value === null ? 'true' : 'false'}>
                <span className="lb-platform">
                  <span className="lb-platform__mark" style={{ backgroundColor: PLATFORMS[key].color }} aria-hidden="true" />
                  {PLATFORMS[key].name}
                </span>
                <span className="lb-num">{value === null ? 'Not linked' : formatNumber(value)}</span>
              </li>
            );
          })}
        </ul>

        {path && (
          <a className="lb-primary" href={path} target="_blank" rel="noopener noreferrer">
            Open profile
            <ArrowSquareOutIcon size={18} weight="regular" aria-hidden="true" />
          </a>
        )}
      </section>
    </div>,
    document.body
  );
}
