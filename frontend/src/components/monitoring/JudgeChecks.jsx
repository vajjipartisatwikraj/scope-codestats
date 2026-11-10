import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { FlaskIcon } from '@phosphor-icons/react/dist/csr/Flask';
import { Badge } from '../ui';

/** The state of one service of the judge: ready, still loading or down, or running as a placeholder. */
function CheckBadge({ ready, mocked }) {
  if (!ready) {
    return (
      <Badge tone="warning" icon={<ClockIcon size={14} weight="bold" aria-hidden="true" />}>
        Not ready
      </Badge>
    );
  }
  if (mocked) {
    return (
      <Badge tone="info" icon={<FlaskIcon size={14} weight="bold" aria-hidden="true" />}>
        Placeholder
      </Badge>
    );
  }
  return (
    <Badge tone="success" icon={<CheckCircleIcon size={14} weight="fill" aria-hidden="true" />}>
      Ready
    </Badge>
  );
}

/**
 * The judge's readiness checks in one row at the top of the tab: speech to text, pronunciation, AI
 * feedback and acoustic analysis, each with its state as an icon and a word. The row wraps onto
 * more lines on a narrow screen.
 *
 *   judge   { ready, services: [{ key, label, ready }], mocked: [] } from the judge's /ready, or null
 */
export default function JudgeChecks({ judge }) {
  if (!judge) return null;
  return (
    <ul className="mon-checks" aria-label="Speech judge checks">
      {judge.services.map((service) => (
        <li key={service.key} className="mon-check">
          <span className="mon-check__name">{service.label}</span>
          <CheckBadge ready={service.ready} mocked={judge.mocked.includes(service.key)} />
        </li>
      ))}
    </ul>
  );
}
