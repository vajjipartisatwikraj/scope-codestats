import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSwipeable } from 'react-swipeable';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import SidebarPanel from './SidebarPanel';
import { buildNavigation } from './navigation';
import useTeacherRequestBadge from './useTeacherRequestBadge';
import './Sidebar.css';

// Material UI's `md` breakpoint (900px). The rest of the shell still lays itself out with it.
const MOBILE_QUERY = '(max-width: 899.95px)';
// Wait a moment before collapsing so the rail does not flicker when the pointer slips off it.
const COLLAPSE_DELAY_MS = 200;
// How long a clicked item stays highlighted while the router is still building the new page.
const PENDING_HIGHLIGHT_MS = 2500;

// Hovering with a mouse is not the only way to reach the rail, so keyboard focus expands it
// too. A mouse click also focuses a link, which must not keep the rail open, hence
// :focus-visible.
const isKeyboardFocus = (element) => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return false;
  }
};

/**
 * The app's left rail. No Material UI: plain CSS on the design tokens (Sidebar.css), Phosphor
 * icons, and the theme context for the active theme.
 *
 * Desktop: a floating card, icons only until the pointer or the keyboard reaches it, then icons
 * and labels. It opens OVER the page rather than pushing it aside, so the page behind never
 * reflows while the rail animates. Below 900px it becomes a drawer that the shell opens with
 * `mobileOpen`.
 *
 * Contract with the shell:
 *   onToggle(open)      what the page should reserve: false on desktop (the rail always takes
 *                       its collapsed 75px in the page), true on mobile as before
 *   mobileOpen          whether the mobile drawer is showing
 *   onMobileClose()     asks the shell to close the drawer
 *   window event        "sidebarStateChange" with { isOpen } (the Navbar follows it)
 *   body classes        sidebar-expanded / sidebar-collapsed (the Footer follows them)
 */
const Sidebar = ({ onToggle, mobileOpen = false, onMobileClose }) => {
  const { user, logout } = useAuth();
  const { themeName } = useTheme();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  // Teacher access requests waiting for an admin (a badge, admins only).
  const teacherRequestCount = useTeacherRequestBadge(user?.userType === 'admin');
  const groups = useMemo(
    () => buildNavigation(user, { teacherRequestCount }),
    [user, teacherRequestCount]
  );

  // The shell passes a new onMobileClose on every render; reading it through a ref keeps the
  // effects below from restarting each time.
  const onMobileCloseRef = useRef(onMobileClose);
  useEffect(() => {
    onMobileCloseRef.current = onMobileClose;
  });
  const closeMobile = useCallback(() => onMobileCloseRef.current?.(), []);

  // The item that was just clicked. The router can take a moment to build a heavy page, and the
  // highlight must not wait for it: it moves on the click, then follows the real URL.
  const [pendingPath, setPendingPath] = useState(null);
  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);
  useEffect(() => {
    if (pendingPath === null) return undefined;
    const timer = window.setTimeout(() => setPendingPath(null), PENDING_HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [pendingPath]);
  const activePath = pendingPath ?? pathname;

  // Desktop only: whether the rail is showing labels. Collapsed until the pointer or the
  // keyboard reaches it.
  const [open, setOpen] = useState(false);
  const hovered = useRef(false);
  const keyboardFocused = useRef(false);
  const collapseTimer = useRef(null);
  const drawerRef = useRef(null);

  const settle = useCallback(() => {
    window.clearTimeout(collapseTimer.current);
    if (hovered.current || keyboardFocused.current) {
      setOpen(true);
    } else {
      collapseTimer.current = window.setTimeout(() => setOpen(false), COLLAPSE_DELAY_MS);
    }
  }, []);

  useEffect(() => () => window.clearTimeout(collapseTimer.current), []);

  // Crossing the breakpoint starts the desktop rail collapsed again.
  useEffect(() => {
    window.clearTimeout(collapseTimer.current);
    hovered.current = false;
    keyboardFocused.current = false;
    setOpen(false);
  }, [isMobile]);

  // What the page reserves room for. Only the mobile drawer counts as open: on desktop the rail
  // opens over the page, so the page is never resized while the rail animates.
  const reservedOpen = isMobile;

  // Tell the rest of the shell.
  useEffect(() => {
    if (onToggle) {
      onToggle(reservedOpen);
    }

    // Classes on the body let other components react without props.
    document.body.classList.toggle('sidebar-expanded', reservedOpen);
    document.body.classList.toggle('sidebar-collapsed', !reservedOpen);
  }, [reservedOpen, onToggle]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sidebarStateChange', { detail: { isOpen: reservedOpen } })
    );
  }, [reservedOpen]);

  // Mobile drawer while it is open: lock page scroll, put focus inside, keep Tab inside, and
  // close on Escape.
  useEffect(() => {
    if (!isMobile || !mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const drawer = drawerRef.current;
    const focusable = () =>
      drawer ? Array.from(drawer.querySelectorAll('a[href], button:not([disabled])')) : [];
    focusable()[0]?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeMobile();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobile, mobileOpen, closeMobile]);

  // Swipe left anywhere on the open drawer to close it.
  const swipe = useSwipeable({ onSwipedLeft: closeMobile, delta: 40, trackMouse: false });

  const handleNavigate = useCallback(
    (item) => {
      if (item.path !== pathname) setPendingPath(item.path);
      if (isMobile) closeMobile();
    },
    [pathname, isMobile, closeMobile]
  );

  const handleLogout = () => {
    const loggedOut = logout();
    if (loggedOut) {
      navigate('/login');
    }
    if (isMobile) closeMobile();
  };

  if (isMobile) {
    return (
      <div
        className="ds-sidebar-overlay"
        data-open={mobileOpen ? 'true' : 'false'}
        {...swipe}
      >
        <div className="ds-sidebar-scrim" onClick={closeMobile} aria-hidden="true" />
        <SidebarPanel
          ref={drawerRef}
          variant="drawer"
          groups={groups}
          pathname={activePath}
          expanded
          themeName={themeName}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        />
      </div>
    );
  }

  return (
    <div
      className="ds-sidebar-slot"
      onMouseEnter={() => {
        hovered.current = true;
        settle();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        settle();
      }}
      onFocus={(event) => {
        if (isKeyboardFocus(event.target)) {
          keyboardFocused.current = true;
          settle();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          keyboardFocused.current = false;
          settle();
        }
      }}
    >
      <SidebarPanel
        groups={groups}
        pathname={activePath}
        expanded={open}
        themeName={themeName}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        aria-label="Sidebar"
      />
    </div>
  );
};

export default Sidebar;
