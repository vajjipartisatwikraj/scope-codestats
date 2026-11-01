import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';

/**
 * The "this reaches other cohorts" step in front of every change to shared content. The server has
 * already said which cohorts the change would reach (a preview); `run` shows them and waits.
 *
 *   run(info, perform)   resolves with what `perform` returned when the staff member proceeded and it
 *                        worked, or null when they cancelled or it failed (the failure is toasted).
 *     info.action        the kind of change (model/staffContent.sharedActionInfo)
 *     info.affectedCohorts, info.details
 *     info.failMessage   the toast when `perform` throws without a message from the server
 *     info.onError(error)   replaces that toast (the bulk upload describes each bad question)
 *
 * Returns { run, dialog } where `dialog` is what SharedContentDialog takes ({ request, onProceed,
 * onCancel }). While `perform` runs the dialog stays open and shows that it is working.
 */
export default function useSharedConfirm() {
  const [request, setRequest] = useState(null);

  const run = useCallback((info, perform) => new Promise((resolve) => setRequest({ ...info, perform, resolve, busy: false })), []);

  const onProceed = useCallback(async () => {
    if (!request || request.busy) return;
    setRequest({ ...request, busy: true });
    let value = null;
    try {
      value = (await request.perform()) ?? true;
    } catch (error) {
      if (request.onError) request.onError(error);
      else toast.error(error.response?.data?.message || request.failMessage || 'The change failed');
    }
    setRequest(null);
    request.resolve(value);
  }, [request]);

  const onCancel = useCallback(() => {
    if (!request || request.busy) return;
    setRequest(null);
    request.resolve(null);
  }, [request]);

  return { run, dialog: { request, onProceed, onCancel } };
}
