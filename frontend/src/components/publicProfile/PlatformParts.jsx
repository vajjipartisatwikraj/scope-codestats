import React from 'react';

/**
 * The small pieces the coding platforms card is built from, in the way the dashboard's problems view
 * is: a row of figures divided by hairlines, and titled blocks that are sections of the card (never
 * cards inside it). Styles are in publicProfile.css (pp-kpi, pp-block).
 */

/** One figure with its name and a line of context. The first, `lead`, is the biggest. */
export function Kpi({ label, value, note, lead = false }) {
  return (
    <div className="pp-kpi" data-lead={lead ? 'true' : 'false'}>
      <dt className="pp-kpi__label">{label}</dt>
      <dd className="pp-kpi__value">{value}</dd>
      {note ? <dd className="pp-kpi__note">{note}</dd> : null}
    </div>
  );
}

export function KpiRow({ label, children }) {
  return (
    <dl className="pp-kpis" aria-label={label}>
      {children}
    </dl>
  );
}

/**
 * A titled block under a hairline, with a line that says what it shows.
 *   wide      takes the whole row
 *   natural   as tall as its content needs (a donut with its key)
 */
export function Block({ title, note, wide = false, natural = false, children }) {
  return (
    <section className="pp-block" data-wide={wide ? 'true' : 'false'}>
      <header className="pp-block__header">
        <h3 className="pp-block__title">{title}</h3>
        {note ? <p className="pp-block__note">{note}</p> : null}
      </header>
      <div className="pp-block__body" data-natural={natural ? 'true' : 'false'}>
        {children}
      </div>
    </section>
  );
}

/** Two columns of blocks; a lone last block takes the whole row instead of leaving a hole */
export function BlockGrid({ children }) {
  const blocks = React.Children.toArray(children).filter(React.isValidElement);
  const cells = blocks.reduce((sum, block) => sum + (block.props.wide ? 2 : 1), 0);
  return (
    <div className="pp-blocks">
      {blocks.map((block, index) => (cells % 2 === 1 && index === blocks.length - 1 && !block.props.wide ? React.cloneElement(block, { wide: true }) : block))}
    </div>
  );
}

/** Label and value rows, separated by hairlines. Rows without a value are left out. */
export function FactList({ facts }) {
  const rows = facts.filter((fact) => fact && fact.value !== null && fact.value !== undefined && fact.value !== '');
  if (rows.length === 0) return null;
  return (
    <dl className="ui-detail__facts">
      {rows.map((fact) => (
        <div className="ui-detail__fact" key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
