import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/csr/WifiSlash';
import { Button, Card, EmptyState, Page, Skeleton } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import './profilePage.css';
import ProfileManage from './manage/ProfileManage';
import SetupWizard from './setup/SetupWizard';
import useProfileData from './useProfileData';

/** The layout of the page in grey blocks while the profile loads */
function ProfileSkeleton() {
  return (
    <div className="pf-grid" role="status" aria-label="Loading your profile">
      <div className="pf-hero">
        <Skeleton height={250} radius="var(--ds-radius-xl)" />
      </div>
      <div className="pf-main-col">
        <Skeleton height={260} radius="var(--ds-radius-xl)" />
        <Skeleton height={320} radius="var(--ds-radius-xl)" />
      </div>
      <div className="pf-aside">
        <Skeleton height={220} radius="var(--ds-radius-xl)" />
        <Skeleton height={180} radius="var(--ds-radius-xl)" />
      </div>
    </div>
  );
}

/** The tab title says where you are while the profile page is open */
function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/**
 * Your profile (route /profile): the student's own page, where they set up and keep up what the rest
 * of the app and their public profile show.
 *
 * It has two faces:
 *   - A student who has not finished setting up gets the SetupWizard: four short steps, two required.
 *     This is where PrivateRoute sends them (/profile?setup=true).
 *   - Everyone else gets ProfileManage: the person and their completion at the top, the next steps,
 *     and every part of the profile as a card with its own editor.
 *
 * Reads and writes go through useProfileData; every edit opens the same drawer (SectionEditor).
 */
export default function ProfilePage() {
  const { user } = useAuth();
  const data = useProfileData();
  const setupNeeded = Boolean(user && (user.newUser === true || user.profileCompleted === false));

  useDocumentTitle(setupNeeded ? 'Set up your profile | CodeStats' : 'Your profile | CodeStats');

  let body;
  if (data.status === 'loading') {
    body = <ProfileSkeleton />;
  } else if (data.status === 'error') {
    body = (
      <Card className="pf-state">
        <EmptyState
          icon={<WifiSlashIcon size={28} aria-hidden="true" />}
          title="We could not load your profile"
          text={data.error}
          action={
            <div className="pf-state__actions">
              <Button variant="primary" onClick={data.reload}>
                Try again
              </Button>
              <Button as={Link} to="/dashboard">
                Go to dashboard
              </Button>
            </div>
          }
        />
      </Card>
    );
  } else if (setupNeeded) {
    body = <SetupWizard data={data} />;
  } else {
    body = <ProfileManage data={data} />;
  }

  return <Page className="pf">{body}</Page>;
}
