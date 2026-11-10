import React, { useState } from 'react';
import { BarChart } from '../../custom-components';
import { Card, EmptyState, SelectField } from '../../ui';
import { formatNumber, signed } from '../model/format';
import { LEADER_LISTS } from '../model/performanceModel';

/** How many students fall in each band of a measure */
function Histogram({ title, description, bins, color }) {
  const total = bins.reduce((sum, bin) => sum + bin.count, 0);
  return (
    <Card title={title} description={description} className="ad-card">
      <BarChart
        data={bins}
        getKey={(bin) => bin.label}
        getLabel={(bin) => bin.label}
        getValue={(bin) => bin.count}
        getTooltip={(bin) => `${bin.label}: ${formatNumber(bin.count)} students`}
        colors={{ bar: color, barHighlight: color }}
        height={220}
        gap={6}
        minColumnWidth={44}
        highlight="none"
        title={title}
        summary={total ? `${formatNumber(total)} students in ${bins.length} bands. The most are in ${bins.reduce((best, bin) => (bin.count > best.count ? bin : best), bins[0]).label}.` : 'No students to show.'}
        emptyMessage="No students to show"
      />
    </Card>
  );
}

/**
 * How scores and problem counts are spread over the selected students (two histograms), and the
 * leaders: the top ten by one measure at a time, in a list with a rank, the student and the figure.
 */
export default function InsightsCards({ distributions, leaders }) {
  const [listKey, setListKey] = useState('score');
  const list = LEADER_LISTS.find((entry) => entry.key === listKey);
  const people = leaders[listKey] || [];

  return (
    <div className="ad-grid">
      <Histogram title="Score distribution" description="Students by total score." bins={distributions.score} color="var(--ds-series-blue)" />
      <Histogram title="Problems solved distribution" description="Students by total problems solved." bins={distributions.problems} color="var(--ds-series-green)" />

      <Card
        title="Leaders"
        description="The top ten of the selected students."
        className="ad-card ad-card--wide"
        actions={<SelectField variant="pill" aria-label="Show leaders by" value={listKey} onChange={(event) => setListKey(event.target.value)} options={LEADER_LISTS.map((entry) => ({ value: entry.key, label: entry.label }))} />}
      >
        {people.length === 0 ? (
          <EmptyState compact title="Nobody yet" text="Leaders appear once students have a figure for this measure." />
        ) : (
          <ol className="ad-people" aria-label={list.label}>
            {people.map((person, index) => (
              <li key={person.id} className="ad-person">
                <span className="ad-person__rank" aria-hidden="true">
                  {index + 1}
                </span>
                <span className="ad-person__text">
                  <span className="ad-person__name">{person.name}</span>
                  <span className="ad-person__meta">{[person.rollNumber, person.department].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="ad-person__value">{list.signed ? signed(person.value) : formatNumber(person.value)}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
