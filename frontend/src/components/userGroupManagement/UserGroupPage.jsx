import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ChatsIcon } from '@phosphor-icons/react/dist/csr/Chats';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { StackIcon } from '@phosphor-icons/react/dist/csr/Stack';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import useAutoHideScrollbars from '../../hooks/useAutoHideScrollbars';
import useMediaQuery from '../../hooks/useMediaQuery';
import { AdminTop, Avatar, Badge, Button, Chip, ConfirmDialog, Dialog, EmptyState, IconButton, Notice, Page, Pagination, PillTabs, SearchField, Skeleton, formatDate, formatNumber, pluralize } from '../ui';
import './userGroups.css';
import AddRollNumbersDrawer from './AddRollNumbersDrawer';

const LIST_PATH = '/admin/user-groups';

const lower = (value) => String(value || '').toLowerCase();

/** The remove button at the end of a row: a trash icon in the danger tone, named after the person */
function RemoveButton({ label, onClick }) {
  return (
    <IconButton className="ug-remove" label={label} size="sm" tone="plain" onClick={onClick}>
      <TrashIcon size={20} weight="regular" aria-hidden="true" />
    </IconButton>
  );
}

/**
 * The students of a group who have an account: a table with the student (picture, name, email), the
 * roll number and the department, in pages. Below 900px every student is a row of a list.
 */
