import React, { useRef, useState } from 'react';
import { StarIcon } from '@phosphor-icons/react/dist/csr/Star';
import { StarHalfIcon } from '@phosphor-icons/react/dist/csr/StarHalf';
import './shared.css';
import './StarRating.css';
import { clamp, cx, finiteOr } from './chartUtils';

/**
 * StarRating: a row of stars to give (or show) a rating. Interactive it is a radio group:
 * Tab enters it, the arrow keys, Home and End change the rating, and hovering previews one. Every
 * star is a 44px target. The state is never colour alone: a chosen star is a filled shape and the
 * others are outlines, and the word for the rating is printed beside the stars.
 *
 * Props
 *   value (0)         the rating, 0..max. 0 means none yet.
 *   onChange(n)       called with the new rating (1..max). Without it, or with readOnly, the
 *                     stars only display.
 *   max (5)           how many stars
 *   readOnly (false)  display only. A fractional value is shown with a half star.
 *   size (28)         px, the icon (the target is at least 44px when interactive)
 *   label ('Rating')  the name of the group
 *   labels            array of words, one per star: ['Poor', 'Fair', 'Good', 'Very good', 'Excellent'].
 *                     The word of the previewed or chosen star is printed beside the stars and
 *                     spoken with each star.
 *   showValue (false)   read-only only: print "4.5 of 5" beside the stars
 *   color             colour of the chosen stars; default 'var(--ds-series-amber)'
 *   className, style  passed to the root element
 *
 * CSS variables: --sr-fill --sr-empty --sr-text
 */

export default function StarRating({
  value = 0,
  onChange,
  max = 5,
  readOnly = false,
  size = 28,
  label = 'Rating',
  labels,
  showValue = false,
  color,
  className,
  style,
}) {
  const count = Math.max(1, Math.round(finiteOr(max, 5)));
  const current = clamp(finiteOr(value, 0), 0, count);
  const interactive = !readOnly && typeof onChange === 'function';
  const [hover, setHover] = useState(0);
  const groupRef = useRef(null);

  const wordFor = (n) => (Array.isArray(labels) && n >= 1 ? labels[n - 1] : undefined);
  const rootStyle = {
    '--sr-size': `${size}px`,
    '--sr-target': `${Math.max(44, size + 12)}px`,
    ...(color ? { '--sr-fill': color } : null),
    ...style,
  };

  // ---- Display only ----------------------------------------------------------------------
  if (!interactive) {
    // Rounded to the nearest half star: x.25 to x.74 is a half star
    const fraction = current - Math.floor(current);
    const half = fraction >= 0.25 && fraction < 0.75;
    const wholeStars = fraction >= 0.75 ? Math.floor(current) + 1 : Math.floor(current);
    const word = wordFor(Math.round(current));
    const spoken = `${label}: ${Math.round(current * 10) / 10} out of ${count}${word ? `, ${word}` : ''}`;
    return (
      <div className={cx('cc sr', className)} style={rootStyle} data-readonly="true">
        <span className="sr__row" role="img" aria-label={spoken}>
          {Array.from({ length: count }, (_, index) => {
            const filled = index < wholeStars;
            const isHalf = half && index === wholeStars;
            return (
              <span key={index} className="sr__star" data-on={filled || isHalf ? 'true' : 'false'} aria-hidden="true">
                {isHalf ? (
                  <StarHalfIcon size={size} weight="fill" />
                ) : (
                  <StarIcon size={size} weight={filled ? 'fill' : 'regular'} />
                )}
              </span>
            );
          })}
        </span>
        {showValue ? (
          <span className="sr__word" aria-hidden="true">
            {Math.round(current * 10) / 10} of {count}
          </span>
        ) : word ? (
          <span className="sr__word" aria-hidden="true">
            {word}
          </span>
        ) : null}
      </div>
    );
  }

  // ---- Interactive -----------------------------------------------------------------------
  const chosen = Math.round(current);
  const shown = hover || chosen;
  const focusStar = (n) => {
    const node = groupRef.current ? groupRef.current.querySelector(`[data-star="${n}"]`) : null;
    if (node) node.focus();
  };

  const onKeyDown = (event, n) => {
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(count, n + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(1, n - 1);
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = count;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    focusStar(next);
  };

  // The tab stop is the chosen star, or the first one while nothing is chosen
  const stop = chosen > 0 ? chosen : 1;

  return (
    <div className={cx('cc sr', className)} style={rootStyle}>
      <div
        ref={groupRef}
        className="sr__row"
        role="radiogroup"
        aria-label={label}
        onPointerLeave={() => setHover(0)}
      >
        {Array.from({ length: count }, (_, index) => {
          const n = index + 1;
          const word = wordFor(n);
          const on = n <= shown;
          return (
            <button
              key={n}
              type="button"
              className="sr__star sr__star--button"
              role="radio"
              aria-checked={chosen === n}
              aria-label={`${n} of ${count}${word ? `, ${word}` : ''}`}
              tabIndex={n === stop ? 0 : -1}
              data-star={n}
              data-on={on ? 'true' : 'false'}
              data-preview={hover > 0 && n <= hover ? 'true' : 'false'}
              onClick={() => onChange(n)}
              onKeyDown={(event) => onKeyDown(event, n)}
              onPointerEnter={(event) => {
                // Hover previews with a mouse; on touch the tap chooses at once
                if (event.pointerType === 'mouse') setHover(n);
              }}
            >
              <StarIcon size={size} weight={on ? 'fill' : 'regular'} aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <span className="sr__word" aria-hidden="true">
        {wordFor(shown) || (shown > 0 ? `${shown} of ${count}` : '')}
      </span>
    </div>
  );
}
