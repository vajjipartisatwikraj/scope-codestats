import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { startSmoothScroll } from './smoothScroll';

/**
 * What every landing page does the same way: mark the page with the `landing-page` class on <body>
 * (the stylesheet relies on it), turn on smooth scrolling for as long as the page is shown (smoothScroll.js),
 * and send a visitor who is already signed in to their dashboard.
 *
 * @returns {{ token: string|null, navigate: Function }} `token` is set while someone is signed in;
 *   a landing page renders nothing then.
 */
export default function useLandingShell() {
  const navigate = useNavigate();
  const { token } = useAuth();

  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  // Nothing to scroll while a signed-in visitor is being sent to the dashboard
  useEffect(() => {
    if (token) return undefined;
    return startSmoothScroll();
  }, [token]);

  useEffect(() => {
    if (token) navigate('/dashboard');
  }, [token, navigate]);

  return { token, navigate };
}
