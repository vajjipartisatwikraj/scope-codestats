/**
 * The House of Abundance institution: its names and facts (brand.json) and its images.
 * Build with VITE_INSTITUTION=houseofabundance.
 *
 *   logo.png                 the colour logo (dark text, for light backgrounds)
 *   club-logo-dark.png       the white logo, for the dark theme and the dark landing page
 *   club-logo-light.png      the black logo, for the light theme
 *
 * It has no testimonials, so the landing page leaves that section out. Fill in contactEmail,
 * address and linkedin in brand.json to show them on the landing and contact pages.
 */
import data from './brand.json';
import clubLogoDark from './club-logo-dark.png';
import clubLogoLight from './club-logo-light.png';

export default {
  ...data,
  // The landing page is black, so it gets the white logo
  logo: clubLogoDark,
  clubLogo: { dark: clubLogoDark, light: clubLogoLight },
  testimonials: [],
};
