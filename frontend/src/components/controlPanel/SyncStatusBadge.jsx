import React from 'react';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowsClockwise';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ProhibitIcon } from '@phosphor-icons/react/dist/csr/Prohibit';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { Badge } from '../ui';
import { statusInfo } from './syncModel';

const ICONS = {
  running: <ArrowsClockwiseIcon size={14} weight="bold" aria-hidden="true" />,
  completed: <CheckCircleIcon size={14} weight="fill" aria-hidden="true" />,
  failed: <XCircleIcon size={14} weight="fill" aria-hidden="true" />,
  cancelled: <ProhibitIcon size={14} weight="bold" aria-hidden="true" />,
};

/** The state of a run as a word with an icon and a tint, so colour is never the only signal */
export default function SyncStatusBadge({ status }) {
  const info = statusInfo(status);
  return (
    <Badge tone={info.tone} icon={ICONS[status]}>
      {info.label}
    </Badge>
  );
}
