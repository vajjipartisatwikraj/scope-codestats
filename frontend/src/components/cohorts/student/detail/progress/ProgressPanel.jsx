import React from 'react';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { Avatar, Badge, Button, Card, EmptyState, Notice, SkeletonRows, StatGrid, StatTile, formatNumber, pluralize } from '../../../../ui';
import useCohortLeaderboard from '../hooks/useCohortLeaderboard';
import './progressPanel.css';

const TOP = 10;

/** The rank as a numeral; the first three sit in small tonal circles, never medals */
function Rank({ rank }) {
  return (
    <span className="cdl-rank" data-place={rank <= 3 ? rank : undefined}>
      {rank}
    </span>
  );
}

function Row({ entry, mine }) {
  const { user } = entry;
  return (
    <tr data-selected={mine ? 'true' : undefined}>
      <td className="cdl-rank-cell">
        <Rank rank={entry.rank} />
      </td>
      <td>
        <div className="ui-table__cell-main">
          <Avatar name={user.name} src={user.profilePicture} size={32} />
          <div className="ui-table__cell-text">
            <span className="ui-table__title">
              {user.name}
              {mine ? (
                <>
                  {' '}
                  <Badge tone="info">You</Badge>
                </>
              ) : null}
            </span>
            <span className="ui-table__meta">{[user.department, user.section].filter(Boolean).join(' ') || user.rollNumber || ''}</span>
          </div>
        </div>
      </td>
      <td className="ui-num">{formatNumber(entry.totalScore || 0)}</td>
    </tr>
  );
}

/**
 * The student's standing in the cohort: their rank (the one inverted tile), their score and how many
 * questions they have solved, then the leaderboard of the top ten. A student outside the top ten is
 * shown after them, on its own line, so they always find themselves.
 *
 * The rank comes from the leaderboard when it has loaded, so the tile and the table never disagree;
 * until then the figure the cohort carries is used.
 *
 *   cohortId, userProgress   the cohort and the student's own progress
 *   summary                  { solved, total } for the whole cohort
 *   currentUserId            the signed-in student
 */
export default function ProgressPanel({ cohortId, userProgress, summary, currentUserId }) {
  const { entries, loading, error, reload } = useCohortLeaderboard(cohortId);
  const mine = entries.find((entry) => String(entry.user?._id) === String(currentUserId));
  const rank = mine ? mine.rank : userProgress?.rank || null;
  const score = mine ? mine.totalScore : userProgress?.totalScore || 0;
  const top = entries.slice(0, TOP);
  const outside = mine && mine.rank > TOP ? mine : null;

  return (
    <div className="cdl">
      <StatGrid columns={3} label="Your standing">
        <StatTile tone="spotlight" size="m" label="Your rank" value={rank ? `#${formatNumber(rank)}` : '\u2013'} context={entries.length > 0 ? `of ${pluralize(entries.length, 'student')}` : 'Not ranked yet'} />
        <StatTile size="m" label="Total score" value={score} context="points in this cohort" />
        <StatTile size="m" label="Questions solved" value={summary.solved} context={`of ${formatNumber(summary.total)}`} />
      </StatGrid>

      <Card as="section" title="Leaderboard" description="Students in this cohort, best score first." className="cdl-board">
        {loading ? (
          <SkeletonRows count={5} height={48} />
        ) : error ? (
          <Notice
            tone="danger"
            title="Leaderboard did not load"
            action={
              <Button variant="ghost" size="sm" onClick={reload}>
                Retry
              </Button>
            }
          >
            {error}
          </Notice>
        ) : entries.length === 0 ? (
          <EmptyState compact icon={<TrophyIcon size={28} weight="regular" />} title="No scores yet" text="Solve a question and you will appear here." />
        ) : (
          <div className="ui-table-wrap">
            <table className="ui-table" data-density="compact">
              <caption className="ui-sr">Cohort leaderboard</caption>
              <thead>
                <tr>
                  <th scope="col" className="cdl-rank-cell">
                    Rank
                  </th>
                  <th scope="col">Student</th>
                  <th scope="col" className="ui-num">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody>
                {top.map((entry) => (
                  <Row key={entry.user._id} entry={entry} mine={String(entry.user._id) === String(currentUserId)} />
                ))}
                {outside ? <Row key={`you-${outside.user._id}`} entry={outside} mine /> : null}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
