import React, { useState } from 'react';
import { PieChart, TrendChart } from '../custom-components';
import { Block, Content, Grid, Kpi, KpiRow, RangeControl, Trend, ViewEmpty, ViewError, ViewBody, ViewHeader, ViewSkeleton, ViewTop, useKept } from './ExpandedParts';
import { hasScores } from './dashboardModel';
import { DEFAULT_RANGE, platformColor, platformScoreShares, rangeWords, scoreBuckets } from './expandedModel';
import { formatDay, formatNumber, formatRank, shortDay, signed, topPercent } from './formatters';
import { useScores } from './useDashboardData';

/**
 * Everything about the student's score, opened from the overall score tile.
 *
 *   figures  the total score, the change over the period, the rank it earns and the average a week
 *   charts   the total over time, the points gained in each stretch of the period, where the
 *            score comes from (a donut of the platforms) and each platform's score over time
 *
 * All of it comes from GET /platform-progress/me/scores for the chosen period.
 */
export default function ScoresView({ userId, titleId, onClose }) {
  const [days, setDays] = useState(DEFAULT_RANGE);
  const state = useKept(useScores(userId, days));
  const { data, loading, error, reload, refreshing } = state;
  const ready = hasScores(data);

  const body = (() => {
    if (error) return <ViewError what="your scores" error={error} onRetry={reload} />;
    if (loading && !data) return <ViewSkeleton />;
    if (!ready) {
      return (
        <ViewEmpty title="No score yet">
          {data?.message || 'Your score appears after your first profile update.'}
        </ViewEmpty>
      );
    }

    const summary = data.summary;
    const shares = platformScoreShares(data);
    const buckets = scoreBuckets(data);
    const period = rangeWords(data.range?.days || days);
    const perWeek = typeof summary.scoreChange === 'number' ? (summary.scoreChange / (data.range?.days || days)) * 7 : null;
    const top = shares.reduce((best, row) => (best === null || row.score > best.score ? row : best), null);
    const percent = topPercent(summary.overall?.percentile);

    return (
      <Content key={data.range?.days} refreshing={refreshing}>
        <KpiRow label="Score figures">
          <Kpi
            lead
            label="Total score"
            value={formatNumber(summary.totalScore)}
            unit="pts"
            note={<Trend value={summary.scoreChange} suffix={`in the ${period}`} />}
          />
          <Kpi
            label="Rank this earns"
            value={formatRank(summary.overall?.rank)}
            note={summary.overall?.of ? `of ${formatNumber(summary.overall.of)} students${percent ? ` · ${percent}` : ''}` : null}
          />
          <Kpi
            label="Average a week"
            value={perWeek === null ? '-' : signed(Math.round(perWeek * 10) / 10)}
            unit="pts"
            note={`over the ${period}`}
          />
          {top && <Kpi label="Highest platform" value={top.name} note={`${formatNumber(top.score)} pts`} />}
        </KpiRow>

        <Grid>
          <Block
            title="Total score"
            note={`Your score, day by day over the ${period}`}
          >
            <TrendChart
              title="Total score over time"
              height="fill"
              data={data.series}
              getLabel={(point) => formatDay(point.date)}
              formatX={(point) => shortDay(point.date)}
              series={[
                {
                  key: 'total',
                  label: 'Total score',
                  type: 'area',
                  getValue: (point) => (point.hasData ? point.totalScore : null),
                  format: (value) => `${formatNumber(value)} pts`,
                },
              ]}
            />
          </Block>

          <Block
            title="Points gained"
            note={`Points added in each ${data.buckets?.granularity || 'day'} of the period`}
          >
            <TrendChart
              title="Points gained"
              height="fill"
              data={buckets}
              xTicks={buckets.length > 14 ? 6 : buckets.length}
              getLabel={(bucket) => bucket.title}
              formatX={(bucket) => bucket.label}
              series={[
                {
                  key: 'gain',
                  label: 'Points gained',
                  type: 'bars',
                  getValue: (bucket) => bucket.scoreChange,
                  format: (value) => `${signed(value)} pts`,
                },
              ]}
            />
          </Block>

          <Block natural title="Where your score comes from" note="Each platform's share of your total today">
            <PieChart
              title="Score by platform"
              data={shares}
              getKey={(row) => row.key}
              getLabel={(row) => row.name}
              getValue={(row) => row.score}
              getColor={(row) => platformColor(row.key)}
              getDetail={(row) => (row.change === null ? null : `${signed(row.change)} in the ${period}`)}
              sort="desc"
              size={188}
              totalLabel="points"
            />
          </Block>

          <Block title="Platform scores" note="Switch a platform off in the key to compare the rest">
            <TrendChart
              title="Platform scores over time"
              height="fill"
              data={data.series}
              getLabel={(point) => formatDay(point.date)}
              formatX={(point) => shortDay(point.date)}
              series={shares.map((row) => ({
                key: row.key,
                label: row.name,
                type: 'line',
                color: platformColor(row.key),
                getValue: (point) => (point.hasData ? point.scores?.[row.key] ?? null : null),
                format: (value) => `${formatNumber(value)} pts`,
              }))}
            />
          </Block>
        </Grid>
      </Content>
    );
  })();

  return (
    <>
      <ViewTop>
      <ViewHeader
        titleId={titleId}
        title="Score"
        note={data?.trackingSince ? `Tracked since ${formatDay(data.trackingSince)}` : 'Your total and each platform'}
        onClose={onClose}
      >
        <RangeControl value={days} onChange={setDays} />
      </ViewHeader>
      </ViewTop>
      <ViewBody>{body}</ViewBody>
    </>
  );
}
