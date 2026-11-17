import React from 'react';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/csr/Megaphone';
import { announcementAdminApi } from '../../../services/noticeApi';
import NoticeListPage from '../shared/NoticeListPage';
import { plainTextOf } from '../shared/noticeFormat';
import AnnouncementFormDrawer from './AnnouncementFormDrawer';
import AnnouncementListCard from './AnnouncementListCard';

const NOUN = { one: 'announcement', many: 'announcements' };

const EMPTY = {
  icon: <MegaphoneIcon size={28} weight="regular" />,
  title: 'No announcements yet',
  text: 'An announcement opens as a card after sign-in. Create one for news people should read once.',
};

const searchTextOf = (announcement) => `${announcement.title} ${plainTextOf(announcement.description)}`;

const confirmDelete = (announcement) => ({
  title: `Delete \u201c${announcement.title}\u201d?`,
  description: 'It stops showing and its click counts are lost. To keep the counts, switch it off instead.',
});

/**
 * Announcement management (route /admin/announcements, admins only): the announcements that open as a
 * card after sign-in. Each has a title, a rich text description, a picture, an audience, a start and
 * an end time, an optional button, and counts of how many people closed it and pressed the button.
 * All of the screen is NoticeListPage; this file says what is different about announcements.
 * design/screens.md section 16.
 */
export default function AnnouncementManagement() {
  return (
    <NoticeListPage
      api={announcementAdminApi}
      noun={NOUN}
      title="Announcements"
      description="News that opens as a card after sign-in."
      createLabel="Create announcement"
      searchLabel="Search announcements by title or text"
      searchTextOf={searchTextOf}
      empty={EMPTY}
      Card={AnnouncementListCard}
      FormDrawer={AnnouncementFormDrawer}
      confirmDelete={confirmDelete}
    />
  );
}
