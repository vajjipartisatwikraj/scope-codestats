import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { Button, Dialog, Drawer, Notice } from '../../ui';

/** True when an errors value holds any message, however deeply (an object, an array of objects) */
export function hasErrors(errors) {
  if (!errors) return false;
  if (typeof errors === 'string') return errors.length > 0;
  if (Array.isArray(errors)) return errors.some(hasErrors);
  if (typeof errors === 'object') return Object.values(errors).some(hasErrors);
  return false;
}

/**
 * SectionEditor: the drawer every part of the profile is edited in, so they all behave alike.
 * Mount it only while it is open; it starts from `initial` each time.
 *
 *   - Save is the one primary button. It stays off until something changed (`alwaysSavable` keeps it
 *     on, for adding a new item), and the footer says "Unsaved changes" while there are some.
 *   - Pressing Save checks the draft. After the first press the errors update as the student types,
 *     and the first field with a problem takes focus.
 *   - Closing with unsaved changes asks first ("Keep editing" or "Discard changes").
 *   - A failed save shows the reason at the top and keeps everything typed.
 *
 *   title, description   the drawer's heading and one line of help
 *   width                'md' (480px) | 'lg' (640px)
 *   initial              the starting draft (an object)
 *   validate(draft)      returns errors (an object; empty means fine). Optional.
 *   toPayload(draft)     the body to send. Default: the draft itself.
 *   onSave(payload)      async; throws an Error with a sentence to show
 *   onClose              called after saving, or after the student leaves
 *   saveLabel            the words on the primary button ('Save changes')
 *   alwaysSavable        the primary button is on even with no change
 *   render({ draft, set, errors, busy })   the form fields. `set(patch)` merges into the draft.
 */
export default function SectionEditor({ title, description, width = 'md', initial, validate, toPayload, onSave, onClose, saveLabel = 'Save changes', alwaysSavable = false, render }) {
  const formId = useId();
  const bodyRef = useRef(null);
  const snapshot = useRef(JSON.stringify(initial));
  const [draft, setDraft] = useState(initial);
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [asking, setAsking] = useState(false);

  const dirty = JSON.stringify(draft) !== snapshot.current;
  const errors = useMemo(() => (attempted && validate ? validate(draft) : {}), [attempted, validate, draft]);

  const set = useCallback((patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setFailure('');
  }, []);

  const requestClose = () => {
    if (busy) return;
    if (dirty) setAsking(true);
    else onClose(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setAttempted(true);
    const found = validate ? validate(draft) : {};
    if (hasErrors(found)) {
      // Wait for the errors to render, then move to the first field that has one
      window.requestAnimationFrame(() => {
        const field = bodyRef.current ? bodyRef.current.querySelector('[aria-invalid="true"]') : null;
        if (field) field.focus();
      });
      return;
    }
    setBusy(true);
    setFailure('');
    try {
      await onSave(toPayload ? toPayload(draft) : draft);
      onClose(true);
    } catch (error) {
      setFailure(error.message);
      setBusy(false);
    }
  };

  return (
    <>
      <Drawer
        open
        onClose={requestClose}
        title={title}
        description={description}
        width={width}
        busy={busy}
        footer={
          <>
            <p className="pf-editor__status" role="status">
              {dirty ? 'Unsaved changes' : ''}
            </p>
            <Button onClick={requestClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form={formId} loading={busy} disabled={!dirty && !alwaysSavable}>
              {saveLabel}
            </Button>
          </>
        }
      >
        <div ref={bodyRef} className="pf-editor">
          {failure ? (
            <Notice tone="danger" title="Your changes were not saved">
              {failure}
            </Notice>
          ) : null}
          <form id={formId} className="pf-editor__form" noValidate onSubmit={submit}>
            {render({ draft, set, errors, busy })}
          </form>
        </div>
      </Drawer>

      <Dialog
        open={asking}
        onClose={() => setAsking(false)}
        size="sm"
        title="Discard your changes?"
        description="What you changed here has not been saved. If you leave now, it will be lost."
        actions={
          <>
            <Button onClick={() => setAsking(false)}>Keep editing</Button>
            <Button variant="danger" onClick={() => onClose(false)}>
              Discard changes
            </Button>
          </>
        }
      />
    </>
  );
}
