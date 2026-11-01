import brand from '../../brand';
import React, { useState } from 'react';
import { BarChart, PieChart, PillTabs, TrendChart } from '../custom-components';
import { ButtonLink, CardNotice } from './Card';
import {
  Block,
  Content,
  Grid,
  Kpi,
  KpiRow,
  RangeControl,
  Trend,
  ViewEmpty,
  ViewError,
  ViewBody,
  ViewHeader,
  ViewSkeleton,
  ViewTop,
  useKept,
} from './ExpandedParts';
import { averageSolved, longestStreak, platformName, platformSolvedRows, topSolvedRow, totalSolved } from './dashboardModel';
import {
  DEFAULT_RANGE,
  NO_HISTORY_COPY,
  bucketDaily,
  cohortDaily,
  difficultySlices,
  historyBuckets,
  platformColor,
  rangeWords,
} from './expandedModel';
import { formatDay, formatNumber, pluralize, shortDay, todayInIndia } from './formatters';
import { usePlatformHistory } from './useDashboardData';

/**
 * Everything about the problems the student has solved, opened from the problems solved card.
 * One tab for all the platforms together and one tab for each platform, so the analytics of one
 * platform never mix with another's.
 *
 *   All platforms  the total, how it splits across the platforms (a donut; click a slice to open
 *                  that platform) and the count on each platform
 *   LeetCode, Codeforces, CodeChef, HackerRank
 *                  the history of that platform for the chosen period: problems solved over
 *                  time, solved in each stretch, the split by difficulty, the rating and the
 *                  contests (each only where the platform has it)
 *   CodeStats      the problems solved in the student's cohorts, from the activity record
 *
 * GitHub has no problems, so it has no tab.
 */

const TABS = [
  { key: 'all', label: 'All platforms' },
  { key: 'leetcode', label: 'LeetCode' },
  { key: 'codeforces', label: 'Codeforces' },
  { key: 'codechef', label: 'CodeChef' },
  { key: 'hackerrank', label: 'HackerRank' },
  { key: 'scopecodestats', label: brand.codeStats.name },
];

const ID_PREFIX = 'sd-problems';

// ---- All platforms ----------------------------------------------------------------------------

function AllPlatformsTab({ profiles, onPick }) {
  const { data, loading, error, reload } = profiles;
  if (error) return <ViewError what="your problems solved" error={error} onRetry={reload} />;
  if (loading && !data) return <ViewSkeleton />;

  const rows = platformSolvedRows(data);
  if (rows.length === 0) {
    return (
      <ViewEmpty
        title="No platforms linked yet"
        action={
          <ButtonLink to="/profile?edit=platforms" tone="secondary">
            Link a platform
          </ButtonLink>
        }
      >
        Link LeetCode, Codeforces or another platform and your problems solved appear here after the next update.
      </ViewEmpty>
    );
  }

  const total = totalSolved(rows);
  const top = topSolvedRow(rows);
  const average = averageSolved(rows);

  return (
    <Content>
      <KpiRow label="Problems solved figures">
        <Kpi lead label="Problems solved" value={formatNumber(total)} note={`on ${pluralize(rows.length, 'platform')}`} />
        <Kpi label="Most solved on" value={top.name} note={`${formatNumber(top.solved)} problems`} />
        <Kpi label="Average a platform" value={formatNumber(Math.round(average))} note="problems" />
      </KpiRow>

      <Grid>
        <Block natural title="Share by platform" note="Click a slice to open that platform">
          <PieChart
            title="Problems solved by platform"
            data={rows}
            getKey={(row) => row.key}
            getLabel={(row) => row.name}
            getValue={(row) => row.solved}
            getColor={(row) => platformColor(row.key)}
            sort="desc"
            size={188}
            totalLabel="problems"
            onItemClick={(row) => onPick(row.key)}
          />
        </Block>

        <Block title="Problems by platform" note="The count on each linked platform">
          <BarChart
            title="Problems solved by platform"
            height="fill"
            data={rows}
            getKey={(row) => row.key}
            getLabel={(row) => row.name}
            getValue={(row) => row.solved}
            getColor={(row) => platformColor(row.key)}
            highlight="none"
            onItemClick={(row) => onPick(row.key)}
          />
        </Block>
      </Grid>
    </Content>
  );
}

