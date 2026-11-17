import React, { useEffect, useRef, useState } from 'react';
import AlertBar from './AlertBar';

/** How long the fade of a closing band lasts, in ms (the same 150ms as the CSS) */
const FADE_MS = 150;

/**
 * The alert band of the app: AlertBar at the very top of the page, in the flow so nothing is covered.
 * It publishes its own height as the CSS variable --ds-alert-h on <html>, which the navbar, the sidebar
 * and the phone menu button add to their top offset (they are fixed to the window and would otherwise
 * slide under it). The variable goes back to 0 when the band is gone.
 *
 *   alert        { _id, message, buttonText, buttonUrl }
 *   onClose(alert)   the cross was pressed; called after the fade
 *   onButton(alert)  the button was pressed
 */
export default function AlertBand({ alert, onClose, onButton }) {
  const ref = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const root = document.documentElement;
    const publish = () => root.style.setProperty('--ds-alert-h', `${node.offsetHeight}px`);
    publish();
    // The band grows when its message wraps (a narrow window, a rotated phone)
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(publish) : null;
    if (observer) observer.observe(node);
    return () => {
      if (observer) observer.disconnect();
      root.style.setProperty('--ds-alert-h', '0px');
    };
  }, [alert._id]);

  // A fresh alert starts open
  useEffect(() => setClosing(false), [alert._id]);

  const close = () => {
    setClosing(true);
    window.setTimeout(() => onClose(alert), FADE_MS);
  };

  return (
    <AlertBar ref={ref} message={alert.message} buttonText={alert.buttonText} onButton={() => onButton(alert)} onClose={close} closing={closing} />
  );
}
