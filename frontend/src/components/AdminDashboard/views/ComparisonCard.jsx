import React, { useState } from 'react';
import { BarChart } from '../../custom-components';
import { Card, EmptyState, SelectField } from '../../ui';
import { formatNumber, signed } from '../model/format';
import { COMPARISON_METRICS, GROUP_BY } from '../model/performanceModel';

/**
 * Departments, graduating years or sections side by side: one measure at a time as bars (the group
 * of the current filter is the highlighted bar), and all the measures in a table under them. The
 * groups are not limited by their own filter, so the selected department is shown among the others.
 *
 *   comparison        { groupBy, items[] } from the overview
 *   groupBy           what the groups are: 'department' | 'graduatingYear' | 'section'
 *   onGroupByChange   the group-by dropdown
 *   selected          the value of the current filter for this grouping, to highlight
 */
export default function ComparisonCard({ comparison, groupBy, onGroupByChange, selected }) {
  const [metricKey, setMetricKey] = useState('avgScore');
  const metric = COMPARISON_METRICS.find((entry) => entry.key === metricKey);
  const format = (value) => (metric.signed ? signed(value) : `${formatNumber(value)}${metric.suffix || ''}`);
  const items = comparison.items;
  const groupLabel = GROUP_BY.find((entry) => entry.key === comparison.groupBy)?.label || 'Group';

  return (
    <Card
      title="Comparison"
      description={`Students grouped by ${groupLabel.toLowerCase()}.`}
      className="ad-card"
      actions={
        <div className="ad-card__tools">
          <SelectField variant="pill" aria-label="Measure" value={metricKey} onChange={(event) => setMetricKey(event.target.value)} options={COMPARISON_METRICS.map((entry) => ({ value: entry.key, label: entry.label }))} />
          <SelectField variant="pill" aria-label="Group by" value={groupBy} onChange={(event) => onGroupByChange(event.target.value)} options={GROUP_BY.map((entry) => ({ value: entry.key, label: `By ${entry.label.toLowerCase()}` }))} />
        </div>
      }
    >
      {items.length === 0 ? (
        <EmptyState compact title="No students to compare" text="Change the filters to see a group." />
      ) : (
        <>
          <BarChart
            data={items}
            getKey={(item) => item.key}
            getLabel={(item) => item.label}
            getValue={(item) => item[metricKey]}
            getValueLabel={(item) => format(item[metricKey])}
            getTooltip={(item) => `${item.label}: ${metric.label.toLowerCase()} ${format(item[metricKey])}`}
            highlight={(item) => (selected ? String(selected) === item.key : false)}
            height={260}
            gap={8}
            minColumnWidth={56}
            title={`${metric.label} by ${groupLabel.toLowerCase()}`}
            summary={items.map((item) => `${item.label}: ${format(item[metricKey])}`).join(', ')}
            emptyMessage="No students to compare"
          />

          <div className="ui-table-wrap ad-wrap">
            <table className="ui-band-table ad-table">
              <caption className="ui-sr">Comparison of the groups on every measure</caption>
              <thead>
                <tr>
                  <th scope="col">{groupLabel}</th>
                  <th scope="col" className="ui-num">Students</th>
                  <th scope="col" className="ui-num">Linked</th>
                  <th scope="col" className="ui-num">Avg score</th>
                  <th scope="col" className="ui-num">Avg problems</th>
                  <th scope="col" className="ui-num">Avg contests</th>
                  <th scope="col" className="ui-num">Avg commits</th>
                  <th scope="col" className="ui-num">Avg score change</th>
                  <th scope="col" className="ui-num">Active</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.key}>
                    <td className="ad-strong">{item.label}</td>
                    <td className="ui-num">{formatNumber(item.students)}</td>
                    <td className="ui-num">{item.linkedRate}%</td>
                    <td className="ui-num">{formatNumber(item.avgScore)}</td>
                    <td className="ui-num">{formatNumber(item.avgProblems)}</td>
                    <td className="ui-num">{formatNumber(item.avgContests)}</td>
                    <td className="ui-num">{formatNumber(item.avgCommits)}</td>
                    <td className="ui-num">{signed(item.avgScoreGain)}</td>
                    <td className="ui-num">{item.activeRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="ad-note">Averages are per student, including students with no platform linked. "Active" is the share who made progress in the period.</p>
        </>
      )}
    </Card>
  );
}
