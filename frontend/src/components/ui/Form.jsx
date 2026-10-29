import React from 'react';
import { WarningIcon } from '@phosphor-icons/react/dist/csr/Warning';
import { Card } from './Layout';

/**
 * Form layout (design/screens.md section 16, "Forms": sectioned cards, labels above fields, a
 * sticky action footer, inline validation, a danger zone card at the bottom).
 *
 * FormSection: a Card with a header and the form grid as its body. One column on a phone, two from
 * 600px. A field that needs the whole row gets the class `ui-form-grid__wide`.
 *
 *   title, description, actions   the Card header (the title is the section's h2)
 *   className                     added to the card
 *   children                      the fields (TextField, SelectField, Switch ...)
 *
 * Do not make a FormSection `flush`. The Card's flush mode clips with overflow: hidden, which also
 * clips a sticky child.
 */
export function FormSection({ title, description, actions, className, children, ...rest }) {
  return (
    <Card title={title} description={description} actions={actions} className={className ? `ui-form-section ${className}` : 'ui-form-section'} {...rest}>
      <div className="ui-form-grid">{children}</div>
    </Card>
  );
}

/**
 * StickyFooter: the action bar of a form (Cancel, Save). It sticks to the bottom edge of the
 * nearest scrolling area, or of the window, with a hairline above it, the surface fill, 16px of
 * padding and the actions right-aligned (the main one last). On a phone the buttons share the row.
 *
 *   children   the Buttons
 *   className  added to the bar
 *
 * It uses position: sticky, so it depends on its ancestors:
 *   - No ancestor between it and the scrolling area may set overflow: hidden, auto or scroll.
 *     `Card flush` clips with overflow: hidden, and that also clips (and un-sticks) a sticky child:
 *     put the StickyFooter after the cards, as the last child of the form or the page, never inside
 *     a flush Card.
 *   - It sticks within its parent: make the parent the whole form, so the bar stays in view until
 *     the form ends.
 *   - Inside a Drawer or Dialog use their own footer / actions slots instead.
 * To lift it above a fixed bottom bar, set --ui-sticky-bottom on the footer (default 0px).
 */
export function StickyFooter({ className, children }) {
  return <div className={className ? `ui-sticky-footer ${className}` : 'ui-sticky-footer'}>{children}</div>;
}

/**
 * DangerZone: the card at the bottom of a form for destructive actions ("Delete course"). A
 * danger-soft icon circle, a title in the danger colour, one sentence about the consequence, and
 * the action slot at the right (below the text on a phone). The action itself should be a
 * `variant="danger"` Button that opens a ConfirmDialog.
 *
 *   title         default "Danger zone"
 *   description   the sentence: what happens and whether it can be undone
 *   actions       the action slot; the children go there too
 *   className     added to the card
 */
export function DangerZone({ title = 'Danger zone', description, actions, className, children }) {
  return (
    <Card as="section" className={className ? `ui-danger-zone ${className}` : 'ui-danger-zone'}>
      <div className="ui-danger-zone__row">
        <span className="ui-danger-zone__mark" aria-hidden="true">
          <WarningIcon size={20} weight="fill" />
        </span>
        <div className="ui-danger-zone__text">
          <h2 className="ui-danger-zone__title">{title}</h2>
          {description ? <p className="ui-danger-zone__description">{description}</p> : null}
        </div>
        {actions || children ? (
          <div className="ui-danger-zone__actions">
            {actions}
            {children}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
