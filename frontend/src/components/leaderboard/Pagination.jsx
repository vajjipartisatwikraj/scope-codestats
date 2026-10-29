import React from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { PillSelect } from './Filters';
import { formatNumber } from './leaderboardFormat';
import { PAGE_SIZES } from './leaderboardModel';

/**
 * The footer under the list: "Showing 1 to 25 of 480", the pages, and how many to show.
 * On a phone the page numbers give way to "Page 2 of 20" between the two arrows.
 *
 * Props
 *   page (1-based), pageSize, total, onPage(page), onPageSize(size), compact
 */

/** The page numbers to show: the first, the last, and a window around the current one, with gaps as null */
function pageWindow(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const wanted = new Set([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((value) => wanted.add(value));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((value) => wanted.add(value));
  const sorted = [...wanted].filter((value) => value >= 1 && value <= pages).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((value, index) => {
    if (index > 0 && value - sorted[index - 1] > 1) out.push(null);
    out.push(value);
  });
  return out;
}

export default function Pagination({ page, pageSize, total, onPage, onPageSize, compact }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="lb-pager" aria-label="Pages of the leaderboard">
      <p className="lb-pager__range" aria-live="polite">
        {total === 0 ? 'No students' : `Showing ${formatNumber(from)} to ${formatNumber(to)} of ${formatNumber(total)}`}
      </p>

      <div className="lb-pager__pages">
        <button type="button" className="lb-icon-button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
        </button>

        {compact ? (
          <span className="lb-pager__current">
            Page {formatNumber(page)} of {formatNumber(pages)}
          </span>
        ) : (
          pageWindow(page, pages).map((value, index) =>
            value === null ? (
              <span key={`gap-${index}`} className="lb-pager__gap" aria-hidden="true">
                {'\u2026'}
              </span>
            ) : (
              <button
                key={value}
                type="button"
                className="lb-page"
                data-current={value === page ? 'true' : 'false'}
                aria-current={value === page ? 'page' : undefined}
                aria-label={`Page ${value}`}
                onClick={() => onPage(value)}
              >
                {value}
              </button>
            )
          )
        )}

        <button type="button" className="lb-icon-button" onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Next page">
          <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
        </button>
      </div>

      <PillSelect
        className="lb-pager__size"
        label="Students per page"
        value={String(pageSize)}
        onChange={(value) => onPageSize(Number(value))}
        options={PAGE_SIZES.map((size) => ({ value: String(size), label: `${size} per page` }))}
      />
    </nav>
  );
}
