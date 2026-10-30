import React, { forwardRef, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SignOutIcon } from '@phosphor-icons/react/dist/csr/SignOut';
import { isItemActive } from './navigation';
import useSlidingIndicator from './useSlidingIndicator';

// 24px in navigation (DESIGN.md). Regular weight at rest, Fill for the current page.
const NAV_ICON_SIZE = 24;

const formatCount = (count) => (count > 99 ? '99+' : String(count));

/**
 * The label (and badge) of an item. It sits in a grid track that Sidebar.css animates between
 * 0fr and 1fr, so the pill grows and shrinks with the rail instead of snapping.
 */
const Reveal = ({ text, count }) => (
  <span className="ds-nav-item__reveal">
    <span className="ds-nav-item__clip">
      <span className="ds-nav-item__label">
        <span className="ds-nav-item__text" data-text={text}>
          {text}
        </span>
        {count ? (
          <span className="ds-nav-item__badge" aria-hidden="true">
            {count}
          </span>
        ) : null}
      </span>
    </span>
  </span>
);

const NavItem = ({ item, active, onNavigate }) => {
  const Icon = item.icon;
  const count = item.badgeCount > 0 ? formatCount(item.badgeCount) : null;

  return (
    <Link
      to={item.path}
      className="ds-nav-item"
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'page' : undefined}
      onClick={() => onNavigate?.(item)}
    >
      {/* Both weights are drawn and crossfaded, so the icon fills in rather than swapping */}
      <span className="ds-nav-item__icon" aria-hidden="true">
        <Icon
          className="ds-nav-item__glyph ds-nav-item__glyph--rest"
          size={NAV_ICON_SIZE}
          weight="regular"
        />
        <Icon
          className="ds-nav-item__glyph ds-nav-item__glyph--active"
          size={NAV_ICON_SIZE}
          weight="fill"
        />
      </span>
      <Reveal text={item.label} count={count} />
      {count ? (
        <>
          <span className="ds-nav-item__dot" aria-hidden="true">
            {count}
          </span>
          <span className="ds-sidebar__sr-only">{item.badgeCount} pending</span>
        </>
      ) : null}
    </Link>
  );
};

/**
 * The visible rail: brand, grouped links and the logout action.
 *
 * Presentation only. It takes everything as props, so it needs no router state, auth or theme
 * context of its own beyond <Link>, and the same markup serves the desktop rail and the mobile
 * drawer. Extra props (role, aria-modal, aria-label) land on the <aside>.
 *
 * The current page is shown by one highlight element that slides between the links (see
 * useSlidingIndicator); the links only change their text and icon.
 *
 * Props
 *   groups     from buildNavigation()
 *   pathname   the path to mark as the current page
 *   expanded   true shows labels; false shows only icons
 *   themeName  "midnight" | "daylight", set on the card so it always carries its own theme
 *   variant    "rail" (fixed to the page) or "drawer" (inside the mobile overlay)
 *   onNavigate called with the item after a link is chosen
 *   onLogout   called by the logout button
 */
const SidebarPanel = forwardRef(function SidebarPanel(
  { groups, pathname, expanded, themeName, variant = 'rail', onNavigate, onLogout, ...rest },
  ref
) {
  const navRef = useRef(null);
  const indicatorRef = useRef(null);

  // The item that matches the current page, if any.
  const activeId = useMemo(() => {
    for (const group of groups) {
      const match = group.items.find((item) => isItemActive(item, pathname));
      if (match) return match.id;
    }
    return null;
  }, [groups, pathname]);

  // Changes when items appear or disappear, which moves the others up or down.
  const layoutKey = useMemo(
    () => groups.map((group) => group.items.map((item) => item.id).join(',')).join('|'),
    [groups]
  );

  useSlidingIndicator({ navRef, indicatorRef, activeId, layoutKey });

  const className = variant === 'drawer' ? 'ds-sidebar ds-sidebar--drawer' : 'ds-sidebar';

  return (
    <aside
      ref={ref}
      className={className}
      data-open={expanded ? 'true' : 'false'}
      data-theme={themeName}
      {...rest}
    >
      <div className="ds-sidebar__brand">
        <span className="ds-sidebar__mark" aria-hidden="true">
          <img className="ds-sidebar__logo" src="/codestats-color.png" alt="" />
        </span>
        <span className="ds-sidebar__brand-name">CodeStats</span>
      </div>

      <nav ref={navRef} className="ds-sidebar__nav" aria-label="Main">
        <span ref={indicatorRef} className="ds-sidebar__indicator" aria-hidden="true" />
        {groups.map((group) => {
          const titleId = `ds-sidebar-${variant}-${group.id}`;
          return (
            <div key={group.id}>
              <p className="ds-sidebar__group-title" id={titleId}>
                {group.title}
              </p>
              <ul className="ds-sidebar__list" aria-labelledby={titleId}>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <NavItem item={item} active={item.id === activeId} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="ds-sidebar__footer">
        <button type="button" className="ds-nav-item ds-nav-item--danger" onClick={onLogout}>
          <span className="ds-nav-item__icon" aria-hidden="true">
            <SignOutIcon
              className="ds-nav-item__glyph ds-nav-item__glyph--rest"
              size={NAV_ICON_SIZE}
              weight="regular"
            />
          </span>
          <Reveal text="Logout" />
        </button>
      </div>
    </aside>
  );
});

export default SidebarPanel;
