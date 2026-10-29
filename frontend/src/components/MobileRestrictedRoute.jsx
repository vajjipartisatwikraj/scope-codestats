import React from 'react';
import { useNavigate } from 'react-router-dom';
import useMediaQuery from '../hooks/useMediaQuery';
import { RestrictedNotice } from './mobileRestriction';

/**
 * Wraps a page that needs a wide screen. Below 968px it shows a full-width card in place of the
 * page (design/screens.md section 19): why the page is limited, a button to copy its address to
 * open on a computer, and a way back.
 *
 *   children     the page
 *   pageName     the name used in the card's title
 *   redirectTo   where "Back to dashboard" goes (default /dashboard)
 */
const MobileRestrictedRoute = ({ children, pageName, redirectTo = '/dashboard' }) => {
  // Answers on the first render, so the page behind is never mounted (and never fetches) on a phone
  const isMobile = useMediaQuery('(max-width: 967.98px)');
  const navigate = useNavigate();

  if (isMobile) {
    return <RestrictedNotice pageName={pageName} onBack={() => navigate(redirectTo)} />;
  }

  return children;
};

export default MobileRestrictedRoute;
