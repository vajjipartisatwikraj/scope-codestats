import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { accountSuspensionApi, apiErrorMessage } from '../../services/accountSuspensionApi';

const SEARCH_DELAY_MS = 300;

/**
 * The data of the suspend accounts page: one page of accounts (searchable, with or without the
 * ones that have no coding profile), a preview of what removing one account would delete, and the
 * removal itself.
 *
 *   GET    /api/admin/suspend-accounts?search=&linkedOnly=&page=&limit=
 *   GET    /api/admin/suspend-accounts/:userId   (the preview)
 *   DELETE /api/admin/suspend-accounts/:userId
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

  /** Remove the coding profiles and all history of an account. Resolves { ok, message, deleted }. */
  const suspend = useCallback(
    async (account) => {
      try {
        const result = await accountSuspensionApi.suspend(account._id);
        const message = `Coding accounts of ${account.name} removed`;
        toast.success(message);
        await load();
        return { ok: true, message, deleted: result.deleted };
      } catch (failure) {
        toast.error(apiErrorMessage(failure, 'Could not remove the coding accounts'));
        // The account may be gone already; show what is true now
        if (failure?.response?.status === 404) await load();
        return { ok: false };
      }
    },
    [load]
  );

  return { query, setQuery, search, scope, setScope, page, setPage, pageSize, setPageSize, accounts, total, loading, error, load, review, suspend };
}
