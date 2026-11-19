import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { accountSuspensionApi, apiErrorMessage } from '../../services/accountSuspensionApi';

const SEARCH_DELAY_MS = 300;

/** What to tell the admin about the email that went with a removal: nothing when none was asked for */
const emailNote = (message, email) => {
  if (!email) return message;
  return email.status === 'sent' ? `${message}. An email was sent to the student.` : `${message}, but the email to the student could not be sent.`;
};

/** The toast of a removal: green when all went well, a warning when the removal worked and the email did not */
const announce = (message, email) => {
  if (email && email.status !== 'sent') toast.warn(`${emailNote(message, email)} See Emails history.`);
  else toast.success(emailNote(message, email));
};


/**
 * The data of the suspend accounts page: one page of accounts (searchable, with or without the
 * ones that have no coding profile), a preview of what removing one account would delete, and the
 * removal itself.
 *
 *   GET    /api/admin/suspend-accounts?search=&linkedOnly=&page=&limit=
 *   GET    /api/admin/suspend-accounts/:userId   (the preview)
 *   DELETE /api/admin/suspend-accounts/:userId
 *   DELETE /api/admin/suspend-accounts/:userId/platforms/:platform   (one platform of the account)
 *
 * The search waits for a pause in typing before asking the server. A failed load shows a toast
 * (and the page a notice with Retry); `review` and `suspend` never throw, they resolve with
 * { ok, ... } so the page decides what to show.
 */
export default function useSuspendAccounts() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [scope, setScopeState] = useState('linked'); // 'linked' | 'all'
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  // The typed text becomes the search only after a short pause
  useEffect(() => {
    const next = query.trim();
    if (next === search) return undefined;
    const timer = window.setTimeout(() => {
      setSearch(next);
      setPage(1);
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query, search]);

  const load = useCallback(async () => {
    // A slow answer for a search the admin has already changed must not replace the current list
    const id = ++latest.current;
    setLoading(true);
    setError('');
    try {
      const data = await accountSuspensionApi.list({ search, linkedOnly: scope === 'linked', page, limit: pageSize });
      if (id !== latest.current) return;
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
    } catch (failure) {
      if (id !== latest.current) return;
      const message = apiErrorMessage(failure, 'Could not load the accounts');
      setAccounts([]);
      setTotal(0);
      setError(message);
      toast.error(message);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [search, scope, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const setScope = useCallback((next) => {
    setScopeState(next);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  /** What removing this account would delete. Resolves { ok, preview }. */
  const review = useCallback(async (userId) => {
    try {
      return { ok: true, preview: await accountSuspensionApi.preview(userId) };
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not read the account'));
      return { ok: false };
    }
  }, []);

  /**
   * Remove the coding profiles and all history of an account. `notify` also emails the student.
   * Resolves { ok, message, deleted, email }.
   */
  const suspend = useCallback(
    async (account, notify = true) => {
      try {
        const result = await accountSuspensionApi.suspend(account._id, { notify });
        const message = `Coding accounts of ${account.name} removed`;
        announce(message, result.email);
        await load();
        return { ok: true, message: emailNote(message, result.email), deleted: result.deleted, email: result.email };
      } catch (failure) {
        toast.error(apiErrorMessage(failure, 'Could not remove the coding accounts'));
        // The account may be gone already; show what is true now
        if (failure?.response?.status === 404) await load();
        return { ok: false };
      }
    },
    [load]
  );
  /** Remove one linked platform of an account and its history. `notify` also emails the student. Resolves { ok, message, email }. */
  const removePlatform = useCallback(
    async (account, platform, platformName, notify = true) => {
      try {
        const result = await accountSuspensionApi.suspendPlatform(account._id, platform, { notify });
        const message = `${platformName} of ${account.name} removed`;
        announce(message, result.email);
        await load();
        return { ok: true, message: emailNote(message, result.email), email: result.email };
      } catch (failure) {
        toast.error(apiErrorMessage(failure, `Could not remove ${platformName}`));
        // The platform may be gone already; show what is true now
        if (failure?.response?.status === 404) await load();
        return { ok: false };
      }
    },
    [load]
  );

  return { query, setQuery, search, scope, setScope, page, setPage, pageSize, setPageSize, accounts, total, loading, error, load, review, suspend, removePlatform };
}
