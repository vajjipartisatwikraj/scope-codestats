import React from 'react';
import { Button, PillTabs, SelectField } from '../../ui';
import { PERIODS } from '../model/performanceModel';

/**
 * The filters of the three student performance screens: department, graduating year, section, and the
 * period the changes are measured over. They are pill dropdowns on one row that wraps on a narrow
 * screen (the dropdowns then share a line and the period takes the next); "Clear filters" appears
 * when a dropdown is set. The lists come from /filters and show how many students each value has.
 *
 *   options    { departments, graduatingYears, sections } or null while they load
 *   value      { department, graduatingYear, section, days }
 *   onChange(patch), onReset()
 *   filtering  a dropdown is set
 */
export default function AnalyticsFilters({ options, value, onChange, onReset, filtering }) {
  const ready = Boolean(options);
  const entries = (list, label) => (list || []).map((item) => ({ value: String(item.value), label: `${item.label || item.value} (${item.count})` }));

  return (
    <div className="ad-filters" role="group" aria-label="Filter the students">
      <div className="ad-filters__selects">
        <SelectField
          variant="pill"
          aria-label="Department"
          value={value.department}
          disabled={!ready}
          onChange={(event) => onChange({ department: event.target.value })}
          options={[{ value: '', label: 'All departments' }, ...entries(options?.departments)]}
        />
        <SelectField
          variant="pill"
          aria-label="Graduating year"
          value={value.graduatingYear}
          disabled={!ready}
          onChange={(event) => onChange({ graduatingYear: event.target.value })}
          options={[{ value: '', label: 'All years' }, ...entries(options?.graduatingYears)]}
        />
        <SelectField
          variant="pill"
          aria-label="Section"
          value={value.section}
          disabled={!ready}
          onChange={(event) => onChange({ section: event.target.value })}
          options={[{ value: '', label: 'All sections' }, ...entries(options?.sections)]}
        />
        {filtering ? (
          <Button variant="ghost" size="sm" onClick={onReset}>
            Clear filters
          </Button>
        ) : null}
      </div>
      <div className="ad-filters__period">
        <span className="ad-filters__label" id="ad-period-label">
          Changes over
        </span>
        <PillTabs
          role="radiogroup"
          size="sm"
          label="Period the changes are measured over"
          items={PERIODS.map((period) => ({ key: period.key, label: period.label }))}
          value={String(value.days)}
          onChange={(key) => onChange({ days: Number(key) })}
        />
      </div>
    </div>
  );
}
