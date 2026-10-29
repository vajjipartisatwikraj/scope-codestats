import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
// Self-hosted font. The provider is mounted at the root, so importing it here loads it for the
// whole app.
import '@fontsource-variable/plus-jakarta-sans';
import createAppTheme from '../theme/createAppTheme';
import { applyTheme } from '../theme/applyTheme';
import { themeForMode } from '../theme/tokens';

// Same key and format as before ("true" for dark, "false" for light), so choices people have
// already saved keep working. Nothing is written until a person picks a theme.
const STORAGE_KEY = 'darkMode';

const readStoredMode = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return typeof value === 'boolean' ? (value ? 'dark' : 'light') : null;
  } catch {
    return null;
  }
};

// Midnight when the system asks for dark or gives no answer, Daylight when it asks for light.
const readSystemMode = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  if (window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
  return 'dark';
};

// Create the theme context
const ThemeContext = createContext();

/**
 * The theme, for any component.
 *
 *   mode         "dark" | "light"
 *   themeName    "midnight" | "daylight": the active token set, also the data-theme value
 *   tokens       the active design tokens (colours, series, shadows); see theme/tokens.js
 *   setMode      choose a mode and remember it
 *   toggleTheme  switch between the two and remember it
 *   darkMode     mode === "dark", for screens written before the redesign
 *   theme        the Material UI theme, for screens that still use Material UI
 *
 * Components that no longer use Material UI style themselves with the --ds-* CSS variables
 * this provider publishes (see theme/applyTheme.js) and need the hook only for values they
 * must read in JavaScript.
 */
export const useTheme = () => useContext(ThemeContext);

// Theme provider component
export const ThemeProvider = ({ children }) => {
  // The person's saved choice. null until they pick one with the toggle.
  const [storedMode, setStoredMode] = useState(readStoredMode);
  const [systemMode, setSystemMode] = useState(readSystemMode);

  // A first visit follows the operating system; a saved choice wins from then on.
  const mode = storedMode ?? systemMode;
  const tokens = themeForMode(mode);

  // Keep following the operating system until a choice has been made.
  useEffect(() => {
    if (storedMode !== null || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemMode(readSystemMode());
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, [storedMode]);

  // The Material UI theme for the screens that still use it.
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // Publish the tokens before the browser paints, so a switch never shows a mixed frame.
  useLayoutEffect(() => {
    applyTheme(tokens);
  }, [tokens]);

  const setMode = useCallback((next) => {
    const value = next === 'light' ? 'light' : 'dark';
    setStoredMode(value);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value === 'dark'));
    } catch {
      // Private browsing can refuse storage; the choice still applies for this visit.
    }
  }, []);

  // Toggle between dark and light mode
  const toggleTheme = useCallback(
    () => setMode(mode === 'dark' ? 'light' : 'dark'),
    [mode, setMode]
  );

  const value = useMemo(
    () => ({
      theme,
      darkMode: mode === 'dark',
      toggleTheme,
      mode,
      themeName: tokens.name,
      tokens,
      setMode,
    }),
    [theme, mode, tokens, toggleTheme, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export default ThemeProvider;
