import React from 'react';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Switches between Midnight and Daylight. The icon shows the theme you are in; both icons are
 * drawn and the other one turns out of view, so the swap is a short rotation rather than a cut.
 */
const ThemeToggle = () => {
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === 'dark';

  return (
    <button
      type="button"
      className="ds-navbar__icon-button ds-navbar__theme-toggle"
      data-mode={isDark ? 'dark' : 'light'}
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      <MoonIcon className="ds-navbar__theme-icon ds-navbar__theme-icon--moon" size={20} aria-hidden="true" />
      <SunIcon className="ds-navbar__theme-icon ds-navbar__theme-icon--sun" size={20} aria-hidden="true" />
    </button>
  );
};

export default ThemeToggle;
