/**
 * The House of Abundance platform: its name and wording (brand.json) and its images.
 * Build with VITE_PLATFORM=houseofabundance.
 *
 * This platform has no feature screenshots of its own, so its logo is used where the CodeStats
 * platform shows them.
 */
import data from './brand.json';
import logo from './logo.png';
import leftDark from './navbar-left-dark.png';
import leftLight from './navbar-left-light.png';
import rightDark from './navbar-right-dark.png';
import rightLight from './navbar-right-light.png';

export default {
  ...data,
  logo,
  // Optional. The icon (left) and the platform name (right) shown side by side at the same height in
  // the navbars and the sidebar, one picture per theme. Without this the logo and the name as text are used.
  navbar: { left: { dark: leftDark, light: leftLight }, right: { dark: rightDark, light: rightLight } },
  screenshots: { courses: logo, practiceArena: logo },
};
