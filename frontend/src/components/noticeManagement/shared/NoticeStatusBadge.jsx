import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { PowerIcon } from '@phosphor-icons/react/dist/csr/Power';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { Badge } from '../../ui';
import { STATUS_TONES } from './noticeFormat';

const ICONS = {
  live: <CheckCircleIcon size={14} weight="fill" aria-hidden="true" />,
  scheduled: <ClockIcon size={14} weight="regular" aria-hidden="true" />,
  ended: <TimerIcon size={14} weight="regular" aria-hidden="true" />,
  off: <PowerIcon size={14} weight="regular" aria-hidden="true" />,
};

/**
 * The status of an alert or an announcement as one badge: a word and an icon, never colour alone.
 *
 *   status   'live' | 'scheduled' | 'ended' | 'off' (the `status` the server sends)
 */
export default function NoticeStatusBadge({ status }) {
  const entry = STATUS_TONES[status] || STATUS_TONES.off;
  return (
    <Badge tone={entry.tone} icon={ICONS[status] || ICONS.off}>
      {entry.label}
    </Badge>
  );
}
