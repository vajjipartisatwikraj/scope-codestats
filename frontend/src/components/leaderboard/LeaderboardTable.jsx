import React, { useEffect, useRef, useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
import { PlatformIcon } from '../custom-components';
import { Avatar, Consistency, RankMark, ScoreChange, YouBadge } from './Cells';
import { formatNumber, formatRank, profilePath } from './leaderboardFormat';
import { PLATFORMS, TAB_PLATFORMS, TABS, platformValue, valueOf } from './leaderboardModel';

/**
 * The leaderboard as a real table (900px and wider).
 *
 * Columns, in the order of design/screens.md section 6: rank, student (name with the roll number
 * beneath), consistency, score change, department, section, year, the figure of the list, one
 * column per platform, then the rank inside the department. The rank and the student stay in view
 * when the table is scrolled sideways, which it is whenever the platform columns do not fit.
 *
 * Every sortable header is a button; the column that sorts the table carries aria-sort.
 *
 * Props
 *   rows            the students of this page
 *   tab             'score' | 'problems'
 *   ranks           Map: student id -> rank in the filtered list
 *   departmentRanks Map: student id -> rank inside the department
 *   sort, onSort    { key, dir } and the click handler
 *   ownId           the signed-in student's id (their row is marked)
 *   yearName(graduatingYear)   "III Year"
 */

function SortHeader({ label, sortKey, sort, onSort, align = 'start', title }) {
  const active = sort.key === sortKey;
  return (
    <th scope="col" className="lb-th" data-align={align} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="lb-sort" data-active={active ? 'true' : 'false'} onClick={() => onSort(sortKey)} title={title}>
        <span>{label}</span>
        <span className="lb-sort__arrows" aria-hidden="true">
          {active ? (
            sort.dir === 'asc' ? <CaretUpIcon size={12} weight="fill" /> : <CaretDownIcon size={12} weight="fill" />
          ) : (
            <CaretDownIcon size={12} weight="bold" />
          )}
        </span>
      </button>
    </th>
  );
}

export default function LeaderboardTable({ rows, tab, ranks, departmentRanks, sort, onSort, ownId, yearName, refreshing }) {
  const platforms = TAB_PLATFORMS[tab];
  const valueLabel = TABS.find((entry) => entry.key === tab).valueLabel;

  // A hint that there is more to the right, while there is
  const scroller = useRef(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const node = scroller.current;
    if (!node) return undefined;
    const update = () => setMore(node.scrollWidth - node.clientWidth - node.scrollLeft > 4);
    update();
    node.addEventListener('scroll', update, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (observer) observer.observe(node);
    return () => {
      node.removeEventListener('scroll', update);
      if (observer) observer.disconnect();
    };
  }, [rows.length, tab]);

  const openProfile = (row) => {
    const path = profilePath(row.email, row.username);
    if (path) window.open(path, '_blank', 'noopener');
  };

  return (
    <div className="lb-table" data-more={more ? 'true' : 'false'} data-refreshing={refreshing ? 'true' : 'false'}>
      <div className="lb-table__scroll" ref={scroller} role="region" aria-label="Leaderboard table, scrolls sideways" tabIndex={0}>
        <table>
          <caption className="lb-sr">
            Leaderboard by {valueLabel.toLowerCase()}. Sorted by {sort.key === 'value' ? valueLabel.toLowerCase() : sort.key}, {sort.dir === 'asc' ? 'lowest' : 'highest'} first.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="lb-th lb-col-rank" data-align="center">
                Rank
              </th>
              <SortHeader label="Student" sortKey="name" sort={sort} onSort={onSort} />
              <SortHeader
                label="Consistency"
                sortKey="consistency"
                sort={sort}
                onSort={onSort}
                title="Days of the last 7 on which the total score changed, as a level from 0 to 5"
              />
              <SortHeader label="Score change" sortKey="change" sort={sort} onSort={onSort} title="Change in total score over the last 7 days" />
              <SortHeader label="Dept" sortKey="department" sort={sort} onSort={onSort} />
              <SortHeader label="Sec" sortKey="section" sort={sort} onSort={onSort} />
              <SortHeader label="Year" sortKey="year" sort={sort} onSort={onSort} />
              <SortHeader label={valueLabel} sortKey="value" sort={sort} onSort={onSort} align="end" />
              {platforms.map((key) => (
                <SortHeader
                  key={key}
                  label={
                    <span className="lb-platform">
                      <PlatformIcon platform={key} size={16} />
                      {PLATFORMS[key].name}
                    </span>
                  }
                  sortKey={`platform:${key}`}
                  sort={sort}
                  onSort={onSort}
                  align="end"
                />
              ))}
              <th scope="col" className="lb-th" data-align="end">
                Dept rank
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const own = row._id === ownId;
              const path = profilePath(row.email, row.username);
              return (
                <tr key={row._id} id={own ? 'lb-own' : undefined} className="lb-row" data-own={own ? 'true' : 'false'} onClick={() => openProfile(row)}>
                  <td className="lb-col-rank" data-align="center">
                    <RankMark rank={ranks.get(row._id)} />
                  </td>
                  <td className="lb-col-student">
                    <div className="lb-student">
                      <Avatar name={row.name} picture={row.profilePicture} />
                      <div className="lb-student__text">
                        <span className="lb-student__name">
                          {path ? (
                            <a href={path} target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>
                              {row.name || 'Unnamed student'}
                            </a>
                          ) : (
                            row.name || 'Unnamed student'
                          )}
                          {own && <YouBadge />}
                        </span>
                        <span className="lb-student__meta">{row.rollNumber ? String(row.rollNumber).toUpperCase() : '\u2013'}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <Consistency index={row.consistencyIndex} />
                  </td>
                  <td>
                    <ScoreChange change={row.scoreChange} />
                  </td>
                  <td>{row.department || '\u2013'}</td>
                  <td>{row.section || '\u2013'}</td>
                  <td className="lb-nowrap">{yearName(row.graduatingYear)}</td>
                  <td className="lb-num lb-num--strong" data-align="end">
                    {formatNumber(valueOf(row, tab))}
                  </td>
                  {platforms.map((key) => {
                    const value = platformValue(row, key, tab);
                    return (
                      <td key={key} className="lb-num" data-align="end" data-empty={value === null ? 'true' : 'false'}>
                        {value === null ? (
                          <>
                            <span aria-hidden="true">{'\u2013'}</span>
                            <span className="lb-sr">Not linked</span>
                          </>
                        ) : (
                          formatNumber(value)
                        )}
                      </td>
                    );
                  })}
                  <td className="lb-num" data-align="end">
                    {departmentRanks.has(row._id) ? formatRank(departmentRanks.get(row._id)) : '\u2013'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {more && (
        <p className="lb-table__hint">
          Scroll sideways for the platforms <CaretRightIcon size={12} weight="bold" aria-hidden="true" />
        </p>
      )}
    </div>
  );
}
