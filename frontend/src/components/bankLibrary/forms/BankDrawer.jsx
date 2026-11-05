import React, { useState } from 'react';
import { Button, Drawer, SelectField, TextField } from '../../ui';
import { BANK_STATUSES, bankFormFrom, bankPayload, emptyBankForm, validateBank } from '../model/bankLibrary';

const FORM_ID = 'bank-form';

/**
 * The drawer that creates or edits a bank: its name, what it is for, who can use it, and tags that
 * help find it. A draft bank is for administrators only; a published one can be imported by teachers.
 * Mount it when it should open and unmount it when it closes.
 *
 *   bank      the bank to edit; null to create one
 *   saving    a save is running
 *   onClose(), onSave(payload)   onSave gets the form as the API wants it, once it passes its checks
 */
export default function BankDrawer({ bank, saving, onClose, onSave }) {
  const editing = Boolean(bank);
  const [form, setForm] = useState(() => (bank ? bankFormFrom(bank) : emptyBankForm()));
  const [errors, setErrors] = useState({});

  const text = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateBank(form);
    setErrors(found);
    if (found.name) {
      const node = document.getElementById('bank-name');
      if (node) node.focus();
      return;
    }
    onSave(bankPayload(form));
  };

  return (
    <Drawer
      open
      onClose={onClose}
      busy={saving}
      title={editing ? 'Edit bank' : 'Create bank'}
      description={editing ? bank.name : 'A bank holds topics, and topics hold questions. Start as a draft and publish it when it is ready.'}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form={FORM_ID} loading={saving}>
            {editing ? 'Save bank' : 'Create bank'}
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="bl-form" onSubmit={submit} noValidate>
        <TextField id="bank-name" label="Name" required value={form.name} onChange={text('name')} error={errors.name} maxLength={120} />
        <TextField id="bank-description" label="Description" multiline rows={3} value={form.description} onChange={text('description')} maxLength={1000} />
        <SelectField
          id="bank-status"
          label="Status"
          hint={form.status === 'published' ? 'Teachers can find this bank and import from it' : 'Only administrators can see this bank'}
          value={form.status}
          onChange={text('status')}
          options={BANK_STATUSES.map((entry) => ({ value: entry.key, label: entry.label }))}
        />
        <TextField id="bank-tags" label="Tags" hint="Separate them with commas, for example arrays, interview" value={form.tags} onChange={text('tags')} />
      </form>
    </Drawer>
  );
}
