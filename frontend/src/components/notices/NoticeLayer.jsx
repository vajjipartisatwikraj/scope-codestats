import React from 'react';
import AlertBand from './AlertBand';
import AnnouncementDialog from './AnnouncementDialog';
import useActiveNotices from './useActiveNotices';

/**
 * The alerts and announcements of the app, for every signed-in user (students, teachers and admins).
 * App.jsx puts it first inside the page's column, only where the navbar and the sidebar are shown (not
 * on the code editor, the tests, the exam or the sign-in pages, which must stay calm).
 *
 * The alert is a band in the flow at the very top; the announcement is a dialog over the app. Both come
 * one at a time from useActiveNotices.
 */
export default function NoticeLayer() {
  const { alert, announcement, closeAlert, pressAlert, closeAnnouncement, pressAnnouncement } = useActiveNotices();

  return (
    <>
      {alert ? <AlertBand key={alert._id} alert={alert} onClose={closeAlert} onButton={pressAlert} /> : null}
      {announcement ? (
        <AnnouncementDialog key={announcement._id} announcement={announcement} onClose={() => closeAnnouncement(announcement)} onButton={() => pressAnnouncement(announcement)} />
      ) : null}
    </>
  );
}