function StudentsTable({ members, compact, onRemove }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // A new search starts again from the first page
  useEffect(() => {
    setPage(1);
  }, [members]);

  const first = (page - 1) * pageSize;
  const rows = members.slice(first, first + pageSize);

  return (
    <>
      {compact ? (
        <ul className="ug-rows" aria-label="Students with an account">
          {rows.map((member) => (
            <li key={member._id} className="ug-row">
              <Avatar name={member.name} size={40} />
              <span className="ug-row__text">
                <span className="ug-row__name">{member.name}</span>
                <span className="ug-row__meta">{[member.rollNumber, member.department].filter(Boolean).join(' · ')}</span>
                {member.email ? <span className="ug-row__meta">{member.email}</span> : null}
              </span>
              <RemoveButton label={`Remove ${member.name} from this group`} onClick={() => onRemove(member.rollNumber, member.name)} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-table-wrap">
          <table className="ug-table">
            <caption className="ui-sr">Students in this group who have an account</caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Roll number</th>
                <th scope="col">Department</th>
                <th scope="col" className="ug-actions">
                  <span className="ui-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr key={member._id}>
                  <td>
                    <div className="ug-student">
                      <Avatar name={member.name} size={40} />
                      <span className="ug-student__text">
                        <span className="ug-student__name">{member.name}</span>
                        <span className="ug-student__email">{member.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="ug-roll">{member.rollNumber}</td>
                  <td>{member.department ? <Badge>{member.department}</Badge> : <span className="ug-none">Not set</span>}</td>
                  <td className="ug-actions">
                    <RemoveButton label={`Remove ${member.name} from this group`} onClick={() => onRemove(member.rollNumber, member.name)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {members.length > 10 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={members.length}
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

/**
 * The roll numbers of a group that have no account yet: the same table shape, with the status in
 * words ("Waiting to register").
 */
function WaitingTable({ rolls, compact, onRemove }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    setPage(1);
  }, [rolls]);

  const first = (page - 1) * pageSize;
  const rows = rolls.slice(first, first + pageSize);

  return (
    <>
      {compact ? (
        <ul className="ug-rows" aria-label="Roll numbers with no account yet">
          {rows.map((roll) => (
            <li key={roll} className="ug-row ug-row--simple">
              <span className="ug-row__name ug-roll">{roll}</span>
              <span className="ug-row__end">
                <Badge tone="warning">Waiting to register</Badge>
                <RemoveButton label={`Remove ${roll} from this group`} onClick={() => onRemove(roll, null)} />
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-table-wrap">
          <table className="ug-table">
            <caption className="ui-sr">Roll numbers in this group that have no account yet</caption>
            <thead>
              <tr>
                <th scope="col">Roll number</th>
                <th scope="col">Status</th>
                <th scope="col" className="ug-actions">
                  <span className="ui-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((roll) => (
                <tr key={roll}>
                  <td className="ug-roll">{roll}</td>
                  <td>
                    <Badge tone="warning">Waiting to register</Badge>
                  </td>
                  <td className="ug-actions">
                    <RemoveButton label={`Remove ${roll} from this group`} onClick={() => onRemove(roll, null)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rolls.length > 10 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={rolls.length}
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

/**
 * One user group, on its own page (route /admin/user-groups/:groupId, opened by the Manage button
 * of its card). One view, no tabs and no cards:
 *
 *   the admin top   the path "/ User groups / Group name" (the first step goes back to the list), the group's name and tagline, and "Add roll numbers"
 *                   (opens a drawer from the right); then the search at the left and the switch
 *                   "With an account / No account yet" at the right end
 *   used by         the cohorts and communication tests the group is attached to
 *   the table       the students of the chosen side, in pages, each with a Remove button
 *
 * Renaming and deleting the group are in the three-dot menu of its card on the list. Removing a roll
 * number asks first. The server refuses it while the group is attached to a cohort or test (access
 * would be taken away), so then a dialog lists them and asks to detach the group first, and it
 * refuses to empty a group (a group needs one roll number; delete the group instead).
 *
 * Same calls, messages and rules as before (get, addMembers, removeMembers). A group that cannot be
 * opened shows a notice with Retry.
 */
export default function UserGroupPage() {
  const { groupId } = useParams();
  // Scrollbars show only while something is being scrolled
  useAutoHideScrollbars();
  const compact = !useMediaQuery('(min-width: 900px)');

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [who, setWho] = useState('account'); // 'account' | 'waiting'
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null); // { rollNumber, name } of the roll number being removed
  const [removeBusy, setRemoveBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await userGroupApi.get(groupId);
      setDetails(data);
      return data;
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not load the user group');
      setLoadError(message);
      toast.error(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const members = useMemo(() => (details && details.members) || [], [details]);
  const unmatched = useMemo(() => (details && details.unmatchedRollNumbers) || [], [details]);
  const cohorts = (details && details.cohorts) || [];
  const tests = (details && details.tests) || [];

  const term = query.trim().toLowerCase();
  const shownMembers = useMemo(
    () => (term ? members.filter((member) => [member.name, member.rollNumber, member.department, member.email].some((value) => lower(value).includes(term))) : members),
    [members, term]
  );
  const shownUnmatched = useMemo(() => (term ? unmatched.filter((roll) => lower(roll).includes(term)) : unmatched), [unmatched, term]);

  const group = details ? details.group : null;
  const attachedCount = cohorts.length + tests.length;

  const whoItems = [
    {
      key: 'account',
      label: (
        <>
          With an account<span className="ug-count">{formatNumber(members.length)}</span>
        </>
      ),
    },
    {
      key: 'waiting',
      label: (
        <>
          No account yet<span className="ug-count">{formatNumber(unmatched.length)}</span>
        </>
      ),
    },
  ];

  const askRemove = (rollNumber, name) => setRemoving({ rollNumber, name });

  const closeRemove = () => {
    if (!removeBusy) setRemoving(null);
  };

  const confirmRemove = async () => {
    setRemoveBusy(true);
    try {
      await userGroupApi.removeMembers(groupId, [removing.rollNumber]);
      toast.success(`${removing.name || removing.rollNumber} removed from the group`);
      setRemoving(null);
      await load();
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not remove the roll number'));
    } finally {
      setRemoveBusy(false);
    }
  };
  let body;
  if (loading && !details) {
    body = (
      <div className="ug-skeleton-gap" aria-busy="true" aria-label="Loading the user group">
        <Skeleton height={64} radius="var(--ds-radius-md)" />
        <Skeleton height={44} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
        <Skeleton height={56} radius="var(--ds-radius-md)" />
      </div>
    );
  } else if (!details) {
    body = (
      <Notice
        tone="danger"
        title="We could not open this user group"
        action={
          <Button variant="ghost" size="sm" onClick={() => load()}>
            Retry
          </Button>
        }
      >
        {loadError || 'Try again in a moment.'}
      </Notice>
    );
  } else {
    let list;
    if (who === 'account') {
      if (members.length === 0) {
        list = (
          <Notice
            tone="warning"
            title="No accounts yet"
            action={
              unmatched.length > 0 ? (
                <Button variant="ghost" size="sm" onClick={() => setWho('waiting')}>
                  See who is waiting
                </Button>
              ) : null
            }
          >
            None of the roll numbers in this group has an account yet.
          </Notice>
        );
      } else if (shownMembers.length === 0) {
        list = <EmptyState compact icon={<MagnifyingGlassIcon size={28} weight="regular" />} title="No students match your search" text={`Nobody in this group matches "${query.trim()}".`} action={<Button onClick={() => setQuery('')}>Clear search</Button>} />;
      } else {
        list = (
          <>
            <p className="ug-results__count">{term ? `${formatNumber(shownMembers.length)} of ${formatNumber(members.length)} students` : `${pluralize(members.length, 'student')} with an account`}</p>
            <StudentsTable members={shownMembers} compact={compact} onRemove={askRemove} />
          </>
        );
      }
    } else if (unmatched.length === 0) {
      list = <EmptyState compact title="Everyone has an account" text="Every roll number in this group belongs to a registered student." />;
    } else if (shownUnmatched.length === 0) {
      list = <EmptyState compact icon={<MagnifyingGlassIcon size={28} weight="regular" />} title="No roll numbers match your search" text={`Nothing waiting matches "${query.trim()}".`} action={<Button onClick={() => setQuery('')}>Clear search</Button>} />;
    } else {
      list = (
        <>
          <p className="ug-results__count">
            {term ? `${formatNumber(shownUnmatched.length)} of ${formatNumber(unmatched.length)} roll numbers` : `${pluralize(unmatched.length, 'roll number')} with no account yet`}. These students get access once they register and the cohort or test is synced.
          </p>
          <WaitingTable rolls={shownUnmatched} compact={compact} onRemove={askRemove} />
        </>
      );
    }

    body = (
      <>
        <section className="ug-usedby" aria-labelledby="ug-usedby-title">
          <h2 id="ug-usedby-title" className="ug-usedby__title">
            Used by
          </h2>
          {attachedCount === 0 ? (
            <p className="ug-usedby__none">Not attached yet. Press the &quot;User groups&quot; button of a cohort or communication test to attach this group.</p>
          ) : (
            <ul className="ug-usedby__list" aria-label="Where this group is used">
              {cohorts.map((cohort) => (
                <li key={`c-${cohort._id}`}>
                  <Chip icon={<StackIcon size={14} weight="regular" aria-hidden="true" />}>{cohort.title}</Chip>
                </li>
              ))}
              {tests.map((test) => (
                <li key={`t-${test._id}`}>
                  <Chip icon={<ChatsIcon size={14} weight="regular" aria-hidden="true" />}>{`${test.title} (test)`}</Chip>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="ug-body">{list}</div>
      </>
    );
  }

  return (
    <Page className="ug ugp">
      <AdminTop
        crumbs={[{ label: 'User groups', to: LIST_PATH }, { label: group ? group.name : 'User group' }]}
        title={group ? group.name : 'User group'}
        description={group ? [group.description, `Created ${formatDate(group.createdAt)}`].filter(Boolean).join(' \u00b7 ') : undefined}
        actions={
          group ? (
            <Button variant="primary" startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => setAdding(true)}>
              Add roll numbers
            </Button>
          ) : null
        }
        label="Search students and choose who to show"
        search={group ? <SearchField value={query} onChange={setQuery} placeholder="Search by name or roll number" label="Search students in this group" /> : undefined}
        filters={group ? <PillTabs items={whoItems} value={who} onChange={setWho} label="Show students" role="radiogroup" /> : undefined}
      />

      {body}

      {adding && details ? <AddRollNumbersDrawer group={details.group} details={details} reload={load} onClose={() => setAdding(false)} /> : null}
      {/* Roll numbers can only leave a group that nothing uses, because removing one takes access away */}
      {removing && attachedCount > 0 ? (
        <Dialog
          open
          onClose={closeRemove}
          size="sm"
          title="Detach this group first"
          description={'Roll numbers can only be removed from a group that no cohort or test uses, because removing one would take away that student\u2019s access. Detach the group from the items below (the "User groups" button of the cohort or test), then remove the roll number.'}
          actions={<Button onClick={closeRemove}>Close</Button>}
        >
          <ul className="ug-blocked">
            {cohorts.map((cohort) => (
              <li key={`c-${cohort._id}`}>
                {cohort.title} <span className="ui-muted">(cohort)</span>
              </li>
            ))}
            {tests.map((test) => (
              <li key={`t-${test._id}`}>
                {test.title} <span className="ui-muted">(communication test)</span>
              </li>
            ))}
          </ul>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={Boolean(removing)}
          onClose={closeRemove}
          busy={removeBusy}
          danger
          title={removing ? `Remove ${removing.name || removing.rollNumber} from this group?` : 'Remove from this group?'}
          description="Their roll number leaves the list. Their account is not affected."
          confirmLabel="Remove from group"
          onConfirm={confirmRemove}
        />
      )}
    </Page>
  );
}
