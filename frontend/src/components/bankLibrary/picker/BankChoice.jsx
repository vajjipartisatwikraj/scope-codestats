import React, { useState } from 'react';
import { BooksIcon } from '@phosphor-icons/react/dist/csr/Books';
import { Button, Dialog } from '../../ui';
import { countOf } from '../model/bankLibrary';
import BankPicker from './BankPicker';
import './picker.css';

/**
 * BankChoice: the optional "import a bank" field of the create cohort form. It shows the bank (and
 * how many topics) chosen, or a button to choose one in the picker. Nothing is imported here: the
 * form hands the choice on, and the import starts once the cohort exists.
 *
 *   value     null, or the picker's choice { bankId, bankName, topicIds, topicCount, questionCount, allTopics }
 *   onChange(value)
 *   disabled
 */
export default function BankChoice({ value, onChange, disabled = false }) {
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
            <p className="blp-chosen__title">{value.bankName}</p>
            <p className="blp-chosen__meta">{`${countOf(value.topicCount, 'topic')} become modules \u00b7 ${countOf(value.questionCount, 'question')}`}</p>
          </div>
          <div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={disabled}>
              Change
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onChange(null)} disabled={disabled}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Button startIcon={<BooksIcon size={18} weight="regular" aria-hidden="true" />} onClick={() => setOpen(true)} disabled={disabled}>
            Choose a bank
          </Button>
        </div>
      )}

      {open ? (
        <Dialog
          open
          onClose={close}
          size="lg"
          title="Choose a bank to import"
          description="Each topic you keep becomes a module of the new cohort."
          actions={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="primary" onClick={use} disabled={!pending}>
                {pending ? `Use ${pending.bankName}` : 'Use this bank'}
              </Button>
            </>
          }
        >
          <BankPicker mode="topics" onChange={setPending} />
        </Dialog>
      ) : null}
    </>
  );
}