// ---- One platform with stored history ------------------------------------------------------------

function PlatformTab({ userId, platform, days }) {
  const state = useKept(usePlatformHistory(userId, platform, days));
  const { data, loading, error, reload, refreshing } = state;
  const name = platformName(platform);

  if (error) return <ViewError what={`your ${name} history`} error={error} onRetry={reload} />;
  if (loading && !data) return <ViewSkeleton />;

  if (!data || data.state !== 'ok') {
    const copy = NO_HISTORY_COPY[data?.state] || data?.message || 'There is no history for this platform yet.';
    return (
      <ViewEmpty
        title={data?.state === 'not_linked' ? 'Not linked' : `No ${name} history yet`}
        action={
          <ButtonLink to="/profile?edit=platforms" tone="secondary">
            Manage platforms
          </ButtonLink>
        }
      >
        {data?.message && data.state !== 'not_linked' ? `${copy} (${data.message})` : copy}
      </ViewEmpty>
    );
  }

  const summary = data.summary;
  const caps = data.capabilities || {};
  const period = rangeWords(data.range?.days || days);
  const buckets = historyBuckets(data);
  const granularity = data.buckets?.granularity || 'day';
  const slices = caps.difficulty ? difficultySlices(data.difficulty) : [];
  const hasSlices = slices.some((slice) => slice.value > 0);
  const color = platformColor(platform);
  const synced = data.lastSyncedAt ? formatDay(String(data.lastSyncedAt).slice(0, 10)) : null;

  if (!summary) {
    return (
      <ViewEmpty title={`No ${name} history yet`}>{NO_HISTORY_COPY.no_history}</ViewEmpty>
    );
  }

  return (
    <Content key={data.range?.days} refreshing={refreshing}>
      {data.warning && (
        <CardNotice
          message={`The last update of ${name} failed${synced ? `, so these numbers are from ${synced}` : ''}.`}
        />
      )}
      <p className="sd-view__caption">
        {data.username ? `@${data.username}` : name}
        {synced ? ` · Synced ${synced}` : ''}
        {data.staleDays > 1 ? ` (${pluralize(data.staleDays, 'day')} ago)` : ''}
      </p>

      <KpiRow label={`${name} figures`}>
        <Kpi
          lead
          label="Problems solved"
          value={formatNumber(summary.problemsSolved)}
          note={<Trend value={summary.problemsGained} suffix={`in the ${period}`} />}
        />
        <Kpi
          label="Active days"
          value={formatNumber(summary.activeDays)}
          note={`of ${pluralize(data.range?.days || days, 'day')}`}
        />
        {caps.rating ? (
          <Kpi
            label="Rating"
            value={summary.rating === null ? '-' : formatNumber(summary.rating)}
            note={
              summary.ratingChange === null && summary.peakRating === null ? null : (
                <>
                  <Trend value={summary.ratingChange} />
                  {summary.peakRating !== null ? ` · peak ${formatNumber(summary.peakRating)}` : ''}
                </>
              )
            }
          />
        ) : (
          <Kpi
            label="Best day"
            value={summary.bestDay ? pluralize(summary.bestDay.count, 'problem') : '-'}
            note={summary.bestDay ? formatDay(summary.bestDay.date) : null}
          />
        )}
        {caps.contests ? (
          <Kpi
            label="Contests"
            value={formatNumber(summary.contests)}
            note={<Trend value={summary.contestsGained} suffix={`in the ${period}`} />}
          />
        ) : (
          <Kpi label="Average a day" value={formatNumber(summary.averagePerDay)} note="problems" />
        )}
      </KpiRow>

      <Grid>
        <Block title="Problems solved" note="Your total on the platform, day by day">
          <TrendChart
            title={`${name} problems solved over time`}
            height="fill"
            data={data.series}
            getLabel={(point) => formatDay(point.date)}
            formatX={(point) => shortDay(point.date)}
            series={[
              {
                key: 'solved',
                label: 'Problems solved',
                type: 'area',
                color,
                getValue: (point) => (point.hasData ? point.problemsSolved : null),
                format: (value) => formatNumber(value),
              },
            ]}
          />
        </Block>

        <Block title={`Solved each ${granularity}`} note="New problems in each stretch of the period">
          <TrendChart
            title={`${name} problems solved in each ${granularity}`}
            height="fill"
            data={buckets}
            xTicks={buckets.length > 14 ? 6 : buckets.length}
            getLabel={(bucket) => bucket.title}
            formatX={(bucket) => bucket.label}
            series={[
              {
                key: 'gain',
                label: 'Solved',
                type: 'bars',
                color,
                getValue: (bucket) => bucket.problemsSolved,
                format: (value) => formatNumber(value),
              },
            ]}
          />
        </Block>

        {hasSlices && (
          <Block natural title="By difficulty" note="How the problems you have solved split">
            <PieChart
              title={`${name} problems by difficulty`}
              data={slices}
              getKey={(slice) => slice.key}
              getLabel={(slice) => slice.label}
              getValue={(slice) => slice.value}
              getColor={(slice) => slice.color}
              size={188}
              totalLabel="problems"
            />
          </Block>
        )}

        {caps.rating && (
          <Block title="Rating" note="Your rating after each update">
            <TrendChart
              title={`${name} rating over time`}
              height="fill"
              data={data.series}
              yPadding={0.18}
              getLabel={(point) => formatDay(point.date)}
              formatX={(point) => shortDay(point.date)}
              series={[
                {
                  key: 'rating',
                  label: 'Rating',
                  type: 'line',
                  color,
                  getValue: (point) => (point.hasData ? point.rating : null),
                  format: (value) => formatNumber(value),
                },
              ]}
            />
          </Block>
        )}

        {/* Contests are charted for CodeChef only; LeetCode and Codeforces keep them as a figure */}
        {caps.contests && platform === 'codechef' && (
          <Block title={`Contests each ${granularity}`} note="Contests you took part in">
            <TrendChart
              title={`${name} contests in each ${granularity}`}
              height="fill"
              data={buckets}
              xTicks={buckets.length > 14 ? 6 : buckets.length}
              getLabel={(bucket) => bucket.title}
              formatX={(bucket) => bucket.label}
              series={[
                {
                  key: 'contests',
                  label: 'Contests',
                  type: 'bars',
                  color,
                  getValue: (bucket) => bucket.contests,
                  format: (value) => formatNumber(value),
                },
              ]}
            />
          </Block>
        )}
      </Grid>
    </Content>
  );
}

