import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CpuIcon } from '@phosphor-icons/react/dist/csr/Cpu';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { TimerIcon } from '@phosphor-icons/react/dist/csr/Timer';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';
import { Badge } from '../../../../ui';

/**
 * Small pieces the console views share.
 */

const VERDICT_ICONS = { passed: CheckCircleIcon, failed: XCircleIcon, compile: XCircleIcon, runtime: XCircleIcon, time: TimerIcon, memory: CpuIcon };

/** A verdict as a badge: an icon, a word and a tone (never colour alone). `verdict` is { key, label, tone }. */
export function VerdictBadge({ verdict }) {
  const Icon = VERDICT_ICONS[verdict.key] || XCircleIcon;
  return (
    <Badge tone={verdict.tone} icon={<Icon size={14} weight="fill" aria-hidden="true" />}>
      {verdict.label}
    </Badge>
  );
}

/**
 * A labelled block of monospace text (an input, an expected output, what the code printed).
 *   label   the name above the block
 *   tone    'neutral' | 'success' | 'danger': tints the block (the label always says what it is)
 *   empty   shown, muted, when there is no text
 */
export function CodeBlock({ label, tone = 'neutral', empty = 'Nothing', children }) {
  const has = children !== undefined && children !== null && children !== '';
  return (
    <div className="ps-block">
      <p className="ps-block__label">{label}</p>
      <pre className="ps-block__code" data-tone={tone} data-empty={has ? 'false' : 'true'}>
        {has ? children : empty}
      </pre>
    </div>
  );
}

/** The state of work in progress: a spinner and one sentence */
export function Judging({ children }) {
  return (
    <div className="ps-judging" role="status">
      <SpinnerGapIcon size={24} weight="bold" aria-hidden="true" data-spin="true" />
      <p>{children}</p>
    </div>
  );
}

/** One figure of a result: an icon, a label and a value */
export function Figure({ icon, label, value, tone = 'neutral' }) {
  return (
    <div className="ps-figure" data-tone={tone}>
      <span className="ps-figure__icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className="ps-figure__label">{label}</p>
        <p className="ps-figure__value">{value}</p>
      </div>
    </div>
  );
}
