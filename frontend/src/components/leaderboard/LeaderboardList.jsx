import React from 'react';
import { Avatar, RankMark, ScoreChange, YouBadge } from './Cells';
import { formatNumber } from './leaderboardFormat';
import { TABS, valueOf } from './leaderboardModel';

/**
 * The leaderboard as a list (below 900px): each student is one row with the rank, the picture and
 * name, the figure of the list and the change in score. A row is a button; pressing it opens a sheet
 * with everything else (see StudentSheet).
 *
 * Props
 *   rows         the students of this page
 *   tab          'score' | 'problems'
 *   ranks        Map: student id -> rank in the filtered list
 *   ownId        the signed-in student's id
 *   yearName(graduatingYear)   "III Year"
 *   onOpen(row)  opens the sheet
 */
export default function LeaderboardList({ rows, tab, ranks, ownId, yearName, onOpen, refreshing }) {
  const unit = TABS.find((entry) => entry.key === tab).unit;

  return (
    <ul className="lb-list" data-refreshing={refreshing ? 'true' : 'false'}>
      {rows.map((row) => {
        const own = row._id === ownId;
        return (
          <li key={row._id} id={own ? 'lb-own' : undefined}>
            <button type="button" className="lb-item" data-own={own ? 'true' : 'false'} onClick={() => onOpen(row)}>
              <RankMark rank={ranks.get(row._id)} />
              <Avatar name={row.name} picture={row.profilePicture} size={36} />
              <span className="lb-item__text">
                <span className="lb-item__name">
                  <span className="lb-item__name-text">{row.name || 'Unnamed student'}</span>
                  {own && <YouBadge />}
                </span>
                <span className="lb-item__meta">
                  {[row.department, yearName(row.graduatingYear) !== '\u2013' ? yearName(row.graduatingYear) : null].filter(Boolean).join(' \u00b7 ') ||
                    '\u2013'}
                </span>
              </span>
              <span className="lb-item__figures">
                <span className="lb-item__value">
                  {formatNumber(valueOf(row, tab))}
                  <span className="lb-sr"> {unit}</span>
                </span>
                <ScoreChange change={row.scoreChange} compact />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
