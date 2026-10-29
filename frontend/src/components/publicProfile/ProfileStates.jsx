import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClockCountdownIcon } from '@phosphor-icons/react/dist/csr/ClockCountdown';
import { HouseIcon } from '@phosphor-icons/react/dist/csr/House';
import { UserCircleMinusIcon } from '@phosphor-icons/react/dist/csr/UserCircleMinus';
import { WifiSlashIcon } from '@phosphor-icons/react/dist/csr/WifiSlash';
import { Button, Card, EmptyState, Skeleton } from '../ui';

/** The layout of the page in grey blocks while the profile loads */
export function ProfileSkeleton() {
  return (
    <div className="pp-grid" role="status" aria-label="Loading the profile">
      <div className="pp-hero pp-hero--skeleton">
        <Skeleton height={200} radius="var(--ds-radius-xl)" />
      </div>
      <div className="pp-score-slot">
        <Skeleton height={200} radius="var(--ds-radius-xl)" />
      </div>
      <div className="pp-tiles">
        {[0, 1, 2, 3].map((key) => (
          <Skeleton key={key} height={150} radius="var(--ds-radius-xl)" />
        ))}
      </div>
      <div className="pp-main-col">
        <Skeleton height={260} radius="var(--ds-radius-xl)" />
        <Skeleton height={320} radius="var(--ds-radius-xl)" />
      </div>
      <div className="pp-aside">
        <Skeleton height={180} radius="var(--ds-radius-xl)" />
        <Skeleton height={240} radius="var(--ds-radius-xl)" />
      </div>
    </div>
  );
}

/** Whole seconds left until a time, counting down once a second */
function useSecondsLeft(until) {
  const left = () => Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const [seconds, setSeconds] = useState(left);

  useEffect(() => {
    setSeconds(left());
    const timer = window.setInterval(() => setSeconds(left()), 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  return seconds;
}

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A full-width message in the middle of the page, with the way out */
function Notice({ icon, title, text, children }) {
  return (
    <div className="pp-state">
      <Card className="pp-state__card">
        <EmptyState icon={icon} title={title} text={text} action={<div className="pp-state__actions">{children}</div>} />
      </Card>
    </div>
  );
}

const HomeLink = () => (
  <Button as={Link} to="/" startIcon={<HouseIcon size={18} aria-hidden="true" />}>
    Go to home
  </Button>
);

/** No student has this profile name */
export function ProfileNotFound({ message }) {
  return (
    <Notice icon={<UserCircleMinusIcon size={28} aria-hidden="true" />} title="Profile not found" text={message || 'We could not find a student with this profile name.'}>
      <HomeLink />
    </Notice>
  );
}

/** The server blocked this network for a minute. The page waits it out and does not ask again before. */
export function ProfileRateLimited({ retryAt, onRetry }) {
  const seconds = useSecondsLeft(retryAt);
  return (
    <Notice
      icon={<ClockCountdownIcon size={28} aria-hidden="true" />}
      title="Too many requests"
      text={
        seconds > 0
          ? 'Profiles can be opened only a couple of times each second. This network is paused for a minute, then you can try again.'
          : 'The pause is over. You can open the profile now.'
      }
    >
      <p className="pp-state__timer" role="timer" aria-live="off">
        {seconds > 0 ? `Try again in ${clock(seconds)}` : 'Ready'}
      </p>
      <Button variant="primary" onClick={onRetry} disabled={seconds > 0}>
        Try again
      </Button>
      <HomeLink />
    </Notice>
  );
}

/** The request failed for some other reason (offline, server down) */
export function ProfileError({ message, onRetry }) {
  return (
    <Notice icon={<WifiSlashIcon size={28} aria-hidden="true" />} title="Could not load this profile" text={message}>
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
      <HomeLink />
    </Notice>
  );
}
