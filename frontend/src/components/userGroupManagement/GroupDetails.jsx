import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { Badge, Button, Card, Chip, Notice, Pagination, Skeleton, TextField, formatDate, formatNumber, pluralize } from '../ui';
import RollNumberInput from './RollNumberInput';

const lower = (value) => String(value || '').toLowerCase();

/** A figure with its label and one line of context: the stat tile of the pane */
function Stat({ label, value, context }) {
  return (
    <div className="ug-stat">
      <p className="ug-stat__label">{label}</p>
      <p className="ug-stat__value">{formatNumber(value)}</p>
      <p className="ug-stat__context">{context}</p>
    </div>
  );
}

function MemberList({ members, compact }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const first = (page - 1) * pageSize;
  const rows = members.slice(first, first + pageSize);

  return (
    <>
      {compact ? (
        <ul className="ui-list ug-members">
          {rows.map((member) => (
            <li key={member._id} className="ug-member">
              <span className="ui-table__title">{member.name}</span>
              <span className="ug-member__roll">{member.rollNumber}</span>
              <span className="ui-table__meta">{[member.department, member.email].filter(Boolean).join(' · ')}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table" data-density="compact">
            <caption className="ui-sr">Students in this group who have an account</caption>
            <thead>
              <tr>
                <th scope="col">Roll number</th>
                <th scope="col">Name</th>
                <th scope="col">Department</th>
                <th scope="col">Email</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => (
                <tr key={member._id}>
                  <td className="ug-roll">{member.rollNumber}</td>
                  <td>{member.name}</td>
                  <td>{member.department}</td>
                  <td>{member.email}</td>
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
 * One user group, in the right pane: rename it, see which roll numbers have an account, which do
 * not, which cohorts and tests use it, and add more roll numbers. Cohorts and tests that use the
 * group receive the new students right away. Same calls, messages and rules as the previous
 * details dialog (get, update, addMembers).
 *
 *   groupId           the group to show; mount it with key={groupId} so each group starts fresh
 *   compact           phone layout (rows instead of a table)
 *   onChanged()       the group's name or members changed: the list reloads its counts
 *   onDelete(group)   Delete group was pressed (the page owns the confirmation)
 *
 * A group that cannot be opened shows a notice with Retry in the pane (the previous dialog closed).
 */
export default function GroupDetails({ groupId, compact, onChanged, onDelete }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [newRolls, setNewRolls] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [rollError, setRollError] = useState('');
  const [result, setResult] = useState(null); // the summary of the last add

  const load = useCallback(
    async ({ keepForm = false } = {}) => {
      setLoading(true);
      setLoadError('');
      try {
        const data = await userGroupApi.get(groupId);
        setDetails(data);
        if (!keepForm) {
          setName(data.group.name);
          setDescription(data.group.description || '');
        }
        return data;
      } catch (error) {
        const message = apiErrorMessage(error, 'Could not load the user group');
        setLoadError(message);
        toast.error(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    load();
  }, [load]);

  const infoChanged = Boolean(details) && (name.trim() !== details.group.name || description.trim() !== (details.group.description || ''));
  const emptyName = infoChanged && !name.trim();

  const saveInfo = async () => {
    setSavingInfo(true);
    setNameError('');
    try {
      await userGroupApi.update(groupId, { name, description });
      toast.success('User group updated');
      await load();
      if (onChanged) onChanged();
    } catch (error) {
      const message = apiErrorMessage(error, 'Could not update the user group');
      toast.error(message);
      if (error?.response?.status === 409) setNameError(message);
    } finally {
      setSavingInfo(false);
    }
  };

  const addRolls = async () => {
    if (newRolls.length === 0) {
      setRollError('Add at least one roll number: upload a CSV or paste them.');
      const node = document.getElementById('ug-add-rolls');
      if (node) node.focus();
      return;
    }
    setRollError('');
    setAdding(true);
    // Every roll number the group had before, to tell new ones from repeats afterwards
    const known = new Set([...(details.members || []).map((member) => lower(member.rollNumber)), ...(details.unmatchedRollNumbers || []).map(lower)]);
    const submitted = newRolls;
    try {
      const response = await userGroupApi.addMembers(groupId, submitted);
      if (response.added === 0) {
        toast.info('Those roll numbers are already in the group');
      } else {
        toast.success(`Added ${response.added} roll number(s)`);
      }
      [...(response.cohorts || []), ...(response.tests || [])].forEach((item) => {
        if (item.status === 'synced' && item.usersAdded > 0) {
          toast.success(`${item.title}: ${item.usersAdded} student(s) added`);
        } else if (item.status !== 'synced') {
          toast.warn(`${item.title}: ${item.message}`, { autoClose: 9000 });
        }
      });
      setNewRolls([]);
      setInputKey((key) => key + 1);
      const fresh = await load({ keepForm: true });
      // Of the roll numbers that were new, how many have no account yet
      const unmatched = new Set(((fresh && fresh.unmatchedRollNumbers) || []).map(lower));
      const noAccount = submitted.filter((roll) => !known.has(lower(roll)) && unmatched.has(lower(roll))).length;
      setResult({ added: response.added, already: response.alreadyInGroup || 0, noAccount });
      if (onChanged) onChanged();
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Could not add the roll numbers'));
    } finally {
      setAdding(false);
    }
  };

  const members = useMemo(() => (details && details.members) || [], [details]);
  const unmatched = (details && details.unmatchedRollNumbers) || [];
  const cohorts = (details && details.cohorts) || [];
  const tests = (details && details.tests) || [];

  if (loading && !details) {
    return (
      <div className="ug-stack" aria-busy="true" aria-label="Loading the user group">
        <Card>
          <Skeleton width="40%" height={24} />
          <div className="ug-skeleton-gap">
            <div className="ug-stats">
              <Skeleton height={96} radius="var(--ds-radius-lg)" />
              <Skeleton height={96} radius="var(--ds-radius-lg)" />
              <Skeleton height={96} radius="var(--ds-radius-lg)" />
            </div>
            <Skeleton height={44} radius="var(--ds-radius-md)" />
            <Skeleton height={44} radius="var(--ds-radius-md)" />
          </div>
        </Card>
        <Card>
          <Skeleton height={160} radius="var(--ds-radius-md)" />
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
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
  }

  const { group } = details;
  const attachedCount = cohorts.length + tests.length;

  return (
    <div className="ug-stack">
      <Card title={group.name} description={`Created ${formatDate(group.createdAt)}`}>
        <div className="ug-stats">
          <Stat label="Roll numbers" value={group.memberCount} context="in this group" />
          <Stat label="With an account" value={members.length} context={`of ${formatNumber(group.memberCount)} roll numbers`} />
          <Stat label="No account yet" value={unmatched.length} context="access starts once they register" />
        </div>

        <div className="ug-fields">
          <TextField
            id="ug-detail-name"
            label="Name"
            value={name}
            maxLength={100}
            onChange={(event) => {
              setName(event.target.value);
              setNameError('');
            }}
            error={nameError || (emptyName ? 'Enter a name for the group.' : undefined)}
            disabled={savingInfo}
          />
          <TextField id="ug-detail-description" label="Description" value={description} maxLength={500} onChange={(event) => setDescription(event.target.value)} disabled={savingInfo} />
          <div className="ug-fields__action">
            <Button onClick={saveInfo} disabled={!infoChanged || !name.trim()} loading={savingInfo}>
              Save changes
            </Button>
          </div>
        </div>

        <div className="ug-used">
          <h3 className="ug-used__title">
            Used by {pluralize(cohorts.length, 'cohort')} and {pluralize(tests.length, 'test')}
          </h3>
          {attachedCount === 0 ? (
            <p className="ug-used__text">Not attached yet. Use the &quot;User groups&quot; button of a cohort or a communication test.</p>
          ) : (
            <div className="ui-chips">
              {cohorts.map((cohort) => (
                <Chip key={cohort._id}>{cohort.title}</Chip>
              ))}
              {tests.map((test) => (
                <Chip key={test._id}>{`${test.title} (test)`}</Chip>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card title="Add roll numbers" description="Roll numbers that are already in the group are skipped.">
        <RollNumberInput key={inputKey} id="ug-add-rolls" onChange={(list) => { setNewRolls(list); if (list.length) setRollError(''); }} disabled={adding} error={rollError} />
        <div className="ug-add-actions">
          <Button variant="spotlight" onClick={addRolls} loading={adding}>
            Add to group
          </Button>
          {attachedCount > 0 ? <p className="ug-add-note">Cohorts and tests that use this group give the new students access right away.</p> : null}
        </div>
        {result ? (
          <div className="ug-result" role="status">
            <Notice tone={result.added > 0 ? 'success' : 'info'} title={result.added > 0 ? `${formatNumber(result.added)} added${result.noAccount ? `, ${formatNumber(result.noAccount)} have no account yet` : ''}` : 'Nothing new to add'}>
              {result.added === 0
                ? 'Those roll numbers are already in the group.'
                : [result.already ? `${formatNumber(result.already)} already in the group.` : null, result.noAccount ? 'Those students get access once they register and the cohort or test is synced.' : null].filter(Boolean).join(' ') || 'Every new roll number has an account.'}
            </Notice>
          </div>
        ) : null}
      </Card>

      <Card title={`Students with an account (${formatNumber(members.length)})`} flush>
        {members.length === 0 ? (
          <div className="ug-pad">
            <Notice tone="warning" title="No accounts yet">
              None of the roll numbers in this group has an account yet.
            </Notice>
          </div>
        ) : (
          <MemberList members={members} compact={compact} />
        )}

        {unmatched.length > 0 ? (
          <div className="ug-unmatched">
            <div className="ug-unmatched__head">
              <h3 className="ug-unmatched__title">No account yet ({formatNumber(unmatched.length)})</h3>
              <Badge tone="warning">Waiting to register</Badge>
            </div>
            <p className="ug-unmatched__text">These students get access once they register and the cohort or test is synced.</p>
            <ul className="ug-unmatched__list" aria-label="Roll numbers with no account yet">
              {unmatched.map((roll) => (
                <li key={roll}>
                  <Chip>{roll}</Chip>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card title="Danger zone" description="Deleting removes the roll number list. Students keep their accounts. A group that is still attached to a cohort or a test cannot be deleted.">
        <Button variant="danger" onClick={() => onDelete(group)}>
          Delete group
        </Button>
      </Card>
    </div>
  );
}
