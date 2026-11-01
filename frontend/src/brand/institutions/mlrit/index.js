/**
 * The MLRIT institution: its names and facts (brand.json) and its images, including the logos of the
 * club that belongs to it (SCOPE Club).
 *
 * To add another institution, copy this folder, replace the files and edit brand.json, then build
 * with VITE_INSTITUTION=<the folder name>. The build checks that these files exist:
 *   index.js  brand.json  logo.png  club-logo-dark.png  club-logo-light.png
 * logo.png is the institution's logo (shown on the dark landing page, so it should be light-coloured).
 * club-logo-dark.png is for the dark theme and club-logo-light.png for the light theme (the footer).
 * The testimonials on the landing page are this institution's; an institution without a
 * testimonials.js shows no testimonials section.
 */
import data from './brand.json';
import logo from './logo.png';
import clubLogoDark from './club-logo-dark.png';
import clubLogoLight from './club-logo-light.png';
import testimonials from './testimonials';

export default {
  ...data,
  logo,
  clubLogo: { dark: clubLogoDark, light: clubLogoLight },
  testimonials,
};
