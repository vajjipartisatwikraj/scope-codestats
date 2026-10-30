import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import './shared.css';
import './PillTabs.css';
import { cx } from './chartUtils';

/**
 * PillTabs: a pill-shaped row of tabs (or a segmented control) with ONE highlight that slides to
 * the selected item and takes its width, like the highlight of the sidebar. Use it to switch a
 * view in place: it never navigates away.
 *
 * Props
 *   items            [{ key, label, icon, disabled }]  `icon` is a node shown before the label
 *   value            the key of the selected item
 *   onChange(key)    called when another item is chosen (click, or the arrow keys, Home and End)
 *   label            the accessible name of the tab list
 *   size ('md')      'md' (40px items) | 'sm' (32px items, for a range control)
 *   idPrefix         when given, each tab gets id "<prefix>-tab-<key>" and aria-controls
 *                    "<prefix>-panel-<key>", so a panel can name itself by its tab
 *   role ('tablist') 'tablist' for tabs that show a panel; 'radiogroup' for a plain choice such
 *                    as a date range (then there is no panel to point at)
 *   className, style passed to the root element
 *
 * CSS variables: --pt-bg --pt-text --pt-active --pt-active-text
 */
export default function PillTabs({
  items = [],
  value,
  onChange,
  label,
  size = 'md',
  idPrefix,
  role = 'tablist',
  className,
  style,
}) {
  const rootRef = useRef(null);
  const indicatorRef = useRef(null);
  const placed = useRef(false);
  const isTabs = role === 'tablist';

  // The highlight sits on the selected item. Its first placement is instant; later ones slide.
  const place = useCallback(() => {
    const root = rootRef.current;
    const indicator = indicatorRef.current;
    const current = root ? root.querySelector('[data-selected="true"]') : null;
    if (!root || !indicator || !current || current.offsetWidth === 0) return;
    indicator.style.setProperty('--pt-x', `${current.offsetLeft}px`);
    indicator.style.setProperty('--pt-w', `${current.offsetWidth}px`);
    if (!placed.current) {
      placed.current = true;
      // Let the first position paint before transitions are switched on
      window.requestAnimationFrame(() => indicator.setAttribute('data-ready', 'true'));
    }
  }, []);

  useLayoutEffect(() => {
    place();
    // Keep the selected tab inside the tab list when the list scrolls sideways. This moves only the
    // list: scrollIntoView would also scroll the whole page down to the tabs, which made a page with
    // tabs below the fold (the profile's portfolio) open already scrolled.
    const root = rootRef.current;
    const current = root ? root.querySelector('[data-selected="true"]') : null;
    if (current && root.scrollWidth > root.clientWidth) {
      const start = current.offsetLeft;
      const end = start + current.offsetWidth;
      if (start < root.scrollLeft) root.scrollLeft = Math.max(0, start - 8);
      else if (end > root.scrollLeft + root.clientWidth) root.scrollLeft = end - root.clientWidth + 8;
    }
  }, [value, items.length, place]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(place);
    observer.observe(root);
    return () => observer.disconnect();
  }, [place]);

  const move = (event, index) => {
    const enabled = items.map((item, position) => (item.disabled ? -1 : position)).filter((position) => position >= 0);
    const at = enabled.indexOf(index);
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = enabled[(at + 1) % enabled.length];
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = enabled[(at - 1 + enabled.length) % enabled.length];
    else if (event.key === 'Home') next = enabled[0];
    else if (event.key === 'End') next = enabled[enabled.length - 1];
    if (next === null || next === undefined) return;
    event.preventDefault();
    onChange(items[next].key);
    const buttons = rootRef.current.querySelectorAll('[data-pill-item]');
    if (buttons[next]) buttons[next].focus();
  };

  return (
    <div
      ref={rootRef}
      className={cx('cc pt', className)}
      style={style}
      role={role}
      aria-label={label}
      data-size={size}
    >
      <span ref={indicatorRef} className="pt__indicator" aria-hidden="true" />
      {items.map((item, index) => {
        const selected = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            className="pt__item"
            data-pill-item=""
            data-selected={selected ? 'true' : 'false'}
            disabled={item.disabled}
            onClick={() => onChange(item.key)}
            onKeyDown={(event) => move(event, index)}
            {...(isTabs
              ? {
                  role: 'tab',
                  'aria-selected': selected,
                  tabIndex: selected ? 0 : -1,
                  ...(idPrefix ? { id: `${idPrefix}-tab-${item.key}`, 'aria-controls': `${idPrefix}-panel-${item.key}` } : null),
                }
              : { role: 'radio', 'aria-checked': selected, tabIndex: selected ? 0 : -1 })}
          >
            {item.icon ? <span className="pt__icon">{item.icon}</span> : null}
            <span className="pt__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
