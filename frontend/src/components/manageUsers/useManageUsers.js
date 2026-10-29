import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { DEPARTMENTS, EMPTY_FILTERS, countRoles, filterUsers, hasFilters, roleInfo } from './manageUsersModel';

/**
 * Everything the manage users page asks of the server, with the endpoints, headers and toasts it
 * has always had:
 *
 *   GET /api/admin/manage-users      every user (name, email, roll number, role, department, ...)
 *   PUT /api/admin/change-user-type  { userId, newUserType }
 *
 * Only an admin loads anything. The filters, the page and the roles are worked out on the client.
 *
 * @returns {{
 *   users: Array, loading: boolean, error: boolean, reload: () => void,
 *   filters: object, setFilter: (name, value) => void, clearFilters: () => void, filtering: boolean,
 *   departments: string[], filtered: Array, rows: Array,
 *   page: number, setPage: (n) => void, pageSize: number, setPageSize: (n) => void,
 *   counts: object, changeRole: (person, newUserType) => Promise<boolean>, changing: boolean,
 * }}
 */
export default function useManageUsers() {
  const { token, user } = useAuth();
  const isAdmin = user?.userType === 'admin';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(10);
  const [changing, setChanging] = useState(false);
  const started = useRef(false);

  const headers = useMemo(() => ({ Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }), [token]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/manage-users', { method: 'GET', headers });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
      setError(false);
    } catch (failure) {
      console.error('Error fetching users:', failure);
      toast.error('Failed to fetch users');
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  // Load the users once, when an admin opens the page
  useEffect(() => {
    if (isAdmin && !started.current) {
      started.current = true;
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const setFilter = useCallback((name, value) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const filtered = useMemo(() => filterUsers(users, filters), [users, filters]);
  const rows = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);
  const counts = useMemo(() => countRoles(users), [users]);

  // The fixed list of departments, plus any the data has that the list does not
  const departments = useMemo(() => {
    const extra = Array.from(new Set(users.map((person) => person.department).filter(Boolean))).filter((name) => !DEPARTMENTS.includes(name));
    return [...DEPARTMENTS, ...extra.sort()];
  }, [users]);

  /** Change one person's role. Resolves true when the server accepted it. */
  const changeRole = useCallback(
    async (person, newUserType) => {
      setChanging(true);
      try {
        const response = await fetch('/api/admin/change-user-type', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ userId: person._id, newUserType }),
        });
        if (!response.ok) {
          const failure = await response.json().catch(() => ({}));
          throw new Error(failure.message || 'Failed to update user type');
        }
        setUsers((previous) => previous.map((candidate) => (candidate._id === person._id ? { ...candidate, userType: newUserType } : candidate)));
        toast.success(`Successfully changed ${person.name}'s role from ${roleInfo(person.userType).label} to ${roleInfo(newUserType).label}`);
        return true;
      } catch (failure) {
        console.error('Error updating user type:', failure);
        toast.error(failure.message || 'Failed to update user type');
        return false;
      } finally {
        setChanging(false);
      }
    },
    [headers]
  );

  return {
    users,
    loading,
    error,
    reload: fetchUsers,
    filters,
    setFilter,
    clearFilters,
    filtering: hasFilters(filters),
    departments,
    filtered,
    rows,
    page,
    setPage,
    pageSize,
    setPageSize,
    counts,
    changeRole,
    changing,
  };
}
