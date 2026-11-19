import React from 'react';
import { UserMinusIcon } from '@phosphor-icons/react/dist/csr/UserMinus';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { Avatar, Badge, Button, formatNumber } from '../ui';
import { platformName } from '../StudentDashboard/dashboardModel';

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

/**
 * The linked coding platforms, one chip each (the username is the tooltip) with a cross that removes
 * just that platform, or a word when there are none
 */
function Profiles({ account, onRemovePlatform }) {
  const { profiles } = account;
  if (!profiles.length) return <span className="ui-muted">None linked</span>;
  return (
    <ul className="sa-platforms" aria-label="Linked coding platforms">
      {profiles.map((profile) => (
        <li key={profile.platform} className="sa-platform">
          <span title={profile.username}>{platformName(profile.platform)}</span>
          <button type="button" className="sa-platform__remove" aria-label={`Remove ${platformName(profile.platform)} of ${account.name}`} title={`Remove ${platformName(profile.platform)}`} onClick={() => onRemovePlatform(account, profile)}>
            <XIcon size={12} weight="bold" aria-hidden="true" />
          </button>
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
 *   onRemovePlatform(account, profile)  opens the confirmation for one platform of that account
 */
export default function AccountList({ accounts, compact, reviewingId, onRemove, onRemovePlatform }) {
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
            <Profiles account={account} onRemovePlatform={onRemovePlatform} />
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
                <Profiles account={account} onRemovePlatform={onRemovePlatform} />
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
