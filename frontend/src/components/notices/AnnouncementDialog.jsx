import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useOverlay from '../ui/useOverlay';
import AnnouncementCard from './AnnouncementCard';
import './announcementCard.css';

/** How long the card takes to leave, in ms (the same 200ms as the CSS); 0 when the person prefers less motion */
const EXIT_MS = 200;
const prefersLessMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The announcement as a dialog over the app: a scrim, the card in the middle, focus kept inside
 * it, Escape or a press outside closes it (counted as closing it). It arrives with a short rise and
 * leaves with a short sink; whatever closed it (the cross, "Not now", Escape, the scrim, the button)
 * is passed on after the card has left. Drawn in a portal so no scrolling box can cut it off. Mount it
 * only while it is open, and give it a `key` that changes with the announcement so the next one starts
 * afresh.
 *
 *   announcement   { title, description, imageUrl, buttonText }
 *   onClose()      it was closed
 *   onButton()     the button was pressed
 *   preview        the management screen's preview: a label says so
 */
export default function AnnouncementDialog({ announcement, onClose, onButton, preview = false }) {
  const titleId = useId();
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  /** Play the exit once, then do what was asked */
  const leaveThen = useCallback((action) => {
    if (timer.current) return;
    setLeaving(true);
    timer.current = window.setTimeout(action, prefersLessMotion() ? 0 : EXIT_MS);
  }, []);

  const close = useCallback(() => leaveThen(onClose), [leaveThen, onClose]);
  const press = useCallback(() => leaveThen(onButton), [leaveThen, onButton]);
  const panelRef = useOverlay({ open: true, onClose: close });

  return createPortal(
    <div
      className="an"
      data-leaving={leaving ? 'true' : 'false'}
      data-preview={preview ? 'true' : 'false'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div ref={panelRef} className="an__panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <AnnouncementCard announcement={announcement} titleId={titleId} onButton={press} onClose={close} />
      </div>
      {preview ? <p className="an__preview-tag">Preview. Nothing is counted.</p> : null}
    </div>,
    document.body
  );
}