/**
 * The CodeStats platform: its name and wording (brand.json) and its images.
 *
 * To add another platform, copy this folder, replace the files and edit brand.json, then build
 * with VITE_PLATFORM=<the folder name>. The build checks that these files exist:
 *   index.js  brand.json  logo.png  favicon.ico  icon-192.png  icon-512.png
 * logo.png is the mark shown in the sidebar, the navbars and the sign-in pages (it is also used as the
 * PNG favicon). favicon.ico, icon-192.png and icon-512.png are copied to the site root by the build.
 *
 * Optional: export `navbar: { left: { dark, light }, right: { dark, light } }` (see the House of
 * Abundance platform) to show a picture of the icon and a picture of the name, at the same height,
 * instead of logo.png and the name as text.
 */
import data from './brand.json';
import logo from './logo.png';
import courses from './marketing/courses.png';
import practiceArena from './marketing/practiceArena.png';

export default {
  ...data,
  logo,
  // Screenshots on the cohort and practice arena pages
  screenshots: { courses, practiceArena },
};
