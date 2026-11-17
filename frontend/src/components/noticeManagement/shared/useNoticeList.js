import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { apiErrorMessage } from '../../../services/noticeApi';

/**
 * The list of one kind of notice (alerts or announcements) on its management screen, and what an
 * admin does to it: create or edit, switch on or off, delete. Every action tells the admin how it
 * went with a toast and keeps the list up to date without reading it all again.
 *
 *   api      alertAdminApi or announcementAdminApi (services/noticeApi.js)
 *   noun     { one: 'alert', many: 'alerts' }: the key of the answers and the word in the messages
 *
 * Returns
 *   items, loading, failed, reload
 *   busyId             the id of the notice being switched or deleted (its menu waits), or ''
 *   save(form, id)     creates (no id) or edits; resolves true when it worked, false when the server
 *                      refused (the message is shown and the drawer stays open)
 *   toggle(item)       switch on or off
 *   remove(item)       delete; resolves true when it worked
 */
export default function useNoticeList(api, noun) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState('');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const data = await api.list();
      if (mounted.current) setItems(data[noun.many] || []);
    } catch (error) {
      if (mounted.current) {
        setFailed(true);
        toast.error(apiErrorMessage(error, `Could not load the ${noun.many}`));
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [api, noun.many]);

  useEffect(() => {
    reload();
  }, [reload]);

  const save = useCallback(
    async (form, id) => {
      try {
        if (id) await api.update(id, form);
        else await api.create(form);
        toast.success(id ? `The ${noun.one} was saved` : `The ${noun.one} was created`);
        // The server works out the status and keeps the counts, so the list is read again
        await reload();
        return true;
      } catch (error) {
        toast.error(apiErrorMessage(error, `Could not save the ${noun.one}`));
        return false;
      }
    },
    [api, noun.one, reload]
  );

  const toggle = useCallback(
    async (item) => {
      setBusyId(item._id);
      try {
        const answer = await api.setActive(item._id, !item.isActive);
        const next = answer[noun.one];
        if (mounted.current && next) setItems((list) => list.map((entry) => (entry._id === item._id ? { ...entry, ...next } : entry)));
        toast.success(item.isActive ? `The ${noun.one} is switched off` : `The ${noun.one} is switched on`);
      } catch (error) {
        toast.error(apiErrorMessage(error, `Could not change the ${noun.one}`));
      } finally {
        if (mounted.current) setBusyId('');
      }
    },
    [api, noun.one]
  );

  const remove = useCallback(
    async (item) => {
      setBusyId(item._id);
      try {
        await api.remove(item._id);
        if (mounted.current) setItems((list) => list.filter((entry) => entry._id !== item._id));
        toast.success(`The ${noun.one} was deleted`);
        return true;
      } catch (error) {
        toast.error(apiErrorMessage(error, `Could not delete the ${noun.one}`));
        return false;
      } finally {
        if (mounted.current) setBusyId('');
      }
    },
    [api, noun.one]
  );

  return { items, loading, failed, reload, busyId, save, toggle, remove };
}
