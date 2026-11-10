import React from 'react';
import { Avatar, Card } from '../ui';

/**
 * One card per kind of result (users, cohorts, VocalQ tests, ...), each row a button that opens it.
 *
 *   groups    [{ section, items }] sections of ./searchSections.js with their results
 *   user      the signed-in user, which decides where some results lead and what they say
 *   onOpen    (section, item) => void
 */
const SearchResultList = ({ groups, user, onOpen }) => (
  <div className="srp-groups">
    {groups.map(({ section, items }) => {
      const Icon = section.icon;
      return (
        <Card
          key={section.key}
          className="srp-group"
          aria-label={section.title}
          title={
            <>
              {section.title}
              <span className="srp-group__count">{items.length}</span>
            </>
          }
        >
          <ul className="srp-rows">
            {items.map((item) => {
              const detail = section.detail?.(item, user);
              return (
                <li key={item._id}>
                  <button type="button" className="srp-row" onClick={() => onOpen(section, item)}>
                    {Icon ? (
                      <span className="srp-row__icon" aria-hidden="true">
                        <Icon size={20} />
                      </span>
                    ) : (
                      <Avatar name={item.name} src={item.profilePicture} size={40} />
                    )}
                    <span className="srp-row__text">
                      <span className="srp-row__title">{section.label(item)}</span>
                      {detail ? <span className="srp-row__detail">{detail}</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      );
    })}
  </div>
);

export default SearchResultList;
