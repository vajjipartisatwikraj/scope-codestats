import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { Badge } from '../ui';
import { formatPercent } from './monitoringModel';

/**
 * The context line of an error tile: "None" with a check when there are no errors, otherwise the
 * share of requests as a badge with a warning icon, so the state is never colour alone.
 *
 *   count, total   errors and all requests
 *   tone           'danger' (server errors) | 'warning' (client errors)
 *   noun           what the share is of: "requests" (the default), "calls", "evaluations"
 */
export default function ErrorContext({ count, total, tone, noun = 'requests' }) {
  if (!count) {
    return (
      <Badge tone="success" icon={<CheckCircleIcon size={14} weight="fill" aria-hidden="true" />}>
        None
      </Badge>
    );
  }
  return (
    <Badge tone={tone} icon={<WarningIcon size={14} weight="fill" aria-hidden="true" />}>
      {formatPercent(count, total)} of {noun}
    </Badge>
  );
}
