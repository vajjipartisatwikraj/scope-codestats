import React from 'react';
import { BellRingingIcon } from '@phosphor-icons/react/dist/csr/BellRinging';
import { alertAdminApi } from '../../../services/noticeApi';
import NoticeListPage from '../shared/NoticeListPage';
import AlertFormDrawer from './AlertFormDrawer';
import AlertListCard from './AlertListCard';

const NOUN = { one: 'alert', many: 'alerts' };

const EMPTY = {
  icon: <BellRingingIcon size={28} weight="regular" />,
  title: 'No alerts yet',
  text: 'An alert is a band across the top of the app. Create one for something people must see today.',
};

const searchTextOf = (alert) => `${alert.message} ${alert.buttonText}`;

const confirmDelete = (alert) => ({
  title: 'Delete this alert?',
  description: `\u201c${alert.message.length > 80 ? `${alert.message.slice(0, 79)}\u2026` : alert.message}\u201d stops showing and its click counts are lost. To keep the counts, switch it off instead.`,
});

/**
 * Alert management (route /admin/alerts, admins only): the alerts that show as a band across the top
 * of the app. Each has a message, a start and an end time, an optional button, and counts of how many
 * people closed it and pressed the button. All of the screen is NoticeListPage; this file says what
 * is different about alerts. design/screens.md section 16.
 */
export default function AlertManagement() {
  return (
    <NoticeListPage
      api={alertAdminApi}
      noun={NOUN}
      title="Alerts"
      description="A band across the top of the app for everyone."
      createLabel="Create alert"
      searchLabel="Search alerts by message"
      searchTextOf={searchTextOf}
      empty={EMPTY}
      Card={AlertListCard}
      FormDrawer={AlertFormDrawer}
      confirmDelete={confirmDelete}
    />
  );
}
