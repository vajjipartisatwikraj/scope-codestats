import brand from '../brand';
import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import useMediaQuery from '../hooks/useMediaQuery';
import BatteryIndicator from './custom-components/BatteryIndicator';
import ConnectionStatus from './speechX/shared/ConnectionStatus';
import './Footer.css';

/**
 * The footer of the app shell (App.jsx), plain CSS on the design tokens (Footer.css).
 *
 * It lines up with the page above it: the same room for the sidebar rail, the same side padding
 * and the same 1440px limit as the page content (the leaderboard is the reference), so the bar
 * ends exactly where the cards above it end.
 *
 * While a speech test section is running (route /speech-tests/:id/sections/:sectionId, and only that route: not the setup,
 * the section list or the results) the bar also carries the connection indicator at its left end and the battery at its right
 * end, which the student needs to see during the test.
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
  // A running speech test section: the one page where the connection and the battery are shown
  const isRunningSpeechTest = /^\/speech-tests\/[^/]+\/sections\/[^/]+\/?$/.test(location.pathname);
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
        <div className="ds-footer__bar" data-status={isRunningSpeechTest ? 'true' : undefined}>
          {isRunningSpeechTest ? (
            <div className="ds-footer__end ds-footer__end--start">
              <ConnectionStatus />
            </div>
          ) : null}
          <div className="ds-footer__brand">
            <img className="ds-footer__logo" src={darkMode ? brand.institution.clubLogo.dark : brand.institution.clubLogo.light} alt={brand.names.club} />
            <p className="ds-footer__text">
              <span aria-hidden="true">&copy;</span>
              <span className="ds-footer__sr"> Copyright</span> 2025 {brand.names.club}, All rights Reserved
            </p>
          </div>
          {isRunningSpeechTest ? (
            <div className="ds-footer__end ds-footer__end--end">
              <BatteryIndicator />
            </div>
          ) : null}
        </div>      </div>
    </footer>
  );
};

export default Footer;
