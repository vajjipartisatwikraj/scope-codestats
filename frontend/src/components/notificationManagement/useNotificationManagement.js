import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { apiUrl } from '../../config/apiConfig';
import { fromLocalInput } from './notificationFormat';

/**
 * Everything the notification management page asks of the server, with the same endpoints, headers
 * and toasts the page has always had:
 *
 *   GET    /notifications/admin/all             the notifications (the latest 10 of each kind)
 *   GET    /notifications/admin/users           the students a notification can be sent to
 *   POST   /notifications/admin/global          send to every student
 *   POST   /notifications/admin/user/:userId    send to one student
 *   PUT    /notifications/admin/:id             change the title, message or deletion time
 *   DELETE /notifications/admin/:id             delete (a global one is deleted for everybody)
 *   POST   /notifications/cleanup               delete the expired ones now
 *
 * Only admins and teachers may open the page; anybody else is sent to the dashboard.
 *
 * @returns {{
 *   notifications: Array, users: Array, usersReady: boolean,
 *   loading: boolean, loadError: boolean, reload: () => void,
 *   saving: boolean, save: (form, editId) => Promise<boolean>,
 *   removing: boolean, remove: (id) => Promise<boolean>,
 *   cleaning: boolean, cleanup: () => Promise<void>,
 *   stats: { reachable: number|null, everyone: number, individual: number, expiring: number },
 * }}
 */
export default function useNotificationManagement() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [usersReady, setUsersReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const started = useRef(false);

  const isStaff = !user || user.userType === 'admin' || user.userType === 'teacher';

  // Additional security check: only admins and teachers can open this page
  useEffect(() => {
    if (user && user.userType !== 'admin' && user.userType !== 'teacher') navigate('/dashboard');
  }, [user, navigate]);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/notifications/admin/all`, { headers });
      setNotifications(response.data);
      setLoadError(false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to fetch notifications');
      setLoadError(true);
    }
  }, [headers]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await axios.get(`${apiUrl}/notifications/admin/users`, { headers });
      setUsers(response.data);
      setUsersReady(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [headers]);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([fetchNotifications(), fetchUsers()]).finally(() => setLoading(false));
  }, [fetchNotifications, fetchUsers]);

  // Load the notifications and the students once, when the page opens
  useEffect(() => {
    if (started.current || !isStaff) return;
    started.current = true;
    reload();
  }, [isStaff, reload]);

  /** Create (to everyone or to one student) or, with an id, update. Resolves true when it worked. */
  const save = useCallback(
    async (form, editId) => {
      const { title, message, targetType, selectedUser, deletionTime } = form;
      const data = { title: title.trim(), message: message.trim(), deletionTime: fromLocalInput(deletionTime) };

      let method = 'post';
      let endpoint;
      if (editId) {
        endpoint = `${apiUrl}/notifications/admin/${editId}`;
        method = 'put';
      } else if (targetType === 'global') {
        endpoint = `${apiUrl}/notifications/admin/global`;
      } else {
        if (!selectedUser) {
          toast.error('Please select a user');
          return false;
        }
        endpoint = `${apiUrl}/notifications/admin/user/${selectedUser}`;
      }

      setSaving(true);
      try {
        await axios({ method, url: endpoint, data, headers });
        toast.success(editId ? 'Notification updated' : 'Notification created');
        fetchNotifications();
        return true;
      } catch (error) {
        console.error('Error with notification:', error);
        toast.error('Error processing notification');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [headers, fetchNotifications]
  );

  const remove = useCallback(
    async (id) => {
      setRemoving(true);
      try {
        await axios.delete(`${apiUrl}/notifications/admin/${id}`, { headers });
        toast.success('Notification deleted');
        fetchNotifications();
        return true;
      } catch (error) {
        console.error('Error deleting notification:', error);
        toast.error('Failed to delete notification');
        return false;
      } finally {
        setRemoving(false);
      }
    },
    [headers, fetchNotifications]
  );

  const cleanup = useCallback(async () => {
    setCleaning(true);
    try {
      const response = await axios.post(`${apiUrl}/notifications/cleanup`, {}, { headers });
      toast.success(`Cleanup complete: Deleted ${response.data.deletedCount} expired notifications`);
      fetchNotifications();
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast.error('Failed to run cleanup');
    } finally {
      setCleaning(false);
    }
  }, [headers, fetchNotifications]);

  const stats = useMemo(
    () => ({
      reachable: usersReady ? users.length : null,
      everyone: notifications.filter((n) => n.type === 'global').length,
      individual: notifications.filter((n) => n.type !== 'global').length,
      expiring: notifications.filter((n) => n.deletionTime).length,
    }),
    [notifications, users, usersReady]
  );

  return { notifications, users, usersReady, loading, loadError, reload, saving, save, removing, remove, cleaning, cleanup, stats };
}
