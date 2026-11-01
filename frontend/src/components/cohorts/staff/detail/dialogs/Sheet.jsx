import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { IconButton } from '../../../../ui';
import './dialogs.css';

/**
 * Sheet: a wide panel (up to 1100px; the full screen on a phone) for a form that needs the room. The
 * question form and the bulk upload are in it: both are still Material UI forms, and a Drawer is too
 * narrow for their tabs and tables. It is drawn in a portal, closes on Escape (when nothing is
 * running), keeps focus inside and gives it back to what opened it. It sits just under Material UI's
 * own layers, so their menus open above it.
 *
 *   open, onClose, title, description   as Dialog
 *   busy        something is running: Escape and the close button do nothing
 *   children    the body
 */
export default function Sheet({ open, onClose, title, description, busy = false, children }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    opener.current = document.activeElement;
    const panel = panelRef.current;
    if (panel) panel.focus();
    const onKeyDown = (event) => {
      // Escape inside one of Material UI's own menus (drawn outside the panel) closes that menu, not the sheet
      if (event.key === 'Escape' && !busy && panel && panel.contains(event.target)) onClose();
      if (event.key === 'Tab' && panel) {
        const nodes = panel.querySelectorAll('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])');
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (opener.current && opener.current.focus) opener.current.focus();
    };
  }, [open, busy, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="cad-sheet" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div ref={panelRef} className="cad-sheet__panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="cad-sheet__head">
          <div>
            <h2 className="cad-sheet__title" id={titleId}>
              {title}
            </h2>
            {description ? <p className="cad-sheet__description">{description}</p> : null}
          </div>
          <IconButton label="Close" size="sm" tone="plain" onClick={onClose} disabled={busy}>
            <XIcon size={20} weight="regular" aria-hidden="true" />
          </IconButton>
        </header>
        <div className="cad-sheet__body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
