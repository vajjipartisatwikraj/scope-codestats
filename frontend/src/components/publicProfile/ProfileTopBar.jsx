import React from 'react';
import { Link } from 'react-router-dom';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';
import { SignInIcon } from '@phosphor-icons/react/dist/csr/SignIn';
import { SquaresFourIcon } from '@phosphor-icons/react/dist/csr/SquaresFour';
import { Button, IconButton } from '../ui';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

/** Switches between Midnight and Daylight; the icon shows the theme you are in, as the app's navbar does */
function ThemeButton() {
  const { mode, toggleTheme } = useTheme();
  const dark = mode === 'dark';
  return (
    <IconButton label={dark ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
      {dark ? <MoonIcon size={20} aria-hidden="true" /> : <SunIcon size={20} aria-hidden="true" />}
    </IconButton>
  );
}

/**
 * The slim bar at the top of the public profile. The page is open to everyone and sits outside the
 * app shell, so this is its only chrome: the brand, the theme switch, and one way onward (the
 * dashboard for someone who is signed in, the sign-in page for a visitor).
 */
export default function ProfileTopBar() {
  const auth = useAuth();
  const signedIn = Boolean(auth && auth.token);

  return (
    <header className="pp-top">
      <div className="pp-top__inner">
        <Link to="/" className="pp-brand" aria-label="CodeStats home">
          <img className="pp-brand__logo" src="/codestats-color.png" alt="" />
          <span className="pp-brand__name">CodeStats</span>
        </Link>

        <div className="pp-top__tools">
          <ThemeButton />
          {signedIn ? (
            <Button as={Link} to="/dashboard" startIcon={<SquaresFourIcon size={18} aria-hidden="true" />}>
              <span className="pp-top__label">Open dashboard</span>
            </Button>
          ) : (
            <Button as={Link} to="/login" startIcon={<SignInIcon size={18} aria-hidden="true" />}>
              <span className="pp-top__label">Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
