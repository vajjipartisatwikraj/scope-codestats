import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import useMediaQuery from '../hooks/useMediaQuery';
import './Footer.css';

/**
 * The footer of the app shell (App.jsx), plain CSS on the design tokens (Footer.css).
 *
 * It lines up with the page above it: the same room for the sidebar rail, the same side padding
 * and the same 1440px limit as the page content (the leaderboard is the reference), so the bar
 * ends exactly where the cards above it end.
 *
 * The rail is read from the body classes that Sidebar.jsx sets (sidebar-expanded and
 * sidebar-collapsed). On a screen under 900px, and on pages without the sidebar, nothing is reserved.
 */
const Footer = () => {
  const { darkMode } = useTheme();
  const { token } = useAuth();
  const location = useLocation();
  const narrow = useMediaQuery('(max-width: 899.95px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Pages that run without the sidebar
  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/teacher-login' ||
    location.pathname === '/teacher-access' ||
    location.pathname === '/register' ||
    location.pathname.startsWith('/register');
  const isPublicPage = location.pathname.startsWith('/public-profile/');
  const isCohortProblemPage = /^\/cohorts\/[^/]+\/modules\/[^/]+\/questions\/[^/]+$/.test(location.pathname);
  const isTestPage = location.pathname.startsWith('/practice-arena/tests/');
  // Speech test setup, section list and question screens run without the sidebar.
  const isSpeechTestFlowPage = /^\/speech-tests\/[^/]+(\/setup|\/feedback|\/sections\/[^/]+(\/results)?)?$/.test(
    location.pathname
  );

  const shouldShowNavigation =
    token && !isAuthPage && !isCohortProblemPage && !isTestPage && !isPublicPage && !isSpeechTestFlowPage;

  // Follow the sidebar through the classes it puts on the body
  useEffect(() => {
    const check = () => setSidebarOpen(document.body.classList.contains('sidebar-expanded'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const rail = shouldShowNavigation && !narrow ? (sidebarOpen ? 280 : 75) : 0;

  return (
    <footer className="ds-footer" style={{ '--ds-footer-rail': `${rail}px` }}>
      <div className="ds-footer__inner">
        <div className="ds-footer__bar">
          <img className="ds-footer__logo" src={darkMode ? '/footer-dark.png' : '/footer-light.png'} alt="SCOPE Club" />
          <p className="ds-footer__text">
            <span aria-hidden="true">&copy;</span>
            <span className="ds-footer__sr"> Copyright</span> 2025 SCOPE club, All rights Reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
