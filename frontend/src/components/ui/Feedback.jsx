import React from 'react';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { InfoIcon } from '@phosphor-icons/react/dist/csr/Info';
import { TrayIcon } from '@phosphor-icons/react/dist/csr/Tray';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { XCircleIcon } from '@phosphor-icons/react/dist/csr/XCircle';

/**
 * EmptyState (design/screens.md section 18): a tonal mark, a title in the product's words that says
 * what is missing, one line of why, and one action.
 *
 *   icon      a Phosphor icon node (28px); a tray by default
 *   art       a node up to 120px square (an authored SVG, tonal) shown instead of the 64px mark; it
 *             is decorative (aria-hidden) and is scaled down to fit
 *   title, text, action (a node, usually a Button)
 *   compact   less padding, for a region inside a card
 */
export function EmptyState({ icon, art, title, text, action, compact = false }) {
  return (
    <div className="ui-empty" data-compact={compact ? 'true' : 'false'}>
      {art ? (
        <span className="ui-empty__art" aria-hidden="true">
          {art}
        </span>
      ) : (
        <span className="ui-empty__mark" aria-hidden="true">
          {icon || <TrayIcon size={28} weight="regular" />}
        </span>
      )}
      <h3 className="ui-empty__title">{title}</h3>
      {text ? <p className="ui-empty__text">{text}</p> : null}
      {action ? <div className="ui-empty__action">{action}</div> : null}
    </div>
  );
}

const NOTICE_ICONS = {
  info: InfoIcon,
  success: CheckCircleIcon,
  warning: WarningCircleIcon,
  danger: XCircleIcon,
};

/**
 * Notice: an inline message in a soft tint with a leading icon (never a coloured side border).
 * An error notice says what failed and offers a way to recover.
 *
 *   tone      'info' | 'success' | 'warning' | 'danger'
 *   title     optional bold first line
 *   action    a node on the right (a Retry ghost Button)
 *   children  the message: text, or richer content (a list, a link). The body is a div, so it can
 *             hold paragraphs, lists and links; links inside take the notice's colour and underline.
 */
export function Notice({ tone = 'info', title, action, children, className }) {
  const Icon = NOTICE_ICONS[tone] || InfoIcon;
  return (
    <div className={className ? `ui-notice ${className}` : 'ui-notice'} data-tone={tone} role={tone === 'danger' ? 'alert' : 'status'}>
      <Icon size={20} weight="fill" aria-hidden="true" className="ui-notice__icon" />
      <div className="ui-notice__text">
        {title ? <p className="ui-notice__title">{title}</p> : null}
        <div className="ui-notice__body">{children}</div>
      </div>
      {action ? <div className="ui-notice__action">{action}</div> : null}
    </div>
  );
}

/**
 * A block in the raised tone that pulses for 1.4s: skeletons are shaped like the content they stand
 * in for. The pulse is a flat colour change between the raised and high roles (DESIGN.md forbids
 * gradient fills on surfaces), with no opacity change, and it is off under reduced motion.
 */
export function Skeleton({ width = '100%', height = 16, radius, className, style }) {
  return (
    <span
      className={className ? `ui-skeleton ${className}` : 'ui-skeleton'}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

/** `count` skeleton lines of table-row height, for a list that is loading */
export function SkeletonRows({ count = 6, height = 56 }) {
  return (
    <div className="ui-skeleton-rows" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={height} radius="var(--ds-radius-md)" />
      ))}
    </div>
  );
}
