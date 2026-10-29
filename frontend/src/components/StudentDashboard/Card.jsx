import React from 'react';
import { Link } from 'react-router-dom';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { cx } from '../custom-components/chartUtils';

/**
 * The pieces every card of the student dashboard is made of: the card itself, its header, a
 * loading placeholder, an error notice, an empty state and the two button styles.
 *
 * A card has one of three tones:
 *   surface  the normal card
 *   ink      the dark card of the design. It carries data-theme="midnight", which scopes the
 *            Midnight colours to the card (applyTheme.js publishes them per [data-theme]), so
 *            its text, badges and charts are right in both themes without any theme code here.
 *            Its fill is chosen in StudentDashboard.css (near-black on Daylight, a lifted tone
 *            on Midnight).
 *   accent   the blue card with white text
 *
 * A card opens into a view of its own when it is given `onOpen(cardElement)`; `openLabel` names
 * the hidden keyboard button, and `openButton={false}` leaves it out for a card that has its own
 * visible button (give that button the class sd-card__expand).
 */
export default function Card({ tone = 'surface', className, children, onOpen, openLabel, openButton = true, ...rest }) {
  // A card that opens into its own view: the whole card is the target for a pointer, and a real
  // button (invisible, but reachable with the keyboard) is the target for everything else. A
  // press on a link, a button or a field inside the card does its own job instead.
  const expandable = typeof onOpen === 'function';
  const handleClick = expandable
    ? (event) => {
        if (event.defaultPrevented) return;
        if (event.target.closest && event.target.closest('a, button, input, select, textarea')) return;
        onOpen(event.currentTarget);
      }
    : undefined;

  return (
    <section
      className={cx('sd-card', `sd-card--${tone}`, expandable && 'sd-card--expandable', className)}
      data-theme={tone === 'ink' ? 'midnight' : undefined}
      onClick={handleClick}
      {...rest}
    >
      {children}
      {expandable && openButton ? (
        <button
          type="button"
          className="sd-card__open sd-visually-hidden"
          aria-label={openLabel || 'Open details'}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(event.currentTarget.closest('.sd-card'));
          }}
        />
      ) : null}
    </section>
  );
}

/** Icon tile, title, a line under it, and room for one control on the right */
export function CardHeader({ id, icon, title, subtitle, action }) {
  return (
    <header className="sd-card__header">
      {icon ? (
        <span className="sd-card__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className="sd-card__heading">
        <h2 className="sd-card__title" id={id}>
          {title}
        </h2>
        {subtitle ? <p className="sd-card__subtitle">{subtitle}</p> : null}
      </div>
      {action ? <div className="sd-card__action">{action}</div> : null}
    </header>
  );
}

/** A grey block that stands in for content that is still loading. height="fill" takes what the card leaves. */
export function Skeleton({ height = 120, label = 'Loading' }) {
  const fill = height === 'fill';
  return (
    <div
      className={cx('sd-skeleton', fill && 'sd-skeleton--fill')}
      style={fill ? undefined : { height }}
      role="status"
      aria-label={label}
    />
  );
}

const GENERIC_REASON = 'Could not load this data';

/** "We could not load your tests. Network problem. Check your connection." */
export const failureMessage = (what, reason) =>
  `We could not load ${what}.${reason && reason !== GENERIC_REASON ? ` ${reason}` : ''}`;

/** A problem inside a card: what happened, and a way to try again */
export function CardNotice({ message, onRetry }) {
  return (
    <div className="sd-notice" role="alert">
      <WarningIcon size={20} weight="regular" aria-hidden="true" />
      <p className="sd-notice__text">{message}</p>
      {onRetry ? (
        <button type="button" className="sd-btn sd-btn--secondary" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  );
}

/** Nothing to show yet: a title, one line of why, and the next useful action */
export function CardEmpty({ title, children, action }) {
  return (
    <div className="sd-empty">
      <p className="sd-empty__title">{title}</p>
      {children ? <p className="sd-empty__text">{children}</p> : null}
      {action || null}
    </div>
  );
}

/** A pill-shaped link to another screen */
export function ButtonLink({ to, tone = 'accent', icon, children, ...rest }) {
  return (
    <Link to={to} className={cx('sd-btn', `sd-btn--${tone}`)} {...rest}>
      {children}
      {icon || null}
    </Link>
  );
}
