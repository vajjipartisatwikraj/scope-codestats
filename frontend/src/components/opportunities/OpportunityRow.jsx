import React from 'react';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/csr/CalendarCheck';
import { CalendarXIcon } from '@phosphor-icons/react/dist/csr/CalendarX';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe';
import { MapPinIcon } from '@phosphor-icons/react/dist/csr/MapPin';
import { Avatar, Badge, Skeleton } from '../ui';
import TypeChip from './TypeChip';
import { deadlineOf } from './opportunitiesModel';

/** The icon that goes with a deadline badge, so the state is never colour alone */
export function DeadlineBadge({ opportunity }) {
  const deadline = deadlineOf(opportunity);
  const Icon = deadline.state === 'closed' ? CalendarXIcon : deadline.state === 'soon' ? ClockIcon : CalendarCheckIcon;
  return (
    <Badge tone={deadline.tone} icon={<Icon size={14} weight="regular" aria-hidden="true" />}>
      {deadline.label}
    </Badge>
  );
}

/** "Online" gets a globe, any other place a pin */
export function Place({ location }) {
  const place = (location || '').trim() || 'Online';
  const Icon = place.toLowerCase() === 'online' ? GlobeIcon : MapPinIcon;
  return (
    <span className="opp-place">
      <Icon size={16} weight="regular" aria-hidden="true" />
      <span className="opp-place__text">{place}</span>
    </span>
  );
}

/**
 * One opportunity as a row with only what matters at a glance: the organisation mark, the role
 * title with the organiser under it, the type and the deadline badge. Everything else (place,
 * prize, description, who can apply, the Apply link) is in the detail panel.
 *
 * The title is a button stretched over the whole row, so a click anywhere opens the detail panel
 * and the keyboard reaches it with one tab stop. Under 600px the type and deadline go on a second
 * line.
 */
export default function OpportunityRow({ opportunity, onOpen }) {
  return (
    <li className="opp-row">
      <Avatar className="opp-row__mark" name={opportunity.organizer} src={opportunity.organizerImageUrl || opportunity.organizerLogo} size={40} />

      <div className="opp-row__main">
        <h3 className="opp-row__title">
          <button type="button" className="opp-row__open" onClick={() => onOpen(opportunity._id)} aria-haspopup="dialog">
            {opportunity.title}
          </button>
        </h3>
        {opportunity.organizer ? <p className="opp-row__org">{opportunity.organizer}</p> : null}
      </div>

      <div className="opp-row__meta">
        <TypeChip category={opportunity.category} />
        <DeadlineBadge opportunity={opportunity} />
      </div>
    </li>
  );
}

/** A row-shaped placeholder */
export function OpportunityRowSkeleton() {
  return (
    <li className="opp-row" aria-hidden="true">
      <Skeleton className="opp-row__mark" width={40} height={40} radius="50%" />
      <div className="opp-row__main">
        <Skeleton width="62%" height={20} />
        <Skeleton width="34%" height={14} style={{ marginTop: 6 }} />
      </div>
      <div className="opp-row__meta">
        <Skeleton width={112} height={32} radius="var(--ds-radius-pill)" />
        <Skeleton width={136} height={24} radius="var(--ds-radius-pill)" />
      </div>
    </li>
  );
}
