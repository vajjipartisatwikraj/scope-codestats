import React from 'react';
import { BellIcon } from '@phosphor-icons/react/dist/csr/Bell';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { UsersIcon } from '@phosphor-icons/react/dist/csr/Users';
import { Card, formatDateTime, pluralize } from '../ui';

/**
 * Preview: how the notification will look in a student's list (a tonal bell, the title, the
 * message, the time and the unread dot), then two plain facts under it: who gets it and when it
 * removes itself.
 *
 *   title, message   what is typed so far
 *   audience         the sentence naming who receives it ("Every student" or a name)
 *   recipients       how many people receive it, or null when it is not known
 *   deletionTime     the datetime-local value, or ''
 */
export default function NotificationPreview({ title, message, audience, recipients, deletionTime }) {
  const hasTitle = Boolean(title.trim());
  const hasMessage = Boolean(message.trim());
  const removesAt = deletionTime ? formatDateTime(deletionTime) : null;

  return (
    <Card as="aside" title="Preview" description="How it appears in a student's notifications." className="nm-preview" aria-label="Preview of the notification">
      <div className="nm-preview__item">
        <span className="nm-preview__icon" aria-hidden="true">
          <BellIcon size={20} weight="regular" />
        </span>
        <div className="nm-preview__content">
          <p className="nm-preview__title" data-empty={hasTitle ? 'false' : 'true'}>
            {hasTitle ? title : 'Your title appears here'}
          </p>
          <p className="nm-preview__message" data-empty={hasMessage ? 'false' : 'true'}>
            {hasMessage ? message : 'The message students read appears here.'}
          </p>
          <p className="nm-preview__time">just now</p>
        </div>
        <span className="nm-preview__dot" role="img" aria-label="Unread" />
      </div>

      <dl className="nm-facts">
        <div className="nm-facts__row">
          <dt>
            <UsersIcon size={18} weight="regular" aria-hidden="true" />
            <span>Goes to</span>
          </dt>
          <dd>
            {audience}
            {recipients !== null ? <span className="nm-facts__meta">{pluralize(recipients, 'person', 'people')}</span> : null}
          </dd>
        </div>
        <div className="nm-facts__row">
          <dt>
            <ClockIcon size={18} weight="regular" aria-hidden="true" />
            <span>Removes itself</span>
          </dt>
          <dd>{removesAt || 'Stays until you delete it'}</dd>
        </div>
      </dl>
    </Card>
  );
}
