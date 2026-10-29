import React from 'react';
import { formatNumber, pluralize } from '../ui';
import { BarChart, PieChart } from '../custom-components';
import { Block, BlockGrid, Kpi, KpiRow } from './PlatformParts';
import { METRICS, metricRows } from './profileModel';

/**
 * The "All platforms" tab, laid out like the dashboard's problems view: the total, the platform with
 * the most and the average; then how the problems split across the platforms (a donut, select a slice
 * to open that platform) and the count on each one (bars).
 *
 *   platforms   the platforms shown in the card (GitHub has its own card)
 *   onPick(key) opens one platform's tab
 */
export default function PlatformsOverview({ platforms, onPick }) {
  const problems = metricRows(platforms, METRICS.find((metric) => metric.key === 'problems'));

  const total = problems.reduce((sum, row) => sum + row.value, 0);
  const top = problems.reduce((best, row) => (!best || row.value > best.value ? row : best), null);
  const average = problems.length ? total / problems.length : 0;
  const pick = (row) => onPick(row.key);

  return (
    <div className="pp-plat__content">
      <KpiRow label="Problems solved figures">
        <Kpi lead label="Problems solved" value={formatNumber(total)} note={`on ${pluralize(problems.length, 'platform')}`} />
        <Kpi label="Most solved on" value={top ? top.name : '\u2013'} note={top ? `${formatNumber(top.value)} problems` : null} />
        <Kpi label="Average a platform" value={formatNumber(Math.round(average))} note="problems" />
      </KpiRow>

      <BlockGrid>
        <Block natural title="Share by platform" note="Select a slice to open that platform">
          <PieChart
            title="Problems solved by platform"
            data={problems}
            getKey={(row) => row.key}
            getLabel={(row) => row.name}
            getValue={(row) => row.value}
            getColor={(row) => row.color}
            sort="desc"
            size={188}
            totalLabel="problems"
            emptyMessage="No problems recorded yet"
            onItemClick={pick}
          />
        </Block>

        <Block title="Problems by platform" note="The count on each platform">
          <BarChart
            title="Problems solved by platform"
            data={problems}
            getKey={(row) => row.key}
            getLabel={(row) => row.name}
            getValue={(row) => row.value}
            getColor={(row) => row.color}
            highlight="none"
            height={236}
            emptyMessage="No problems recorded yet"
            onItemClick={pick}
          />
        </Block>

      </BlockGrid>
    </div>
  );
}
