import React, { useEffect, useState } from 'react';
import { Avatar, Pagination } from '../../ui';

/** A person: picture, name and email */
export function PersonCell({ person }) {
  return (
    <div className="ms-person">
      <Avatar name={person.name} size={40} />
      <span className="ms-person__text">
        <span className="ms-person__name">{person.name}</span>
        {person.email ? <span className="ms-person__email">{person.email}</span> : null}
      </span>
    </div>
  );
}

/**
 * People in a table, in pages: the person first (picture, name, email), then the columns you give, then
 * one action per row. Below 900px (`compact`) every person is a row of a list with one line of meta text.
 * Used for the mentors of a mentorship and for the students of a mentor.
 *
 *   people     [{ _id, name, email, ... }]
 *   caption    names the table for screen readers
 *   personLabel  the heading of the first column ("Student", "Mentor")
 *   columns    [{ key, label, render(person), className }] the columns after the person
 *   meta       (person) => string, the line under the name on a phone
 *   action     (person) => node, the button at the end of the row (a link or an icon button)
 *   wideAction true when the action is a text button, not an icon
 *   compact    true below 900px
 */
export default function PeopleTable({ people, caption, personLabel = 'Name', columns = [], meta, action, wideAction = false, compact }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // A new search or a new list starts again from the first page
  useEffect(() => {
    setPage(1);
  }, [people]);

  const first = (page - 1) * pageSize;
  const rows = people.slice(first, first + pageSize);

  return (
    <>
      {compact ? (
        <ul className="ms-rows" aria-label={caption}>
          {rows.map((person) => (
            <li key={person._id} className="ms-row">
              <Avatar name={person.name} size={40} />
              <span className="ms-row__text">
                <span className="ms-row__name">{person.name}</span>
                {meta ? <span className="ms-row__meta">{meta(person)}</span> : null}
                {person.email ? <span className="ms-row__meta">{person.email}</span> : null}
              </span>
              {action ? <span className="ms-row__end">{action(person)}</span> : null}
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-band-table">
            <caption className="ui-sr">{caption}</caption>
            <thead>
              <tr>
                <th scope="col">{personLabel}</th>
                {columns.map((column) => (
                  <th key={column.key} scope="col" className={column.className}>
                    {column.label}
                  </th>
                ))}
                {action ? (
                  <th scope="col" className={`ms-actions${wideAction ? ' ms-actions--wide' : ''}`}>
                    <span className="ui-sr">Actions</span>
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((person) => (
                <tr key={person._id}>
                  <td>
                    <PersonCell person={person} />
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className={column.className}>
                      {column.render(person)}
                    </td>
                  ))}
                  {action ? <td className={`ms-actions${wideAction ? ' ms-actions--wide' : ''}`}>{action(person)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {people.length > 10 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={people.length}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      ) : null}
    </>
  );
}
