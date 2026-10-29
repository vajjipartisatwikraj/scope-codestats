import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon } from '@phosphor-icons/react/dist/csr/MagnifyingGlass';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import AccountLink from './AccountLink';
import NotificationsMenu from './NotificationsMenu';
import SearchBox from './SearchBox';
import ThemeToggle from './ThemeToggle';
import useProfileRefresh from './useProfileRefresh';
import './Navbar.css';

// Material UI's `md` breakpoint (900px). The rest of the shell still lays itself out with it.
const MOBILE_QUERY = '(max-width: 899.95px)';
const AUTH_PATHS = ['/login', '/teacher-login', '/teacher-access', '/register'];

/**
 * The top bar. No Material UI: plain CSS on the design tokens (Navbar.css), Phosphor icons, and
 * the theme context for the active theme.
 *
 * Signed in: search, theme toggle, notifications and the account pill, floating on the page
 * background to the right of the sidebar. Signed out, or on a sign-in page: just the theme
 * toggle with Login and Register.
 *
 * The page reserves 64px for it (App.jsx) and 75px at the left for the rail (see Sidebar.css).
 */
const Navbar = () => {
  const { token, user } = useAuth();
  const { themeName } = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);

  useProfileRefresh();

  const isAuthPage = AUTH_PATHS.includes(pathname) || pathname.startsWith('/register');

  if (!token || isAuthPage) {
    return (
      <header className="ds-navbar ds-navbar--public" data-theme={themeName}>
        <div className="ds-navbar__actions">
          <ThemeToggle />
          <Link
            to="/login"
            className="ds-navbar__button"
            aria-current={pathname === '/login' ? 'page' : undefined}
          >
            Login
          </Link>
          <Link
            to="/register"
            className="ds-navbar__button ds-navbar__button--primary"
            aria-current={pathname.startsWith('/register') ? 'page' : undefined}
          >
            Register
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className="ds-navbar" data-theme={themeName}>
      {isMobile ? null : (
        <div className="ds-navbar__search-slot">
          <SearchBox />
        </div>
      )}

      <div className="ds-navbar__actions">
        {isMobile ? (
          <button
            type="button"
            className="ds-navbar__icon-button"
            onClick={() => navigate('/search')}
            aria-label="Search"
            title="Search"
          >
            <MagnifyingGlassIcon size={20} aria-hidden="true" />
          </button>
        ) : null}
        <ThemeToggle />
        <NotificationsMenu />
        <AccountLink user={user} />
      </div>
    </header>
  );
};

export default Navbar;
