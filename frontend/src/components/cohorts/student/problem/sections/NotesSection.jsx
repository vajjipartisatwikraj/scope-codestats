import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FloppyDiskIcon } from '@phosphor-icons/react/dist/csr/FloppyDisk';
import { Button, Skeleton, TextField } from '../../../../ui';
import { useAuth } from '../../../../../contexts/AuthContext';
import SectionFrame from '../shared/SectionFrame';
import * as api from '../api/problemApi';
import { MAX_CHARACTERS, MAX_WORDS, wordCount, withinLimits } from '../model/textLimits';
import './sections.css';

/**
 * The Notes section: the student's private notes on this question, up to 500 characters and 100
 * words. Typing past a limit is ignored; Save sends the text.
 *
 *   ids        { cohortId, moduleId, questionId }
 *   embedded   inside the statement pane (a phone)
 */
export default function NotesSection({ ids, embedded }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let current = true;
    setLoading(true);
    api
      .fetchNotes(token, ids)
      .then((text) => current && setNotes(text))
      // Nothing saved yet is not an error
      .catch((error) => console.error('Error fetching notes:', error))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [token, ids.cohortId, ids.moduleId, ids.questionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!withinLimits(notes)) {
      toast.error(`Notes exceed the limit of ${MAX_WORDS} words or ${MAX_CHARACTERS} characters`);
      return;
    }
    setSaving(true);
    try {
      await api.saveNotes(token, ids, notes);
      toast.success('Notes saved successfully');
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error('Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionFrame label="Notes" lead={<h2 className="ps-pane__title">Your notes</h2>} embedded={embedded}>
      {loading ? (
        <Skeleton height={220} />
      ) : (
        <div className="ps-stack">
          <p className="ps-muted">Write down your approach or anything that helps with this problem. Only you can see it.</p>
          <TextField
            multiline
            rows={10}
            label="Notes"
            value={notes}
            placeholder="Write your notes here"
            onChange={(event) => withinLimits(event.target.value) && setNotes(event.target.value)}
            hint={`${notes.length} of ${MAX_CHARACTERS} characters, ${wordCount(notes)} of ${MAX_WORDS} words`}
          />
          <div className="ps-actions">
            <Button variant="primary" onClick={save} loading={saving} disabled={!withinLimits(notes)} startIcon={<FloppyDiskIcon size={18} weight="regular" aria-hidden="true" />}>
              Save notes
            </Button>
          </div>
        </div>
      )}
    </SectionFrame>
  );
}
