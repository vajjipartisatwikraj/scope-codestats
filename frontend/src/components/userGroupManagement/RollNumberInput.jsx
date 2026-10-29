import React, { useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { UploadSimpleIcon } from '@phosphor-icons/react/dist/csr/UploadSimple';
import parseRollNumberCsv from '../../utils/parseRollNumberCsv';
import { Button, TextField, formatNumber, pluralize } from '../ui';

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/**
 * Roll numbers from a CSV or text file, or pasted or typed in. The text box is the single source of
 * truth: choosing a file puts its contents there, so a typo can be fixed before saving. The parsed
 * list is reported through `onChange`. To clear it, change the component's `key`.
 *
 *   onChange(rollNumbers)   the parsed, de-duplicated list, after every edit
 *   disabled                nothing can be changed (while saving)
 *   id                      id of the text area, so a failed submit can move focus to it
 *   label                   the field's label ("Roll numbers" by default)
 *   error                   an inline message for the field
 *   rows                    height of the text area
 *
 * Same parsing and limits as before: utils/parseRollNumberCsv.js, files up to 2 MB, .csv and .txt.
 */
export default function RollNumberInput({ onChange, disabled = false, id = 'ug-roll-numbers', label = 'Roll numbers', error, rows = 6 }) {
  const fileInputRef = useRef(null);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');

  const parsed = useMemo(() => parseRollNumberCsv(text), [text]);

  const update = (value) => {
    setText(value);
    onChange(parseRollNumberCsv(value).rollNumbers);
  };

  const handleFile = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error('That file is too large. Roll number lists are normally a few KB.');
      return;
    }
    try {
      update(await file.text());
      setFileName(file.name);
    } catch {
      toast.error('Could not read that file');
    }
  };

  const summary = [
    pluralize(parsed.rollNumbers.length, 'roll number'),
    parsed.duplicates > 0 ? `${formatNumber(parsed.duplicates)} ${parsed.duplicates === 1 ? 'duplicate' : 'duplicates'} ignored` : null,
    parsed.skippedHeader ? 'header row skipped' : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="ug-rolls">
      <div className="ug-rolls__file">
        <Button startIcon={<UploadSimpleIcon size={18} weight="bold" aria-hidden="true" />} onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={disabled}>
          Upload CSV
        </Button>
        <input ref={fileInputRef} type="file" accept=".csv,.txt,text/csv,text/plain" className="ui-sr" tabIndex={-1} aria-hidden="true" onChange={handleFile} />
        <span className="ug-rolls__name">{fileName || 'Or paste below: one roll number per line, or comma separated'}</span>
      </div>

      <TextField
        id={id}
        label={label}
        multiline
        rows={rows}
        value={text}
        onChange={(event) => update(event.target.value)}
        placeholder={'21A91A0501\n21A91A0502'}
        disabled={disabled}
        error={error}
        spellCheck={false}
        autoComplete="off"
        className="ug-rolls__field"
      />

      <p className="ug-rolls__count" role="status" aria-live="polite">
        {summary}
      </p>
    </div>
  );
}
