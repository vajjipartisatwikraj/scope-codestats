import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import useDismiss from '../Navbar/useDismiss';

/**
 * Menu (DESIGN.md, Select and filter / Dialogs, menus and toasts): a popover list of actions that
 * opens from any trigger. It behaves like the language select of CodePad: the panel stays mounted
 * and fades and drops in through data-open (150 to 220ms, transform and opacity), a press outside
 * or Escape closes it (Escape hands focus back to the trigger), the arrow keys, Home and End move
 * between the items, and Enter or Space choose one. Opening puts focus on the first enabled item.
 * ArrowDown or ArrowUp on the trigger opens it too. Tab closes it and moves on from the trigger.
 *
 *   label     the accessible name of the menu ("Row actions", "Export as")
 *   trigger   ({ open, props }) => node. Render any control and spread `props` onto it: it carries
 *             the ref, aria-haspopup, aria-expanded, aria-controls, onClick and onKeyDown. The
 *             control must forward its ref (Button and IconButton do):
 *               trigger={({ open, props }) => <Button {...props}>Actions</Button>}
 *   items     [{ key, label, hint, icon, onSelect, disabled, tone }]
 *               hint      a muted second line
 *               icon      a node (Phosphor icon, 20px)
 *               onSelect  called with the item after the menu has closed and focus is back on the
 *                         trigger, so a dialog opened from here returns focus to the trigger
 *               disabled  the high fill with a subtle label, skipped by the arrow keys
 *               tone      'danger' for a destructive action (danger text, danger-soft on hover)
 *   align     'start' (the panel's left edge meets the trigger's, the default) | 'end' (right edges)
 *   fixed     draw the panel with position: fixed, placed from the trigger, flipping upward when
 *             there is no room below, and close it when anything scrolls. Use it for a menu inside
 *             a box that clips (a scrolling table wrap, a flush Card, a Drawer body). Off by default.
 *   className added to the wrapper
 *
 * The panel is a float-small layer: surface, 18px radius, 10px radius items of at least 44px.
 */
export function Menu({ label, trigger, items, align = 'start', fixed = false, className }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const startAt = useRef('first');
  const menuId = useId();

  useDismiss(rootRef, open, ({ escape }) => {
    setOpen(false);
    if (escape && triggerRef.current) triggerRef.current.focus();
  });

  const enabledItems = useCallback(() => (listRef.current ? Array.from(listRef.current.querySelectorAll('[role="menuitem"]:not(:disabled)')) : []), []);

  // Opening puts focus on the first item (the last one after ArrowUp on the trigger)
  useEffect(() => {
    if (!open) return;
    const nodes = enabledItems();
    const target = startAt.current === 'last' ? nodes[nodes.length - 1] : nodes[0];
    if (target) target.focus();
    startAt.current = 'first';
  }, [open, enabledItems]);

  // fixed: place the panel from the trigger before it paints, upward when the window has no room
  useLayoutEffect(() => {
    if (!open || !fixed || !rootRef.current || !listRef.current) return;
    const box = rootRef.current.getBoundingClientRect();
    const height = listRef.current.offsetHeight;
    const below = window.innerHeight - box.bottom;
    const up = below < height + 16 && box.top > below;
    setPlace({
      up,
      style: {
        top: up ? 'auto' : box.bottom + 8,
        bottom: up ? window.innerHeight - box.top + 8 : 'auto',
        left: align === 'end' ? 'auto' : box.left,
        right: align === 'end' ? window.innerWidth - box.right : 'auto',
      },
    });
  }, [open, fixed, align]);

  // fixed: a layer that does not move with its trigger closes when the page scrolls or resizes
  useEffect(() => {
    if (!open || !fixed) return undefined;
    const onMove = (event) => {
      if (event.target && listRef.current && listRef.current.contains(event.target)) return;
      setOpen(false);
    };
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open, fixed]);

  const choose = (item) => {
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
    if (item.onSelect) item.onSelect(item);
  };

  const onListKeyDown = (event) => {
    const nodes = enabledItems();
    const at = nodes.indexOf(document.activeElement);
    let next = null;
    if (event.key === 'ArrowDown') next = nodes[(at + 1) % nodes.length];
    else if (event.key === 'ArrowUp') next = nodes[(at - 1 + nodes.length) % nodes.length];
    else if (event.key === 'Home') next = nodes[0];
    else if (event.key === 'End') next = nodes[nodes.length - 1];
    else if (event.key === 'Tab') {
      setOpen(false);
      if (triggerRef.current) triggerRef.current.focus();
    }
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      startAt.current = event.key === 'ArrowUp' ? 'last' : 'first';
      setOpen(true);
    }
  };

  const triggerProps = {
    ref: triggerRef,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: () => setOpen((current) => !current),
    onKeyDown: onTriggerKeyDown,
  };

  return (
    <div className={className ? `ui-menu ${className}` : 'ui-menu'} ref={rootRef}>
      {trigger({ open, props: triggerProps })}
      <ul
        ref={listRef}
        id={menuId}
        className="ui-menu__panel"
        role="menu"
        aria-label={label}
        data-open={open ? 'true' : 'false'}
        data-align={align}
        data-fixed={fixed ? 'true' : 'false'}
        data-place={place && place.up ? 'up' : 'down'}
        style={fixed && place ? place.style : undefined}
        onKeyDown={onListKeyDown}
      >
        {items.map((item) => (
          <li key={item.key} role="presentation">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="ui-menu__item"
              data-tone={item.tone || 'neutral'}
              data-icon={item.icon ? 'true' : 'false'}
              disabled={item.disabled}
              onClick={() => choose(item)}
            >
              {item.icon ? (
                <span className="ui-menu__icon" aria-hidden="true">
                  {item.icon}
                </span>
              ) : null}
              <span className="ui-menu__text">
                <span className="ui-menu__label">{item.label}</span>
                {item.hint ? <span className="ui-menu__hint">{item.hint}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Menu;
