import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { noticeApi } from '../../services/noticeApi';

/**
 * The alerts and announcements this user should see now. It asks the server once when the app opens
 * for a signed-in user (the server leaves out what the user already closed, what is outside its time
 * window and what is not for them), and shows them one at a time: the newest first, the next one
 * after it is closed.
 *
 * Closing or pressing a button hides the notice at once and tells the server in the background, so
 * the click is counted and the notice does not come back after a refresh. A button opens its link:
 * a path inside the app (/cohorts) navigates, an https address opens in a new tab.
 *
 * Returns
 *   alert, announcement           the one to show of each kind, or null
 *   closeAlert(alert), pressAlert(alert)
 *   closeAnnouncement(announcement), pressAnnouncement(announcement)
 */
export default function useActiveNotices() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notices, setNotices] = useState({ alerts: [], announcements: [] });

  useEffect(() => {
    if (!token) return undefined;
    let current = true;
    noticeApi
      .active()
      .then((data) => {
        if (current) setNotices({ alerts: data.alerts || [], announcements: data.announcements || [] });
      })
      .catch((error) => console.warn('Could not read the notices:', error?.message));
    return () => {
      current = false;
    };
  }, [token]);

  const hide = useCallback((kind, id) => setNotices((current) => ({ ...current, [kind]: current[kind].filter((notice) => notice._id !== id) })), []);

  const openLink = useCallback(
    (url) => {
      if (!url) return;
      if (url.startsWith('/')) navigate(url);
      else window.open(url, '_blank', 'noopener,noreferrer');
    },
    [navigate]
  );

  // The server call is not awaited: the notice is already gone, and a failed call only means it may show again next time
  const tell = (request) => request.catch((error) => console.warn('Could not record the notice:', error?.message));

  const closeAlert = useCallback((alert) => {
    hide('alerts', alert._id);
    tell(noticeApi.closeAlert(alert._id));
  }, [hide]);

  const pressAlert = useCallback(
    (alert) => {
      hide('alerts', alert._id);
      tell(noticeApi.clickAlert(alert._id));
      openLink(alert.buttonUrl);
    },
    [hide, openLink]
  );

  const closeAnnouncement = useCallback((announcement) => {
    hide('announcements', announcement._id);
    tell(noticeApi.closeAnnouncement(announcement._id));
  }, [hide]);

  const pressAnnouncement = useCallback(
    (announcement) => {
      hide('announcements', announcement._id);
      tell(noticeApi.clickAnnouncement(announcement._id));
      openLink(announcement.buttonUrl);
    },
    [hide, openLink]
  );

  return {
    alert: notices.alerts[0] || null,
    announcement: notices.announcements[0] || null,
    closeAlert,
    pressAlert,
    closeAnnouncement,
    pressAnnouncement,
  };
}
