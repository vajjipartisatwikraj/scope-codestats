import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage, emailHistoryApi } from '../../services/emailHistoryApi';

const SEARCH_DELAY_MS = 300;

/**
 * The data of the Emails history page: one page of emails (searchable, filtered by status and type),
 * the status figures, and one email with its body for the detail panel.
 *
 *   GET /api/admin/emails-history?status=&type=&search=&page=&limit=
 *   GET /api/admin/emails-history/:id
 *
 * The search waits for a pause in typing before asking the server. A failed load shows a toast (and
 * the page a notice with Retry); `open` never throws, it resolves { ok, email }.
 */
export default function useEmailsHistory() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatusState] = useState('all');
  const [type, setTypeState] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(25);
  const [emails, setEmails] = useState([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ sent: 0, failed: 0, sending: 0 });
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
      const data = await emailHistoryApi.list({ status, type, search, page, limit: pageSize });
      if (id !== latest.current) return;
      setEmails(data.emails || []);
      setTotal(data.total || 0);
      setTotals(data.totals || { sent: 0, failed: 0, sending: 0 });
    } catch (failure) {
      if (id !== latest.current) return;
      const message = apiErrorMessage(failure, 'Could not load the emails');
      setEmails([]);
      setTotal(0);
      setError(message);
      toast.error(message);
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, [status, type, search, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = useCallback((next) => {
    setStatusState(next);
    setPage(1);
  }, []);
  const setType = useCallback((next) => {
    setTypeState(next);
    setPage(1);
  }, []);
  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  /** One email with its body. Resolves { ok, email }. */
  const open = useCallback(async (id) => {
    try {
      return { ok: true, email: await emailHistoryApi.get(id) };
    } catch (failure) {
      toast.error(apiErrorMessage(failure, 'Could not open the email'));
      return { ok: false };
    }
  }, []);

  return { query, setQuery, search, status, setStatus, type, setType, page, setPage, pageSize, setPageSize, emails, total, totals, loading, error, load, open };
}
