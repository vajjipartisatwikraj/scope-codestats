import React, { useState } from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { CalendarCheckIcon } from '@phosphor-icons/react/dist/csr/CalendarCheck';
import { CalendarXIcon } from '@phosphor-icons/react/dist/csr/CalendarX';
import { HourglassIcon } from '@phosphor-icons/react/dist/csr/Hourglass';
import { Badge, Button, DetailPanel, formatDate } from '../ui';
import { DeadlineBadge, Place } from './OpportunityRow';
import TypeChip from './TypeChip';
import { deadlineOf, safeUrl, statusOf } from './opportunitiesModel';

const STATUS = {
  upcoming: { label: 'Upcoming', tone: 'info', Icon: HourglassIcon },
  ongoing: { label: 'Ongoing', tone: 'success', Icon: CalendarCheckIcon },
  completed: { label: 'Completed', tone: 'neutral', Icon: CalendarXIcon },
};

/** The picture of an opportunity; it leaves quietly if it will not load */
function Picture({ src }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <div className="ui-thumb">
      <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
    </div>
  );
}

/** What the opportunity asks of an applicant, when it says anything */
function eligibilityOf(opportunity) {
  const rules = opportunity.eligibility || {};
  const items = [];
  const departments = Array.isArray(rules.departments) ? rules.departments.filter(Boolean) : [];
  if (departments.length > 0) items.push(departments.includes('ALL') ? 'Open to all departments' : `Departments: ${departments.join(', ')}`);
  if (typeof rules.minimumCGPA === 'number' && rules.minimumCGPA > 0) items.push(`Minimum CGPA: ${rules.minimumCGPA}`);
  if (Array.isArray(rules.otherRequirements)) rules.otherRequirements.filter(Boolean).forEach((line) => items.push(line));
  return items;
}

/**
 * The detail panel of an opportunity (the app's DetailPanel from ../ui): the picture, type, status
 * and deadline, the facts, the full description in Read mode, who can apply, the tags and the
 * Apply link.
 *
 *   opportunity   the selected one, or null while the panel is closed
 *   onClose
 */
export default function OpportunityDrawer({ opportunity, onClose }) {
  const href = opportunity ? safeUrl(opportunity.link) : null;
  const profile = opportunity ? safeUrl(opportunity.organizerProfileUrl) : null;
  const status = opportunity ? STATUS[statusOf(opportunity)] : null;
  const deadline = opportunity ? deadlineOf(opportunity) : null;
  const eligibility = opportunity ? eligibilityOf(opportunity) : [];
  const StatusIcon = status ? status.Icon : null;

  return (
    <DetailPanel
      open={Boolean(opportunity)}
      onClose={onClose}
      title={opportunity?.title}
      subtitle={opportunity?.organizer}
      media={opportunity ? <Picture src={opportunity.image} /> : null}
      badges={
        opportunity ? (
          <>
            <TypeChip category={opportunity.category} />
            <Badge tone={status.tone} icon={<StatusIcon size={14} weight="regular" aria-hidden="true" />}>
              {status.label}
            </Badge>
            <DeadlineBadge opportunity={opportunity} />
          </>
        ) : null
      }
      facts={
        opportunity
          ? [
              { label: 'Deadline', value: deadline.date ? formatDate(deadline.date) : deadline.written || 'Not stated' },
              { label: 'Location', value: <Place location={opportunity.location} /> },
              { label: 'Prize', value: opportunity.prize },
              {
                label: 'Organiser',
                value: opportunity.organizer ? (
                  profile ? (
                    <a className="ui-link" href={profile} target="_blank" rel="noopener noreferrer">
                      {opportunity.organizer}
                    </a>
                  ) : (
                    opportunity.organizer
                  )
                ) : null,
              },
            ]
          : []
      }
      sections={[
        { key: 'about', title: 'About this opportunity', content: opportunity?.description ? <p className="opp-detail__text">{opportunity.description}</p> : null },
        {
          key: 'eligibility',
          title: 'Who can apply',
          content:
            eligibility.length > 0 ? (
              <ul className="ui-detail__list">
                {eligibility.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null,
        },
      ]}
      tags={opportunity && Array.isArray(opportunity.tags) ? opportunity.tags : []}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {href ? (
            <Button
              as="a"
              variant="primary"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<ArrowUpRightIcon size={18} weight="regular" aria-hidden="true" />}
              aria-label={`Apply: ${opportunity.title} (opens in a new tab)`}
            >
              Apply
            </Button>
          ) : null}
        </>
      }
    />
  );
}
