/**
 * The brand of this build: which platform it is and which institution runs it. Everything that shows
 * a logo, a picture or a name reads it from here instead of writing it into the page.
 *
 *   import brand, { fill } from '.';
 *   <img src={brand.platform.logo} alt="" />
 *   <h1>{brand.platform.name}</h1>
 *   <p>{fill('Built by {club} for {institutionFull}.')}</p>
 *
 * Four variables in frontend/.env choose it, read when the app is built (change one, build again):
 *
 *   VITE_PLATFORM          the folder in src/brand/platforms/      images of the platform    (codestats)
 *   VITE_INSTITUTION       the folder in src/brand/institutions/   images of the institution (mlrit)
 *   VITE_PLATFORM_NAME     the platform's name in all text         (default: the name in its brand.json)
 *   VITE_INSTITUTION_NAME  the institution's name in all text      (default: the name in its brand.json)
 *
 * The two folders are chosen by vite.config.mjs through the aliases below, so the images of the
 * brands that are not chosen are not part of the build. Add a platform or an institution by adding a
 * folder; nothing else changes.
 */
// eslint-disable-next-line import/no-unresolved
import platformBrand from '@platform';
// eslint-disable-next-line import/no-unresolved
import institutionBrand from '@institution';
import { fill as fillNames, namesOf } from './fill.mjs';
import codeStatsLogo from './platforms/codestats/logo.png';
import notFoundDark from './shared/404-dark.png';
import notFoundLight from './shared/404-light.png';
import notFoundPicture from './shared/notFound.png';
import carousel1 from './shared/carousel1.png';
import carousel2 from './shared/carousel2.png';
import carousel3 from './shared/carousel3.png';
import carousel4 from './shared/carousel4.png';

const env = import.meta.env;

// A name set in the environment wins over the one in the brand folder. The institution's full name
// follows it, so a sentence never mixes the new short name with the old long one.
const platformName = (env.VITE_PLATFORM_NAME || '').trim();
const institutionName = (env.VITE_INSTITUTION_NAME || '').trim();
const platform = { ...platformBrand, name: platformName || platformBrand.name };
const institution = {
  ...institutionBrand,
  name: institutionName || institutionBrand.name,
  fullName: institutionName || institutionBrand.fullName,
};

const names = namesOf(platform, institution);

/** Replaces {platform}, {institution}, {institutionFull}, {club}, {clubShort} and {builder} in a text */
export const fill = (text) => fillNames(text, names);

const brand = {
  platform,
  institution,
  // Used in sentences such as "Built by {builder} for {institutionFull}"
  names,
  // CodeStats itself, whatever the platform and the institution are. The student's own coding work
  // (cohorts and the practice arena) is always "CodeStats" in the platform stats, the leaderboard and the profile.
  codeStats: { name: 'CodeStats', logo: codeStatsLogo },
  // Pictures every platform and institution uses: the not-found art and the sign-in and sign-up carousel
  shared: { notFoundDark, notFoundLight, notFound: notFoundPicture, carousel: [carousel1, carousel2, carousel3, carousel4] },
  fill,
};

export { platform, institution };
export default brand;
