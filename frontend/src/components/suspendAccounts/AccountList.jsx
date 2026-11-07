import React from 'react';
import { UserMinusIcon } from '@phosphor-icons/react/dist/csr/UserMinus';
import { Avatar, Badge, Button, formatNumber } from '../ui';
import { PLATFORMS } from '../publicProfile/profileModel';

const platformName = (key) => PLATFORMS.find((platform) => platform.key === key)?.name || key;
const ROLE_LABEL = { admin: 'Admin', teacher: 'Teacher' };

/** The person a row is about: picture, name, email, and a badge when they are staff */
function Person({ account }) {
  return (
    <div className="ui-table__cell-main">
      <Avatar name={account.name} src={account.profilePicture || undefined} size={36} />
      <div className="ui-table__cell-text">
        <span className="ui-table__title">
          {account.name}
          {ROLE_LABEL[account.userType] ? <Badge className="sa-role">{ROLE_LABEL[account.userType]}</Badge> : null}
        </span>
        <span className="ui-table__meta">{account.email}</span>
      </div>
    </div>
  );
}

/** The linked coding platforms, one badge each (the username is the tooltip), or a word when there are none */
function Profiles({ profiles }) {
  if (!profiles.length) return <span className="ui-muted">None linked</span>;
  return (
    <ul className="sa-platforms" aria-label="Linked coding platforms">
      {profiles.map((profile) => (
        <li key={profile.platform}>
          <Badge className="sa-platform">
            <span title={profile.username}>{platformName(profile.platform)}</span>
          </Badge>
        </li>
      ))}
    </ul>
  );
}

const totalScore = (profiles) => profiles.reduce((sum, profile) => sum + (profile.score || 0), 0);

function RemoveButton({ account, reviewing, disabled, onRemove }) {
  return (
    <Button
      size="sm"
      loading={reviewing}
      disabled={disabled}
      startIcon={<UserMinusIcon size={18} weight="regular" aria-hidden="true" />}
      aria-label={`Remove the coding accounts of ${account.name}`}
      onClick={() => onRemove(account)}
    >
      Remove coding accounts
    </Button>
  );
}

/**
 * The accounts as a table (900px and wider) or as rows (phones).
 *
 *   accounts     the rows of the current page
 *   compact      render rows instead of a table
 *   reviewingId  the account whose preview is loading (its button shows the spinner)
 *   onRemove(account)  opens the confirmation for that account
 */
export default function AccountList({ accounts, compact, reviewingId, onRemove }) {
  // Only one preview at a time: the other buttons wait
  const busy = Boolean(reviewingId);

  if (compact) {
    return (
      <ul className="ui-list sa-list">
        {accounts.map((account) => (
          <li key={account._id} className="sa-item">
            <Person account={account} />
            <p className="sa-item__meta">
              {account.rollNumber}
              {account.department ? ` · ${account.department}` : ''}
            </p>
            <Profiles profiles={account.profiles} />
            <RemoveButton account={account} reviewing={reviewingId === account._id} disabled={busy && reviewingId !== account._id} onRemove={onRemove} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="ui-table-wrap">
      <table className="ui-table" data-density="compact">
        <caption className="ui-sr">Accounts and their linked coding platforms</caption>
        <thead>
          <tr>
            <th scope="col">Person</th>
            <th scope="col">Roll number</th>
            <th scope="col">Coding profiles</th>
            <th scope="col" className="sa-num">
              Total score
            </th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account._id}>
              <td>
                <Person account={account} />
              </td>
              <td>
                <div className="ui-table__cell-text">
                  <span>{account.rollNumber}</span>
                  <span className="ui-table__meta">{account.department || ''}</span>
                </div>
              </td>
              <td>
                <Profiles profiles={account.profiles} />
              </td>
              <td className="sa-num">{formatNumber(totalScore(account.profiles))}</td>
              <td>
                <RemoveButton account={account} reviewing={reviewingId === account._id} disabled={busy && reviewingId !== account._id} onRemove={onRemove} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
