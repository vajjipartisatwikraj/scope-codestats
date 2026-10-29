import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import Button, { IconButton } from './Button';
import useOverlay from './useOverlay';

/**
 * Dialog (DESIGN.md, Dialogs): for a confirmation or a short form (up to four fields) that needs
 * the student's full attention. Surface, 28px radius, a scrim behind, the title in Headline.
 * Anything longer is a Drawer or a page (design/screens.md section 17).
 *
 *   open, onClose      whether it is shown, and what to do on Escape or a press on the scrim
 *   title              names the action ("Remove LeetCode username?"); the dialog is labelled by it
 *   description        one or two sentences on the consequence
 *   actions            the buttons, right-aligned, the main one last
 *   size               'sm' (440px) | 'md' (560px, default) | 'lg' (720px)
 *   busy               an action is in progress: Escape and the scrim do nothing
 *   initialFocusRef    what takes focus first (the safest action of a confirmation)
 *   as                 'div' (default) | 'form': the body and the actions are wrapped in one <form>,
 *                      so a button with type="submit" in the actions submits it and Enter in a
 *                      field works. The title stays outside the form.
 *   onSubmit           the form's submit handler (with as="form"). The default is prevented for you,
 *                      so the page never reloads; the event is passed on.
 *   children           the body
 *
 * Focus is trapped while it is open and returns to what opened it. It is drawn in a portal, so no
 * card or scrolling box can cut it off.
 */
export function Dialog({ open, onClose, title, description, actions, size = 'md', busy = false, initialFocusRef, as = 'div', onSubmit, children }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useOverlay({ open, onClose, busy, initialFocusRef });
  if (!open) return null;

  const body = (
    <>
      {children ? <div className="ui-dialog__body">{children}</div> : null}
      {actions ? <footer className="ui-dialog__actions">{actions}</footer> : null}
    </>
  );

  return createPortal(
    <div
      className="ui-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="ui-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-size={size}
        tabIndex={-1}
      >
        <header className="ui-dialog__header">
          <h2 className="ui-dialog__title" id={titleId}>
            {title}
          </h2>
          {description ? (
            <p className="ui-dialog__description" id={descriptionId}>
              {description}
            </p>
          ) : null}
        </header>
        {as === 'form' ? (
          <form
            className="ui-dialog__form"
            onSubmit={(event) => {
              event.preventDefault();
              if (onSubmit) onSubmit(event);
            }}
          >
            {body}
          </form>
        ) : (
          body
        )}
      </div>
    </div>,
    document.body
  );
}

/**
 * ConfirmDialog: a question with a Cancel and one confirming button. The confirming button repeats
 * the verb of the title ("Delete course"), and is the danger fill for a destructive action. Focus
 * starts on Cancel, the safest choice.
 *
 *   open, onClose, title, description   as Dialog
 *   confirmLabel       the verb and object ("Delete course")
 *   onConfirm          called on confirm
 *   danger             the confirming button is the danger fill
 *   busy               the confirming button shows its spinner and nothing can be pressed
 *   children           extra content between the description and the buttons
 */
export function ConfirmDialog({ open, onClose, title, description, confirmLabel, onConfirm, danger = false, busy = false, children }) {
  const cancelRef = useRef(null);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      busy={busy}
      initialFocusRef={cancelRef}
      actions={
        <>
          <Button ref={cancelRef} onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

/**
 * Drawer (design/screens.md section 17): 480px from the right (the full width below 600px) for a
 * detail, a longer form or an editing task. A header with the title and a close button, a body that
 * scrolls, and a footer for the actions that stays in view.
 *
 *   open, onClose, title, description   as Dialog
 *   footer             the actions (the main one last)
 *   busy               Escape and the scrim do nothing while true
 *   width              'md' (480px, default) | 'lg' (640px)
 *   children           the body
 */
export function Drawer({ open, onClose, title, description, footer, busy = false, width = 'md', children }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useOverlay({ open, onClose, busy });
  if (!open) return null;

  return createPortal(
    <div
      className="ui-overlay ui-overlay--drawer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className="ui-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-width={width}
        tabIndex={-1}
      >
        <header className="ui-drawer__header">
          <div className="ui-drawer__heading">
            <h2 className="ui-drawer__title" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p className="ui-drawer__description" id={descriptionId}>
                {description}
              </p>
            ) : null}
          </div>
          <IconButton label="Close" onClick={onClose} disabled={busy} data-close="true">
            <XIcon size={20} weight="regular" aria-hidden="true" />
          </IconButton>
        </header>
        <div className="ui-drawer__body">{children}</div>
        {footer ? <footer className="ui-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>,
    document.body
  );
}
