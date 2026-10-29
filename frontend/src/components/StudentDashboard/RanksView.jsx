import React, { useState } from 'react';
import { BarChart, TrendChart } from '../custom-components';
import { Block, Content, Grid, Kpi, KpiRow, RangeControl, Trend, ViewEmpty, ViewError, ViewBody, ViewHeader, ViewSkeleton, ViewTop, useKept } from './ExpandedParts';
import { hasScores } from './dashboardModel';
import { DEFAULT_RANGE, platformRankRows, rangeWords, rankMovement } from './expandedModel';
import { formatDay, formatNumber, formatRank, shortDay, signed, topPercent } from './formatters';
import { useScores } from './useDashboardData';

/**
 * Everything about the student's rank, opened from the college rank tile.
 *
 *   figures  the overall rank, how far up the students it puts them, the best rank reached in
 *            the period and the rank inside the department
 *   charts   the rank over time (overall and department, rank 1 at the top), the places gained
 *            in each stretch of the period, and how far up each platform's ranking they are
 *
 * All of it comes from GET /platform-progress/me/scores for the chosen period.
 */
export default function RanksView({ userId, titleId, onClose }) {
  const [days, setDays] = useState(DEFAULT_RANGE);
  const state = useKept(useScores(userId, days));
  const { data, loading, error, reload, refreshing } = state;
  const overall = hasScores(data) ? data.summary.overall : null;
  const ranked = overall && typeof overall.rank === 'number';

  const body = (() => {
    if (error) return <ViewError what="your ranks" error={error} onRetry={reload} />;
    if (loading && !data) return <ViewSkeleton />;
    if (!ranked) {
      return (
        <ViewEmpty title="Not ranked yet">
          {data?.message || 'Your rank appears after the next ranking run.'}
        </ViewEmpty>
      );
    }

    const summary = data.summary;
    const department = summary.departmentRank;
    const hasDepartment = department && typeof department.rank === 'number';
    const movement = rankMovement(data);
    const platforms = platformRankRows(data);
    const period = rangeWords(data.range?.days || days);
    const share = topPercent(overall.percentile);

    return (
      <Content key={data.range?.days} refreshing={refreshing}>
        <KpiRow label="Rank figures">
          <Kpi
            lead
            label="Overall rank"
            value={formatRank(overall.rank)}
            note={
              <>
                of {formatNumber(overall.of)} students
                {typeof overall.rankChange === 'number' && (
                  <>
                    {' '}
                    · <Trend value={overall.rankChange} suffix={Math.abs(overall.rankChange) === 1 ? 'place' : 'places'} />
                  </>
                )}
              </>
            }
          />
          <Kpi
            label="Ahead of"
            value={`${Math.round(overall.percentile)}%`}
            note={share ? `of students · ${share}` : 'of students'}
          />
          <Kpi
            label={`Best rank, ${period}`}
            value={overall.best ? formatRank(overall.best.rank) : '-'}
            note={overall.best ? `on ${formatDay(overall.best.date)}` : null}
          />
          {hasDepartment && (
            <Kpi
              label={`Rank in ${summary.department || 'your department'}`}
              value={formatRank(department.rank)}
              note={department.of ? `of ${formatNumber(department.of)} students` : null}
            />
          )}
        </KpiRow>

        <Grid>
          <Block
            wide
            title="Rank over time"
            note="Rank 1 is at the top, so a line that climbs is a better rank"
          >
            <TrendChart
              title="Rank over time"
              height="fill"
              data={data.series}
              invertY
              yDomain={[1, null]}
              yTicks={5}
              formatY={(value) => `#${formatNumber(Math.round(value))}`}
              getLabel={(point) => formatDay(point.date)}
              formatX={(point) => shortDay(point.date)}
              series={[
                {
                  key: 'overall',
                  label: 'Overall',
                  type: 'line',
                  color: 'var(--ds-series-rose)',
                  getValue: (point) => point.overallRank,
                  format: (value) => formatRank(value),
                },
                ...(hasDepartment
                  ? [
                      {
                        key: 'department',
                        label: summary.department || 'Department',
                        type: 'line',
                        dashed: true,
                        color: 'var(--ds-series-sky)',
                        getValue: (point) => point.departmentRank,
                        format: (value) => formatRank(value),
                      },
                    ]
                  : []),
              ]}
            />
          </Block>

          <Block title="Places gained" note={`How far you moved in each ${data.buckets?.granularity || 'day'}, up or down`}>
            <TrendChart
              title="Places gained"
              height="fill"
              data={movement}
              xTicks={movement.length > 14 ? 6 : movement.length}
              getLabel={(bucket) => bucket.title}
              formatX={(bucket) => bucket.label}
              series={[
                {
                  key: 'moved',
                  label: 'Places gained',
                  type: 'bars',
                  color: 'var(--ds-series-green)',
                  getValue: (bucket) => bucket.moved,
                  format: (value) => `${signed(value)} ${Math.abs(value) === 1 ? 'place' : 'places'}`,
                },
              ]}
            />
          </Block>

          <Block title="Rank on each platform" note="The taller the bar, the further up the students you are. The pill is your rank.">
            {platforms.length === 0 ? (
              <ViewEmpty title="No platform ranks yet">Platform ranks appear after your next profile update.</ViewEmpty>
            ) : (
              <BarChart
                title="Rank on each platform"
                height="fill"
                data={platforms}
                min={0}
                max={100}
                getKey={(row) => row.key}
                getLabel={(row) => row.name}
                getValue={(row) => row.percentile}
                getValueLabel={(row) => formatRank(row.rank)}
                formatValue={(value) => `${value}%`}
                summary={platforms.map((row) => `${row.name}: rank ${row.rank} of ${row.of}`).join(', ')}
                highlight="max"
              />
            )}
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
        title="Rank"
        note={data?.trackingSince ? `Tracked since ${formatDay(data.trackingSince)}` : 'Among all ranked students'}
        onClose={onClose}
      >
        <RangeControl value={days} onChange={setDays} />
      </ViewHeader>
      </ViewTop>
      <ViewBody>{body}</ViewBody>
    </>
  );
}
