import React from 'react';
import { ProgressBar } from '../custom-components';
import { SortHeader, formatNumber } from '../ui';
import { formatBytes, formatPercent } from './monitoringModel';

/** The model that owns a collection, or a quiet note that nothing in the code does. */
function ModelNote({ collection }) {
  return <span className="ui-table__meta">{collection.model ? `Model ${collection.model}` : 'No model in the code'}</span>;
}

/**
 * Every collection of the database with its records and sizes. A compact table from 900px, rows
 * on a phone.
 *
 *   rows          the collections of this page, already sorted (see DatabaseSize)
 *   totalOnDisk   data and indexes of the whole database, for the share column
 *   phone, sort, onSort
 */
export default function CollectionTable({ rows, totalOnDisk, phone, sort, onSort }) {
  const onDisk = (collection) => collection.storageSize + collection.indexSize;

  if (phone) {
    return (
      <ul className="ui-list">
        {rows.map((collection) => (
          <li key={collection.name} className="ui-list__row mon-row">
            <div className="mon-row__text">
              <span className="mon-row__route">
                <span className="mon-route__path">{collection.name}</span>
              </span>
              <ModelNote collection={collection} />
              <span className="mon-row__meta">{`${formatNumber(collection.count)} records \u00b7 ${formatBytes(onDisk(collection))} on disk`}</span>
              <ProgressBar
                value={onDisk(collection)}
                max={totalOnDisk || 1}
                size="sm"
                label={`${collection.name} share of the database`}
                hideLabel
                valueLabel={null}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table mon-table" data-density="compact">
        <caption className="ui-sr">Collections of the database with their records and sizes.</caption>
        <thead>
          <tr>
            <SortHeader label="Collection" sortKey="name" sort={sort} onSort={onSort} />
            <SortHeader label="Records" sortKey="count" sort={sort} onSort={onSort} align="end" className="ui-num" />
            <SortHeader label="Data size" sortKey="dataSize" sort={sort} onSort={onSort} align="end" className="ui-num" />
            <SortHeader label="On disk" sortKey="onDisk" sort={sort} onSort={onSort} align="end" className="ui-num" />
            <SortHeader label="Indexes" sortKey="indexSize" sort={sort} onSort={onSort} align="end" className="ui-num" />
            <SortHeader label="Average record" sortKey="avgObjSize" sort={sort} onSort={onSort} align="end" className="ui-num mon-wide" />
            <th scope="col">Share of database</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((collection) => (
            <tr key={collection.name}>
              <td className="mon-table__route">
                <div className="ui-table__cell-text">
                  <span className="ui-table__title">{collection.name}</span>
                  <ModelNote collection={collection} />
                </div>
              </td>
              <td className="ui-num mon-table__num">{formatNumber(collection.count)}</td>
              <td className="ui-num mon-table__num">{formatBytes(collection.dataSize)}</td>
              <td className="ui-num mon-table__num">{formatBytes(onDisk(collection))}</td>
              <td className="ui-num mon-table__num">{formatBytes(collection.indexSize)}</td>
              <td className="ui-num mon-table__num mon-wide">{formatBytes(collection.avgObjSize)}</td>
              <td className="mon-table__share">
                <ProgressBar
                  value={onDisk(collection)}
                  max={totalOnDisk || 1}
                  size="sm"
                  label={`${collection.name} share of the database`}
                  hideLabel
                  valueLabel={formatPercent(onDisk(collection), totalOnDisk)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
