import React, { useEffect, useRef, useState } from 'react';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { initialsOf } from './format';

/**
 * Badge (DESIGN.md, Badges): a 24px pill with a soft tint and matching text, for status and change.
 * Always give it a word (and an icon where it helps): colour alone is never the signal.
 *
 *   tone    'neutral' | 'info' | 'success' | 'warning' | 'danger'
 *   icon    a node (Phosphor icon at 14px), optional
 */
export function Badge({ tone = 'neutral', icon, className, children }) {
  return (
    <span className={className ? `ui-badge ${className}` : 'ui-badge'} data-tone={tone}>
      {icon}
      {children}
    </span>
  );
}

/**
 * Chip (DESIGN.md, Chips): a 32px pill that filters or marks a choice.
 *
 *   selected   selected becomes accent-soft with accent text (aria-pressed)
 *   onClick    makes it a button
 *   onRemove   adds a trailing remove button (a removable filter)
 *   icon       a leading node
 */
export function Chip({ selected = false, onClick, onRemove, icon, className, children }) {
  const classes = className ? `ui-chip ${className}` : 'ui-chip';
  if (onRemove) {
    return (
      <span className={classes} data-selected="true">
        {icon}
        <span>{children}</span>
        <button type="button" className="ui-chip__remove" onClick={onRemove} aria-label={`Remove ${typeof children === 'string' ? children : 'filter'}`}>
          <XIcon size={12} weight="bold" aria-hidden="true" />
        </button>
      </span>
    );
  }
  if (onClick) {
    return (
      <button type="button" className={classes} data-selected={selected ? 'true' : 'false'} aria-pressed={selected} onClick={onClick}>
        {icon}
        <span>{children}</span>
      </button>
    );
  }
  return (
    <span className={classes} data-selected={selected ? 'true' : 'false'}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

const TONES = ['blue', 'teal', 'amber', 'violet', 'coral', 'green', 'sky'];

/** A picture, or the initials on a tone of the data series when there is none (or it will not load) */
export function Avatar({ name, src, size = 40, className }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imageRef = useRef(null);

  // A picture that is already in the cache can finish loading before the listener is attached
  useEffect(() => {
    setLoaded(false);
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth > 0) setLoaded(true);
  }, [src]);

  let hash = 0;
  String(name || '').split('').forEach((letter) => {
    hash = (hash * 31 + letter.charCodeAt(0)) % 997;
  });
  const tone = TONES[hash % TONES.length];
  return (
    <span
      className={className ? `ui-avatar ${className}` : 'ui-avatar'}
      style={{ '--ui-size': `${size}px`, '--ui-tone': `var(--ds-series-${tone})` }}
      data-loading={src && !failed && !loaded ? 'true' : undefined}
      aria-hidden="true"
    >
      {src && !failed ? (
        <img ref={imageRef} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" data-loaded={loaded ? 'true' : 'false'} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </span>
  );
}
