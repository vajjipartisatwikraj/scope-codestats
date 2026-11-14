import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, mentorshipApi } from '../../../services/mentorshipApi';
import { Button, ConfirmDialog, Dialog } from '../../ui';

/**
 * Deleting a mentorship, from the card menu. A dialog that names the mentorship and the consequence.
 * A mentorship that still has students cannot be deleted: the server answers 409 and the dialog
 * says to remove the students from every mentor first.
 *
 *   mentorship     the mentorship being deleted, or null when nothing is
 *   onClose()      the dialog was dismissed
 *   onDeleted()    the mentorship was deleted (the dialog has closed)
 */
export default function DeleteMentorshipDialog({ mentorship, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState('');

  useEffect(() => {
    setBlocked('');
  }, [mentorship]);

  const close = () => {
    if (busy) return;
    setBlocked('');
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await mentorshipApi.remove(mentorship._id);
      toast.success(`Mentorship "${mentorship.name}" deleted`);
      setBlocked('');
      onClose();
      onDeleted();
    } catch (failure) {
      const message = apiErrorMessage(failure, 'Could not delete the mentorship');
      if (failure?.response?.data?.reason === 'has_students') {
        setBlocked(message);
      } else {
        toast.error(message);
      }
    } finally {
      setBusy(false);
    }
  };

  if (mentorship && blocked) {
    return (
      <Dialog open onClose={close} size="sm" title={`${mentorship.name} still has students`} description={blocked} actions={<Button onClick={close}>Close</Button>}>
        <p className="ms-note">Open the mentorship, then each mentor, and remove their students. After that the mentorship can be deleted.</p>
      </Dialog>
    );
  }

  return (
    <ConfirmDialog
      open={Boolean(mentorship)}
      onClose={close}
      busy={busy}
      danger
      title={mentorship ? `Delete "${mentorship.name}"?` : 'Delete mentorship?'}
      description="The mentorship and its list of mentors are removed. Teachers and students keep their accounts."
      confirmLabel="Delete mentorship"
      onConfirm={confirm}
    />
  );
}
