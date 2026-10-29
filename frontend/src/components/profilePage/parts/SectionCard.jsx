import React from 'react';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { Button, Card, EmptyState } from '../../ui';

/**
 * SectionCard: one part of the profile (about, skills, education ...) as a flat card. It has one
 * way in to editing: an Edit button in the header when there is something to show, or a single Add
 * button in the empty state when there is not, so a student never has to guess where to start.
 *
 *   id            the anchor of the card (the next steps scroll to it)
 *   title         the card's heading (h2)
 *   description   one line under the heading that says what this part is for
 *   onEdit        opens the editor
 *   editLabel     the words on the header button ('Edit')
 *   extra         more header actions, shown before the Edit button
 *   empty         true when there is nothing to show yet
 *   emptyIcon     an icon node for the empty state
 *   emptyTitle, emptyText, addLabel   the words of the empty state and its button
 *   children      the content when there is something to show
 */
export default function SectionCard({ id, title, description, onEdit, editLabel = 'Edit', extra, empty = false, emptyIcon, emptyTitle, emptyText, addLabel = 'Add', children, className }) {
  return (
    <Card
      as="section"
      id={id}
      className={className ? `pf-card ${className}` : 'pf-card'}
      title={title}
      description={description}
      actions={
        <>
          {extra}
          {!empty && onEdit ? (
            <Button size="sm" startIcon={<PencilSimpleIcon size={16} aria-hidden="true" />} onClick={onEdit}>
              {editLabel}
              <span className="ui-sr"> {title.toLowerCase()}</span>
            </Button>
          ) : null}
        </>
      }
    >
      {empty ? (
        <EmptyState
          compact
          icon={emptyIcon}
          title={emptyTitle}
          text={emptyText}
          action={
            onEdit ? (
              <Button startIcon={<PlusIcon size={18} aria-hidden="true" />} onClick={onEdit}>
                {addLabel}
              </Button>
            ) : null
          }
        />
      ) : (
        children
      )}
    </Card>
  );
}
