import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { accessListApi, apiErrorMessage } from '../../services/accessListApi';

const EMPTY_COUNTS = { total: 0, students: 0, teachers: 0 };

/**
 * The data of the access control list page: one page of the list for the current search and role
 * filter, and the actions on it (change a role, remove, add every existing account).
 *
 *   - the search waits 300ms after the last key before it asks the server
 *   - a slow answer for an older search or page never replaces a newer one
 *   - a failed action shows a toast and leaves the list as it was
 *
 * Returns { query, setQuery, role, setRole, page, setPage, pageSize, setPageSize, filtering,
 *           clearFilters, data, loading, error, reload, changeRole, remove, importExisting }
 *   data   { entries, total, counts, loginMode }
 */
export default function useAccessList() {
  const [query, setQueryState] = useState('');
  const [search, setSearch] = useState('');
  const [role, setRoleState] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [data, setData] = useState({ entries: [], total: 0, counts: EMPTY_COUNTS, loginMode: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const latest = useRef(0);

  // The server is asked once the person stops typing
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError('');
    try {
      const result = await accessListApi.list({ search, role, page, pageSize });
      if (id !== latest.current) return;
      setData({
        entries: result.entries || [],
        total: result.total || 0,
        counts: result.counts || EMPTY_COUNTS,
        loginMode: result.loginMode || null,
      });
    } catch (failure) {
      if (id !== latest.current) return;
      const message = apiErrorMessage(failure, 'Could not load the access list');
      setError(message);
      toast.error(message);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [search, role, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // A page past the end (after removing the last rows of it) goes back to the last real page
  useEffect(() => {
    const pages = Math.max(1, Math.ceil(data.total / pageSize));
    if (!loading && page > pages) setPage(pages);
  }, [data.total, pageSize, page, loading]);

  const setQuery = (value) => setQueryState(value);
  const setRole = (value) => {
    setRoleState(value);
    setPage(1);
  };
  const setPageSize = (value) => {
    setPageSizeState(value);
    setPage(1);
  };
  const clearFilters = () => {
    setQueryState('');
    setSearch('');
    setRoleState('all');
    setPage(1);
  };

  /** Resolves true when the role was saved */
  const changeRole = useCallback(
    async (entry, newRole) => {
      try {
        await accessListApi.setRole(entry._id, newRole);
        toast.success(newRole === 'teacher' ? `${entry.email} is now listed as a teacher` : `${entry.email} is now listed as a student`);
        await load();
        return true;
      } catch (failure) {
        toast.error(apiErrorMessage(failure, 'Could not change the role'));
        return false;
      }
    },
    [load]
  );

  /** Resolves true when the addresses were removed */
  const remove = useCallback(
    async (entries) => {
      try {
        const result = await accessListApi.remove(entries.map((entry) => entry._id));
        toast.success(result.removed === 1 ? 'Removed from the list' : `${result.removed} addresses removed from the list`);
        await load();
        return true;
      } catch (failure) {
        toast.error(apiErrorMessage(failure, 'Could not remove from the list'));
        return false;
      }
    },
    [load]
  );

  /** Resolves with { added, alreadyListed } or null when it failed */
  const importExisting = useCallback(async () => {
    try {
      const result = await accessListApi.importExisting();
      toast.success(result.added === 0 ? 'Every existing account is already on the list' : `${result.added} existing accounts added to the list`);
      await load();
      return result;
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not add the existing accounts'));
      return null;
    }
  }, [load]);

  const filtering = Boolean(query.trim()) || role !== 'all';

  return { query, setQuery, role, setRole, page, setPage, pageSize, setPageSize, filtering, clearFilters, data, loading, error, reload: load, changeRole, remove, importExisting };
}