// ---- CodeStats (the cohorts) -----------------------------------------------------------------------

function CohortTab({ profiles, heatmap, days }) {
  const profile = profiles.data?.scopecodestats;
  if (heatmap.error) return <ViewError what="your cohort activity" error={heatmap.error} onRetry={heatmap.reload} />;
  if ((heatmap.loading && !heatmap.data) || (profiles.loading && !profiles.data)) return <ViewSkeleton />;

  if (!profile) {
    return (
      <ViewEmpty title="No cohort problems yet">
        The problems you solve in your cohorts appear here after your first one.
      </ViewEmpty>
    );
  }

  const daily = cohortDaily(heatmap.data?.dailyActivity, days, todayInIndia());
  const buckets = bucketDaily(daily, days);
  const best = daily.reduce((top, day) => (day.value > top.value ? day : top), { date: null, value: 0 });
  const activeDays = daily.filter((day) => day.value > 0).length;
  const inPeriod = daily.reduce((sum, day) => sum + day.value, 0);
  const streak = heatmap.data ? longestStreak(heatmap.data.dailyActivity) : null;
  const period = rangeWords(days);
  const granularity = days <= 31 ? 'day' : days <= 120 ? 'week' : 'month';

  let running = 0;
  const cumulative = daily.map((day) => {
    running += day.value;
    return { date: day.date, value: running };
  });

  return (
    <Content key={days}>
      <p className="sd-view__caption">Problems solved in your cohorts</p>
      <KpiRow label={`${brand.codeStats.name} figures`}>
        <Kpi
          lead
          label="Problems solved"
          value={formatNumber(profile.problemsSolved)}
          note={<Trend value={inPeriod} suffix={`in the ${period}`} />}
        />
        <Kpi label="Active days" value={formatNumber(activeDays)} note={`of ${pluralize(days, 'day')}`} />
        <Kpi
          label="Best day"
          value={best.value > 0 ? pluralize(best.value, 'problem') : '-'}
          note={best.date ? formatDay(best.date) : null}
        />
        <Kpi label="Longest streak" value={streak === null ? '-' : pluralize(streak, 'day')} note="in the last 12 months" />
      </KpiRow>

      <Grid>
        <Block title="Cohort problems" note={`Solved so far in the ${period}`}>
          <TrendChart
            title="Cohort problems solved over the period"
            height="fill"
            data={cumulative}
            getLabel={(point) => formatDay(point.date)}
            formatX={(point) => shortDay(point.date)}
            series={[
              {
                key: 'cohort',
                label: 'Problems solved',
                type: 'area',
                color: platformColor('scopecodestats'),
                getValue: (point) => point.value,
                format: (value) => formatNumber(value),
              },
            ]}
          />
        </Block>

        <Block title={`Solved each ${granularity}`} note="New cohort problems in each stretch of the period">
          <TrendChart
            title="Cohort problems solved in each stretch"
            height="fill"
            data={buckets}
            xTicks={buckets.length > 14 ? 6 : buckets.length}
            getLabel={(bucket) => bucket.title}
            formatX={(bucket) => bucket.label}
            series={[
              {
                key: 'gain',
                label: 'Solved',
                type: 'bars',
                color: platformColor('scopecodestats'),
                getValue: (bucket) => bucket.value,
                format: (value) => formatNumber(value),
              },
            ]}
          />
        </Block>
      </Grid>
    </Content>
  );
}

