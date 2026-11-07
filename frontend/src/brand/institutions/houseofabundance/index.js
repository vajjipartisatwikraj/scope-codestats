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
 *
 * Optional wording for the public pages, all in brand.json (an institution without them keeps the
 * default text; strings may use the {platform} {institution} {institutionFull} {club} {builder} tokens):
 *   landing.numberLocale     how the numbers are grouped, e.g. "en-IN" shows 1,00,000
 *   landing.hideHeroFooter   true removes the "built by ..." line and the student/teacher/admin counts
 *                            at the bottom of the landing hero
 *   landing.footerTitle      the name at the top of the landing footer
 *   landing.stats.<key>      { value, label } for "students", "questions" or "teachers" in the stats row;
 *                            a value here replaces the count the server reports
 *   about.eyebrow            the small label above the heading of the About page
 *   about.title              the heading ("A, B" is shown as "A," then B in italics)
 *   about.text               the paragraph(s) below the heading: a string, or a list of strings
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
