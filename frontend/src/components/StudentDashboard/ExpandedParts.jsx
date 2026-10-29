import React, { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useRef } from 'react';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { MinusIcon } from '@phosphor-icons/react/dist/csr/Minus';
import { PillTabs } from '../custom-components';
import { useElementSize } from '../custom-components/useElementWidth';
import { CardEmpty, CardNotice, failureMessage } from './Card';
import { RANGES } from './expandedModel';
import { OPEN_MS } from './useExpand';
import { signed } from './formatters';

/**
 * The pieces every expanded view (scores, ranks, problems solved) is made of: the header with
 * the way back, the figures row, a chart block, the period control and the loading, error and
 * empty states. Styles are in ExpandedPanel.css.
 */

/** The phase of the panel (opening, open, closing), so what mounts while it opens can wait for it */
export const PhaseContext = createContext('open');

/**
 * The content of a view. Charts inside it draw when they mount; if it mounts while the panel is
 * still opening, they wait until the panel is mostly open. The wait is fixed for the lifetime of
 * this element, because changing an animation delay while it runs would make the animation jump.
 */
export function Content({ children, refreshing = false }) {
  const phase = useContext(PhaseContext);
  const wait = useRef(null);
  if (wait.current === null) wait.current = phase === 'opening' ? Math.round(OPEN_MS * 0.7) : 0;
  return (
    <div
      className="sd-view__content"
      data-refreshing={refreshing ? 'true' : 'false'}
      style={wait.current ? { '--cc-wait': wait.current + 'ms' } : undefined}
    >
      {children}
    </div>
  );
}
/** Keeps the last answer on screen while the next one loads, so changing the period never blanks the view */
export function useKept(state) {
  const kept = useRef(null);
  if (state.data) kept.current = state.data;
  const data = state.data || (state.error ? null : kept.current);
  return { ...state, data, refreshing: state.loading && Boolean(kept.current) };
}

/**
 * The header of a view: the way back, the title with a line under it, and room for controls.
 *
 * The way back is a round button with an arrow, black on the plain surface (ExpandedPanel.css).
 */
export function ViewHeader({ titleId, title, note, onClose, children }) {
  const heading = useRef(null);

  // Focus arrives on the title, where a screen reader reads where it is. A button would show a
  // focus ring to someone who opened the panel with a pointer.
  useEffect(() => {
    const node = heading.current;
    if (node) window.requestAnimationFrame(() => node.focus({ preventScroll: true }));
  }, []);

  return (
    <header className="sd-view__header">
      <button type="button" className="sd-view__back" onClick={onClose} aria-label="Back to the dashboard">
        <ArrowLeftIcon size={20} weight="regular" aria-hidden="true" />
      </button>
      <div className="sd-view__heading">
        <h2 className="sd-view__title" id={titleId} ref={heading} tabIndex={-1}>
          {title}
        </h2>
        {note ? <p className="sd-view__note">{note}</p> : null}
      </div>
      {children ? <div className="sd-view__controls">{children}</div> : null}
    </header>
  );
}
/** The period control: 30D, 90D, 6M, 1Y */
export function RangeControl({ value, onChange }) {
  return (
    <PillTabs
      role="radiogroup"
      size="sm"
      label="Period"
      value={value}
      onChange={onChange}
      items={RANGES.map((range) => ({ key: range.key, label: range.label }))}
    />
  );
}

/**
 * A change with its direction in an arrow AND a sign, never colour alone.
 * `good` says which direction is good news ('up' for scores, 'up' for places gained).
 */
export function Trend({ value, suffix, className }) {
  if (value === null || value === undefined) return null;
  const direction = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return (
    <span className={className ? `sd-trend ${className}` : 'sd-trend'} data-trend={direction}>
      {direction === 'up' && <ArrowUpIcon size={14} weight="bold" aria-hidden="true" />}
      {direction === 'down' && <ArrowDownIcon size={14} weight="bold" aria-hidden="true" />}
      {direction === 'flat' && <MinusIcon size={14} weight="bold" aria-hidden="true" />}
      <span>
        {signed(value)}
        {suffix ? ` ${suffix}` : ''}
      </span>
    </span>
  );
}

