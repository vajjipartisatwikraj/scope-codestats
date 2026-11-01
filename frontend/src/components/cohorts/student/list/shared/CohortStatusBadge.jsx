import React from 'react';
import { BroadcastIcon } from '@phosphor-icons/react/dist/csr/Broadcast';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CircleIcon } from '@phosphor-icons/react/dist/csr/Circle';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { LockIcon } from '@phosphor-icons/react/dist/csr/Lock';
import { PlayCircleIcon } from '@phosphor-icons/react/dist/csr/PlayCircle';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { Badge } from '../../../../ui';

const ICONS = {
  check: CheckCircleIcon,
  circle: CircleIcon,
  clock: ClockIcon,
  live: BroadcastIcon,
  lock: LockIcon,
  progress: PlayCircleIcon,
  warning: WarningCircleIcon,
};

/**
 * The status of a cohort as a badge: a word, an icon and a soft tint, so it never relies on colour
 * alone. Used by the card and by the detail panel (and, later, the cohort page itself).
 *
 *   status   what cohortStatus(cohort) answers: { label, tone, icon }
 */
export default function CohortStatusBadge({ status, className }) {
  const Icon = ICONS[status.icon] || CircleIcon;
  return (
    <Badge tone={status.tone} className={className} icon={<Icon size={14} weight="fill" aria-hidden="true" />}>
      {status.label}
    </Badge>
  );
}
