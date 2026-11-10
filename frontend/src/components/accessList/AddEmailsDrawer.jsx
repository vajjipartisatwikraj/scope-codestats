import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/csr/UploadSimple';
import { accessListApi, apiErrorMessage } from '../../services/accessListApi';
import parseEmailCsv from '../../utils/parseEmailCsv';
import { Button, Drawer, Notice, SelectField, TextField, formatNumber, pluralize } from '../ui';

const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 5000;

const ROLE_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
];

/**
 * Add email addresses to the list: one typed or pasted, or many from a CSV. The text box is the
 * single source of truth: choosing a file puts its contents there, so a typo can be fixed before
 * saving. Mount it only while it is open: it starts empty each time.
 *
 *   One address per line, or a CSV with the columns  email, role, note  (role and note are
 *   optional; a role is "student" or "teacher"). Rows without a role get the "Add as" choice.
 *
 *   onAdded(result)   the addresses were saved; the page reloads its list
 *   onClose
 *
 * After saving, the drawer says how many were added, how many were already on the list and why any
 * were refused, and its only button is Done.
 */
export default function AddEmailsDrawer({ onAdded, onClose }) {
  const fileInputRef = useRef(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [defaultRole, setDefaultRole] = useState('student');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const parsed = useMemo(() => parseEmailCsv(text, defaultRole), [text, defaultRole]);

  const handleFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error('That file is too large. An email list is normally a few hundred KB at most.');
      return;
    }
    try {
      setText(await file.text());
      setFileName(file.name);
      setError('');
    } catch {
      toast.error('Could not read that file');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    if (parsed.rows.length === 0) {
      setError('Add at least one email address: type or paste them, or upload a CSV.');
      const node = document.getElementById('acl-emails');
      if (node) node.focus();
      return;
    }
    if (parsed.rows.length > MAX_ROWS) {
      setError(`Add at most ${formatNumber(MAX_ROWS)} addresses at a time. Split the file and upload it in parts.`);
      return;
    }

    setSaving(true);
    try {
      const outcome = await accessListApi.addMany(parsed.rows);
      setResult(outcome);
      onAdded(outcome);
      if (outcome.added > 0) toast.success(`${pluralize(outcome.added, 'address', 'addresses')} added to the list`);
    } catch (failure) {
      const message = apiErrorMessage(failure, 'Could not add the addresses');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const summary = [
    pluralize(parsed.rows.length, 'address', 'addresses'),
    parsed.duplicates > 0 ? `${formatNumber(parsed.duplicates)} ${parsed.duplicates === 1 ? 'duplicate' : 'duplicates'} ignored` : null,
    parsed.invalid.length > 0 ? `${formatNumber(parsed.invalid.length)} not valid` : null,
    parsed.skippedHeader ? 'header row skipped' : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (result) {
    const refused = result.invalid || [];
    return (
      <Drawer
        open
        tone="accent"
        onClose={onClose}
        title="Addresses added"
        footer={
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        }
      >
        <div className="acl-form">
          <Notice tone={result.added > 0 ? 'success' : 'warning'} title={`${pluralize(result.added, 'address', 'addresses')} added`}>
            {result.alreadyListed > 0 ? `${pluralize(result.alreadyListed, 'address was', 'addresses were')} already on the list and ${result.alreadyListed === 1 ? 'was' : 'were'} left as they are.` : 'Everyone you listed can now sign in with that Google address.'}
          </Notice>
          {result.invalidCount > 0 ? (
            <Notice tone="warning" title={`${pluralize(result.invalidCount, 'row was', 'rows were')} not added`}>
              <ul className="acl-refused">
                {refused.map((row, index) => (
                  <li key={`${row.value}-${index}`}>
                    <span className="acl-refused__value">{row.value || 'Empty row'}</span>
                    <span className="acl-meta">{row.reason}</span>
                  </li>
                ))}
              </ul>
              {result.invalidCount > refused.length ? <p>And {formatNumber(result.invalidCount - refused.length)} more.</p> : null}
            </Notice>
          ) : null}
        </div>
      </Drawer>
    );
  }

  return (
    <Drawer
      open
      tone="accent"
      onClose={onClose}
      busy={saving}
      title="Add email addresses"
      description="People on the list can sign in with the Google account for that address, whatever its domain."
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="acl-add-form" variant="primary" loading={saving} disabled={parsed.rows.length === 0}>
            {parsed.rows.length > 1 ? `Add ${formatNumber(parsed.rows.length)} addresses` : 'Add address'}
          </Button>
        </>
      }
    >
      <form id="acl-add-form" className="acl-form" onSubmit={save} noValidate>
        <div className="acl-file">
          <Button startIcon={<UploadSimpleIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={saving}>
            Upload CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="ui-sr" tabIndex={-1} aria-hidden="true" onChange={handleFile} />
          <span className="acl-meta">{fileName || 'Or type or paste below'}</span>
        </div>

        <TextField
          id="acl-emails"
          label="Email addresses"
          multiline
          rows={9}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setError('');
          }}
          placeholder={'student@gmail.com\nteacher@school.edu, teacher, Maths'}
          hint="One address per line. In a CSV the columns are email, role (student or teacher) and an optional note."
          error={error}
          disabled={saving}
          spellCheck={false}
          autoComplete="off"
          data-autofocus
        />

        <SelectField
          label="Add as"
          value={defaultRole}
          onChange={(event) => setDefaultRole(event.target.value)}
          options={ROLE_OPTIONS}
          hint="Used for every address that does not name a role. A teacher gets staff access on their first sign-in."
          disabled={saving}
        />

        <p className="acl-count" role="status" aria-live="polite">
          {summary}
        </p>
        {parsed.invalid.length > 0 ? (
          <p className="acl-meta">
            Not valid, so they will be skipped: {parsed.invalid.slice(0, 5).join(', ')}
            {parsed.invalid.length > 5 ? ` and ${parsed.invalid.length - 5} more` : ''}
          </p>
        ) : null}

        <Notice tone="info">People fill in their own roll number, department, graduating year and college when they first sign in.</Notice>
      </form>
    </Drawer>
  );
}
