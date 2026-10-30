import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react/dist/csr/ArrowsOutSimple';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { ChartBarIcon } from '@phosphor-icons/react/dist/csr/ChartBar';
import { BarChart } from '../custom-components';
import useMediaQuery from '../../hooks/useMediaQuery';
import Card, { ButtonLink, CardEmpty, CardHeader, CardNotice, Skeleton, failureMessage } from './Card';
import { averageSolved, platformSolvedRows, topSolvedRow, totalSolved } from './dashboardModel';
import { formatNumber } from './formatters';

/**
 * The number of problems solved on every linked platform as a bar, with the average as a
 * reference line. GitHub is left out, because it has no problems.
 *
 * The numbers are the problemsSolved of each platform profile (GET /users/me). The platforms
 * count differently (CodeStats counts the problems of the student's cohorts), so the bars show
 * the real counts and are scaled to the biggest one. Nothing is normalised or invented.
 *
 * Pressing the card (or its expand button) opens the problems view with a tab for each platform.
 *
 * Layout: the total and the top platform stand to the left of the chart, which fills the
 * height the card leaves. Under each bar is only the name of the platform.
 */
export default function PlatformSolvedCard({ state, onOpen }) {
  const { data, loading, error, reload } = state;
  const narrow = useMediaQuery('(max-width: 599.95px)');

  const rows = platformSolvedRows(data);
  const average = averageSolved(rows);
  const top = topSolvedRow(rows);
  const total = totalSolved(rows);

  let body;
  if (loading) {
    body = <Skeleton height="fill" label="Loading your problems solved" />;
  } else if (error) {
    body = <CardNotice message={failureMessage('your problems solved', error)} onRetry={reload} />;
  } else if (rows.length === 0) {
    body = (
      <CardEmpty
        title="No platforms linked yet"
        action={
          <ButtonLink to="/profile?edit=platforms" tone="secondary">
            Link a platform
          </ButtonLink>
        }
      >
        Link LeetCode, Codeforces or another platform and your problems solved appear here after the next update.
      </CardEmpty>
    );
  } else {
    body = (
      <div className="sd-platforms">
        <dl className="sd-stats">
          <div>
            <dt>Total solved</dt>
            <dd>{formatNumber(total)}</dd>
          </div>
          <div>
            <dt>Top platform</dt>
            <dd className="sd-stats__name">{top.name}</dd>
          </div>
        </dl>

        <div className="sd-fill">
          <BarChart
            title="Problems solved by platform"
            summary={`${formatNumber(total)} problems in total, an average of ${formatNumber(Math.round(average))} per platform. Most: ${top.name}, ${formatNumber(top.solved)}.`}
            data={rows}
            getKey={(row) => row.key}
            getLabel={(row) => row.name}
            getValue={(row) => row.solved}
            highlight="max"
            height="fill"
            referenceLine={
              rows.length > 1
                ? {
                    value: average,
                    label: `Average ${formatNumber(Math.round(average))}`,
                    gutter: narrow ? 0 : 104,
                    color: 'var(--ds-subtle)',
                    tagColor: 'var(--ds-high)',
                    tagTextColor: 'var(--ds-text)',
                  }
                : undefined
            }
          />
        </div>
      </div>
    );
  }

  return (
    <Card className="sd-card--platforms" aria-labelledby="sd-platforms-title" onOpen={onOpen} openButton={false}>
      <CardHeader
        id="sd-platforms-title"
        icon={<ChartBarIcon size={20} weight="regular" />}
        title="Problems solved"
        subtitle="Problems solved on each linked platform"
        action={
          <div className="sd-card__tools">
            {onOpen && (
              <button
                type="button"
                className="sd-circle sd-card__expand"
                aria-label="Open problems solved analytics"
                title="Open analytics"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(event.currentTarget.closest('.sd-card'));
                }}
              >
                <ArrowsOutSimpleIcon size={16} aria-hidden="true" />
              </button>
            )}
            <Link
              to="/profile?edit=platforms"
              className="sd-circle"
              aria-label="Manage platforms"
              title="Manage platforms and see full progress"
            >
              <ArrowUpRightIcon size={16} aria-hidden="true" />
            </Link>
          </div>
        }
      />
      {body}
    </Card>
  );
}
