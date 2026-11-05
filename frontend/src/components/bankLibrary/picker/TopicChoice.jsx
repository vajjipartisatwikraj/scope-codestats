import React, { useState } from 'react';
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import { Button, Dialog } from '../../ui';
import { countOf } from '../model/bankLibrary';
import BankPicker from './BankPicker';
import './picker.css';

/**
 * TopicChoice: the optional "start from a library topic" field of the add module form. It shows the
 * topic chosen (and how many questions come with it), or a button to choose one in the picker. The
 * form reads the topic's details into its own fields; the questions are imported once the module
 * exists.
 *
 *   value     null, or the picker's choice { bankId, bankName, topicId, topicName, questionCount }
 *   onChange(value)
 *   disabled
 *   loading   the topic's details are being read into the form
 */
export default function TopicChoice({ value, onChange, disabled = false, loading = false }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(null);

  const close = () => {
    setOpen(false);
    setPending(null);
  };

  const use = () => {
    onChange(pending);
    close();
  };

  return (
    <>
      {value ? (
        <div className="blp-chosen">
          <div className="blp-chosen__text">
            <p className="blp-chosen__title">{value.topicName}</p>
            <p className="blp-chosen__meta">{`${value.bankName} \u00b7 ${countOf(value.questionCount, 'question')} will be imported`}</p>
          </div>
          <div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={disabled || loading}>
              Change
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled || loading}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button startIcon={<BooksIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => setOpen(true)} disabled={disabled} loading={loading}>
            Choose a topic from the bank library
          </Button>
        </div>
      )}

      {open ? (
        <Dialog
          open
          onClose={close}
          size="lg"
          title="Choose a topic"
          description="Its name, description, video and notes fill the module, and its questions are imported into it."
          actions={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={use} disabled={!pending}>
                {pending ? `Use ${pending.topicName}` : 'Use this topic'}
              </Button>
            </>
          }
        >
          <BankPicker mode="topic" onChange={setPending} />
        </Dialog>
      ) : null}
    </>
  );
}