// ---- The view ---------------------------------------------------------------------------------------

export default function ProblemsView({ userId, titleId, onClose, profiles, heatmap }) {
  const [tab, setTab] = useState('all');
  const [days, setDays] = useState(DEFAULT_RANGE);

  return (
    <>
      <ViewTop>
        <ViewHeader titleId={titleId} title="Problems solved" note="By platform, tab by tab" onClose={onClose}>
          {tab !== 'all' && <RangeControl value={days} onChange={setDays} />}
        </ViewHeader>

        <div className="sd-view__tabs">
          <PillTabs idPrefix={ID_PREFIX} label="Platforms" items={TABS} value={tab} onChange={setTab} />
        </div>
      </ViewTop>

      <ViewBody>
        <div
          className="sd-view__tabpanel"
          role="tabpanel"
          id={`${ID_PREFIX}-panel-${tab}`}
          aria-labelledby={`${ID_PREFIX}-tab-${tab}`}
          key={tab}
        >
          {tab === 'all' && <AllPlatformsTab profiles={profiles} onPick={setTab} />}
          {tab === 'scopecodestats' && <CohortTab profiles={profiles} heatmap={heatmap} days={days} />}
          {tab !== 'all' && tab !== 'scopecodestats' && (
            <PlatformTab userId={userId} platform={tab} days={days} />
          )}
        </div>
      </ViewBody>
    </>
  );
}
