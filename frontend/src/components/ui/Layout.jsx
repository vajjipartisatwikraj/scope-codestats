import React from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { IconButton } from './Button';
import { SelectField } from './Field';
import { formatNumber } from './format';

/**
 * Page: the frame of a page. It leaves the same side padding and uses the same 1440px limit as the
 * footer and the leaderboard, so every page lines up with the footer under it.
 *
 *   narrow     limit the width to 880px (centred) for reading pages and forms
 *   children   the page
 */
export function Page({ children, className, narrow = false }) {
  return (
    <div className={className ? `ui-page ${className}` : 'ui-page'} data-narrow={narrow ? 'true' : undefined}>
      {children}
    </div>
  );
}

/**
 * PageHeader: the single h1 of the page, with optional context under it and the actions at the
 * right (the primary action last).
 *
 *   title         the h1
 *   count         optional number shown beside the title ("12 courses")
 *   description   one muted line
 *   actions       a node: the buttons
 *   size          'display' (students) | 'headline' (staff, compact; the default)
 */
export function PageHeader({ title, count, description, actions, size = 'headline' }) {
  return (
    <header className="ui-page-header" data-size={size}>
      <div className="ui-page-header__text">
        <h1 className="ui-page-header__title">
          {title}
          {count !== undefined && count !== null ? <span className="ui-page-header__count">{count}</span> : null}
        </h1>
        {description ? <p className="ui-page-header__description">{description}</p> : null}
      </div>
      {actions ? <div className="ui-page-header__actions">{actions}</div> : null}
    </header>
  );
}

/**
 * Card (DESIGN.md, Cards): a surface with 24px corners, no border and no shadow.
 *
 *   title, description   an optional header row
 *   actions              the header's action slot (right)
 *   flush                no padding (for a table that runs to the edges)
 */
export function Card({ title, description, actions, flush = false, className, children, as: Component = 'section', ...rest }) {
  return (
    <Component className={className ? `ui-card ${className}` : 'ui-card'} data-flush={flush ? 'true' : 'false'} {...rest}>
      {title || actions ? (
        <header className="ui-card__header">
          <div className="ui-card__heading">
            {title ? <h2 className="ui-card__title">{title}</h2> : null}
            {description ? <p className="ui-card__description">{description}</p> : null}
          </div>
          {actions ? <div className="ui-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      {children}
    </Component>
  );
}

/**
 * Pagination: "Showing 1 to 25 of 480", the previous and next buttons with page numbers, and how
 * many rows to show. Pages are counted from 1.
 *
 *   page, pageSize, total   where we are
 *   onPage(page)            another page was chosen
 *   onPageSize(size)        another size was chosen (omit to hide the size select)
 *   sizes                   the sizes to offer
 *
 * Below 600px only the previous and next buttons are shown, with "Page 2 of 9" between them; the
 * page numbers return from 600px.
 */
export function Pagination({ page, pageSize, total, onPage, onPageSize, sizes = [10, 25, 50] }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const from = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(total, current * pageSize);

  // Up to five page numbers around the current page
  const first = Math.max(1, Math.min(current - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, index) => first + index);

  return (
    <nav className="ui-pager" aria-label="Pages">
      <p className="ui-pager__summary">{total === 0 ? 'Nothing to show' : `Showing ${formatNumber(from)} to ${formatNumber(to)} of ${formatNumber(total)}`}</p>

      <div className="ui-pager__pages">
        <IconButton label="Previous page" size="sm" onClick={() => onPage(current - 1)} disabled={current <= 1}>
          <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
        </IconButton>
        <span className="ui-pager__compact" aria-live="polite">
          Page {current} of {pages}
        </span>
        {numbers.map((number) => (
          <button
            key={number}
            type="button"
            className="ui-pager__page"
            data-current={number === current ? 'true' : 'false'}
            aria-current={number === current ? 'page' : undefined}
            aria-label={`Page ${number}`}
            onClick={() => onPage(number)}
          >
            {number}
          </button>
        ))}
        <IconButton label="Next page" size="sm" onClick={() => onPage(current + 1)} disabled={current >= pages}>
          <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
        </IconButton>
      </div>

      {onPageSize ? (
        <SelectField
          variant="pill"
          aria-label="Rows per page"
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
          options={sizes.map((size) => ({ value: size, label: `${size} per page` }))}
        />
      ) : null}
    </nav>
  );
}

/**
 * BulkBar: the floating spotlight bar that appears when rows are selected (design/screens.md
 * section 16). It sits at the bottom of the window, above the page.
 *
 *   count      how many rows are selected; the bar shows only when it is above 0
 *   children   the actions (Buttons)
 *   onClear    clears the selection
 */
export function BulkBar({ count, onClear, children }) {
  if (!count) return null;
  return (
    <div className="ui-bulkbar" role="region" aria-label="Selected rows">
      <p className="ui-bulkbar__count" aria-live="polite">
        {formatNumber(count)} selected
      </p>
      <div className="ui-bulkbar__actions">{children}</div>
      <button type="button" className="ui-bulkbar__clear" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

/**
 * Toolbar: the filter row above a table or a grid, as a component (it renders the `.ui-toolbar`
 * markup, so existing hand-written toolbars look the same). The search grows, the filters follow,
 * and the end actions sit at the right (they wrap under the filters on a narrow screen).
 *
 *   search     a node, usually a SearchField (it is given the growing slot, 420px at most)
 *   children   the filters: select pills, Chips, a "Clear filters" ghost Button
 *   end        a node at the right: a view toggle, an Export button
 *   label      names the row for assistive technology; it becomes role="search" when given
 *   className  added to the row
 */
export function Toolbar({ search, end, label, className, children }) {
  return (
    <div className={className ? `ui-toolbar ${className}` : 'ui-toolbar'} role={label ? 'search' : undefined} aria-label={label}>
      {search ? <div className="ui-toolbar__grow">{search}</div> : null}
      {children}
      {end ? <div className="ui-toolbar__end">{end}</div> : null}
    </div>
  );
}
