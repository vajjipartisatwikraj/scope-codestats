import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, userGroupApi } from '../../services/userGroupApi';
import { Button, Drawer, Notice, formatNumber } from '../ui';
import RollNumberInput from './RollNumberInput';

const lower = (value) => String(value || '').toLowerCase();

/**
 * Add roll numbers to a user group, in a drawer from the right (480px): upload a CSV or paste
 * them, then press Add to group. The drawer stays open afterwards with a summary ("38 added, 2 have
 * no account yet") so another batch can follow; Close ends it. Roll numbers that are already in the
 * group are skipped. Cohorts and tests that use the group give the new students access at once.
 * Mount it only while it is open: it starts empty each time.
 *
 *   group        { _id, name } of the group
 *   details      the group as the page loaded it (its members and unmatchedRollNumbers tell new roll
 *                numbers from repeats), and whether anything uses it
 *   reload()     fetches the group again and returns it (the page shows the new numbers behind the drawer)
 *   onClose()
 *
 * Same call, messages and rules as before: userGroupApi.addMembers.
 */
export default function AddRollNumbersDrawer({ group, details, reload, onClose }) {
  const [rolls, setRolls] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // the summary of the last add

  const attached = ((details && details.cohorts) || []).length + ((details && details.tests) || []).length;

  const add = async (event) => {
    event.preventDefault();
    if (rolls.length === 0) {
      setError('Add at least one roll number: upload a CSV or paste them.');
      const node = document.getElementById('ug-add-rolls');
      if (node) node.focus();
      return;
    }
    setError('');
    setAdding(true);
    // Every roll number the group had before, to tell new ones from repeats afterwards
    const known = new Set([...((details && details.members) || []).map((member) => lower(member.rollNumber)), ...((details && details.unmatchedRollNumbers) || []).map(lower)]);
    const submitted = rolls;
    try {
      const response = await userGroupApi.addMembers(group._id, submitted);
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
      setRolls([]);
      setInputKey((key) => key + 1);
      const fresh = await reload();
      // Of the roll numbers that were new, how many have no account yet
      const unmatchedNow = new Set(((fresh && fresh.unmatchedRollNumbers) || []).map(lower));
      const noAccount = submitted.filter((roll) => !known.has(lower(roll)) && unmatchedNow.has(lower(roll))).length;
      setResult({ added: response.added, already: response.alreadyInGroup || 0, noAccount });
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not add the roll numbers'));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={adding}
      title="Add roll numbers"
      description={group.name}
      footer={
        <>
          <Button onClick={onClose} disabled={adding}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button type="submit" form="ug-add-form" variant="primary" loading={adding}>
            Add to group
          </Button>
        </>
      }
    >
      <form id="ug-add-form" className="ug-form" onSubmit={add} noValidate>
        <section className="ug-form__section">
          <p className="ug-lead">Upload a CSV or paste the roll numbers. Roll numbers that are already in the group are skipped.</p>
          <RollNumberInput
            key={inputKey}
            id="ug-add-rolls"
            onChange={(list) => {
              setRolls(list);
              if (list.length) setError('');
            }}
            disabled={adding}
            error={error}
            rows={10}
          />
          {attached > 0 ? <p className="ug-add-note">Cohorts and tests that use this group give the new students access right away.</p> : null}
        </section>

        {result ? (
          <div role="status">
            <Notice tone={result.added > 0 ? 'success' : 'info'} title={result.added > 0 ? `${formatNumber(result.added)} added${result.noAccount ? `, ${formatNumber(result.noAccount)} have no account yet` : ''}` : 'Nothing new to add'}>
              {result.added === 0
                ? 'Those roll numbers are already in the group.'
                : [result.already ? `${formatNumber(result.already)} already in the group.` : null, result.noAccount ? 'Those students get access once they register and the cohort or test is synced.' : null].filter(Boolean).join(' ') || 'Every new roll number has an account.'}
            </Notice>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}
