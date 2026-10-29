import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * What a dialog and a drawer both need (design/screens.md sections 17 and 22):
 *   - focus moves in when it opens: to `initialFocusRef` when given (the safest action of a
 *     confirmation), else to the first field or button, else to the panel itself
 *   - Tab and Shift+Tab stay inside it
 *   - Escape closes it, unless `busy` (an action is in progress)
 *   - the page behind does not scroll
 *   - focus goes back to what had it before when it closes
 *
 * Returns the ref to put on the panel.
 */
// The panels that are open, the last one on top. Only the top one answers Escape and Tab, so a
// confirmation opened over a drawer closes alone and leaves the drawer where it was.
const openPanels = [];

export default function useOverlay({ open, onClose, busy = false, initialFocusRef }) {
  const panelRef = useRef(null);
  const latest = useRef({ onClose, busy });

  useEffect(() => {
    latest.current = { onClose, busy };
  });

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () => Array.from(panel.querySelectorAll(FOCUSABLE)).filter((node) => node.getClientRects().length > 0);
    const first = (initialFocusRef && initialFocusRef.current) || panel.querySelector('[data-autofocus]') || focusables().find((node) => node.dataset.close !== 'true') || focusables()[0];
    (first || panel).focus();

    openPanels.push(panel);

    const onKeyDown = (event) => {
      if (openPanels[openPanels.length - 1] !== panel) return;
      if (event.key === 'Escape') {
        if (!latest.current.busy) {
          event.stopPropagation();
          latest.current.onClose();
        }
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = focusables();
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const head = nodes[0];
      const tail = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === head || document.activeElement === panel)) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      const at = openPanels.indexOf(panel);
      if (at !== -1) openPanels.splice(at, 1);
      document.body.style.overflow = previousOverflow;
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus();
    };
    // Opening and closing are the only things that should move focus
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return panelRef;
}
