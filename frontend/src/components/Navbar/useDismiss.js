import { useEffect, useRef } from 'react';

/**
 * While `active`, calls onDismiss({ escape }) when the page is pressed outside `ref`
 * (escape: false) or when Escape is pressed (escape: true). The caller can put focus back on
 * its trigger after an Escape.
 */
export default function useDismiss(ref, active, onDismiss) {
  // Read the latest callback without re-subscribing every render.
  const callback = useRef(onDismiss);
  useEffect(() => {
    callback.current = onDismiss;
  });

  useEffect(() => {
    if (!active) return undefined;

    const onPointerDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback.current({ escape: false });
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') callback.current({ escape: true });
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [active, ref]);
}