/** One figure with its label and a line of context. The first of a row is the biggest. */
export function Kpi({ label, value, unit, note, lead = false }) {
  return (
    <div className="sd-kpi" data-lead={lead ? 'true' : 'false'}>
      <dt className="sd-kpi__label">{label}</dt>
      <dd className="sd-kpi__value">
        {value}
        {unit ? <span className="sd-kpi__unit">{unit}</span> : null}
      </dd>
      {note ? <dd className="sd-kpi__note">{note}</dd> : null}
    </div>
  );
}

export function KpiRow({ children, label }) {
  return (
    <dl className="sd-kpis" aria-label={label}>
      {children}
    </dl>
  );
}

/**
 * A chart with its title and a line that says what it shows. Not a card: a section of the panel.
 * 
atural is for a chart that does not stretch to the height it is given (a donut with its key):
 * the block is as tall as the chart needs, never shorter than the other charts, so nothing can
 * spill into the block below.
 */
export function Block({ title, note, children, wide = false, natural = false, className }) {
  return (
    <section className={['sd-block', className].filter(Boolean).join(' ')} data-wide={wide ? 'true' : 'false'}>
      <header className="sd-block__header">
        <h3 className="sd-block__title">{title}</h3>
        {note ? <p className="sd-block__note">{note}</p> : null}
      </header>
      <div className="sd-block__chart" data-natural={natural ? 'true' : 'false'}>
        {children}
      </div>
    </section>
  );
}

/** The size of the scrolling body of the view, so the charts can be sized to fill it */
const BodyContext = createContext({ width: 0, height: 0 });

/**
 * The part of a view under the header. It scrolls inside the panel on the fixed composition (and
 * the page scrolls on a stack), and it tells the charts how big it is.
 */
export function ViewBody({ children }) {
  const [ref, size] = useElementSize();
  return (
    <div className="sd-view__body" ref={ref}>
      <BodyContext.Provider value={size}>{children}</BodyContext.Provider>
    </div>
  );
}

/** The header (and the tabs under it) of a view. On a phone it stays at the top while the page scrolls. */
export function ViewTop({ children }) {
  return <div className="sd-view__top">{children}</div>;
}

// What a chart block spends besides its chart (border, padding, title and note, gaps), the height
// of the row of figures above the grid, and the gap between rows
const BLOCK_CHROME = 78;
const KPI_BAND = 132;
const ROW_GAP = 24;
const MIN_CHART = 200;
const MAX_CHART = 380;

/**
 * Two columns of blocks (one column when the body is narrow). When the blocks do not fill the
 * last row, the last one takes the whole row instead of leaving a hole (a block marked wide
 * counts for two).
 *
 * The charts are given a height that makes the rows fill the body, so a view with two charts is
 * not a small thing in a big empty panel. A view with more rows than fit scrolls, with charts no
 * shorter than MIN_CHART.
 */
export function Grid({ children }) {
  const { width, height } = useContext(BodyContext);
  const blocks = Children.toArray(children).filter(isValidElement);
  const cells = blocks.reduce((sum, block) => sum + (block.props.wide ? 2 : 1), 0);
  const last = blocks.length - 1;

  const single = width > 0 && width < 700;
  const rows = single ? blocks.length : Math.ceil(cells / 2);
  const fit = rows > 0 ? Math.floor((height - KPI_BAND - (rows - 1) * ROW_GAP) / rows - BLOCK_CHROME) : MIN_CHART;
  const chartHeight = single || !height ? 232 : Math.min(MAX_CHART, Math.max(MIN_CHART, fit));

  return (
    <div className="sd-grid" style={{ '--sd-chart-h': chartHeight + 'px' }}>
      {blocks.map((block, index) =>
        cells % 2 === 1 && index === last && !block.props.wide ? cloneElement(block, { wide: true }) : block
      )}
    </div>
  );
}
/** What the body shows while there is nothing to draw yet */
export function ViewSkeleton() {
  return (
    <div className="sd-view__skeleton" role="status" aria-label="Loading">
      <div className="sd-skeleton sd-view__skeleton-kpis" />
      <div className="sd-view__skeleton-grid">
        <div className="sd-skeleton" />
        <div className="sd-skeleton" />
      </div>
    </div>
  );
}

export function ViewError({ what, error, onRetry }) {
  return <CardNotice message={failureMessage(what, error)} onRetry={onRetry} />;
}

export function ViewEmpty({ title, children, action }) {
  return (
    <div className="sd-view__empty">
      <CardEmpty title={title} action={action}>
        {children}
      </CardEmpty>
    </div>
  );
}
