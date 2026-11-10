import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { Badge } from '../ui';

const STATES = {
  ok: { tone: 'success', icon: <CheckCircleIcon size={14} weight="fill" aria-hidden="true" /> },
  warn: { tone: 'warning', icon: <WarningIcon size={14} weight="fill" aria-hidden="true" /> },
  bad: { tone: 'danger', icon: <XCircleIcon size={14} weight="fill" aria-hidden="true" /> },
  info: { tone: 'neutral', icon: <InfoIcon size={14} weight="fill" aria-hidden="true" /> },
};

/**
 * A row of health checks: a name and its state as an icon and a word, so the state is never colour
 * alone. The row wraps onto more lines on a narrow screen.
 *
 *   items   [{ key, label, state: 'ok' | 'warn' | 'bad' | 'info', text }]
 *   label   the accessible name of the row
 */
export default function ChecksRow({ items, label }) {
  return (
    <ul className="mon-checks" aria-label={label}>
      {items.map((item) => {
        const state = STATES[item.state] || STATES.info;
        return (
          <li key={item.key} className="mon-check">
            <span className="mon-check__name">{item.label}</span>
            <Badge tone={state.tone} icon={state.icon}>
              {item.text}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
