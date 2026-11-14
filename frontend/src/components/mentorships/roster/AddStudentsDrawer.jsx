import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../../services/mentorshipApi';
import { Button, Drawer, Notice, RollNumberInput, formatNumber, pluralize } from '../../ui';

const SHOWN = 20;

/** The first roll numbers, then "and 12 more" */
const briefly = (items) => (items.length > SHOWN ? `${items.slice(0, SHOWN).join(', ')} and ${formatNumber(items.length - SHOWN)} more` : items.join(', '));

/** What happened to the roll numbers of the last upload, one notice for each kind of outcome */
function AddOutcome({ result }) {
  const { added = 0, alreadyInRoster = 0, conflicts = [], notFound = [] } = result;
  return (
    <div className="ms-outcome" role="status">
      <Notice tone={added > 0 ? 'success' : 'info'} title={added > 0 ? `${pluralize(added, 'student')} added` : 'Nobody was added'}>
        {alreadyInRoster > 0 ? `${formatNumber(alreadyInRoster)} already in this list.` : added > 0 ? 'They appear in the list behind this panel.' : 'Check the notes below.'}
      </Notice>
      {conflicts.length > 0 ? (
        <Notice tone="warning" title={`${pluralize(conflicts.length, 'student')} already with another mentor`}>
          <ul className="ms-list">
            {conflicts.map((conflict) => (
              <li key={conflict.rollNumber}>
                {conflict.name || conflict.rollNumber} <span className="ui-muted">({conflict.rollNumber}) is with {conflict.heldBy}</span>
              </li>
            ))}
          </ul>
          <p className="ms-note">A student has one mentor in each mentorship. Ask an admin to move them.</p>
        </Notice>
      ) : null}
      {notFound.length > 0 ? (
        <Notice tone="info" title={`${pluralize(notFound.length, 'roll number')} with no account yet`}>
          {briefly(notFound)}. Add them again after they sign up.
        </Notice>
      ) : null}
    </div>
  );
}

/**
 * Add students to a mentor's list by roll number, in a drawer from the right (blue header): upload a
 * CSV or paste them, then press Add. The drawer stays open with a summary so another batch can follow;
 * Close ends it. Students without an account are not stored; they are listed so they can be added again
 * once they register. Mount it only while it is open.
 *
 *   api          the roster calls (adminRoster or myRoster): api.add(rollNumbers)
 *   title        the drawer title, "Add students"
 *   description  the line under the title (the mentorship and the mentor)
 *   onAdded()    something was added; the screen reloads behind the drawer
 *   onClose()
 */
export default function AddStudentsDrawer({ api, title = 'Add students', description, onAdded, onClose }) {
  const [rolls, setRolls] = useState([]);
  const [inputKey, setInputKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const add = async (event) => {
    event.preventDefault();
    if (rolls.length === 0) {
      setError('Add at least one roll number: upload a CSV or paste them.');
      document.getElementById('ms-add-rolls')?.focus();
      return;
    }
    setError('');
    setAdding(true);
    try {
      const response = await api.add(rolls);
      setResult(response);
      setRolls([]);
      setInputKey((key) => key + 1);
      if (response.added > 0) onAdded();
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not add the students'));
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
      title={title}
      description={description}
      footer={
        <>
          <Button onClick={onClose} disabled={adding}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button type="submit" form="ms-add-form" variant="primary" loading={adding}>
            Add students
          </Button>
        </>
      }
    >
      <form id="ms-add-form" className="ms-form" onSubmit={add} noValidate>
        <section className="ms-form__section">
          <p className="ms-lead">Upload a CSV or paste the roll numbers. Students already in the list are skipped.</p>
          <RollNumberInput
            key={inputKey}
            id="ms-add-rolls"
            onChange={(list) => {
              setRolls(list);
              if (list.length) setError('');
            }}
            disabled={adding}
            error={error}
            rows={10}
          />
        </section>
        {result ? <AddOutcome result={result} /> : null}
      </form>
    </Drawer>
  );
}
