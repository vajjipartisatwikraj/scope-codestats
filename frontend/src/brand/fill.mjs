/**
 * Fills the name tokens of a brand text.
 *
 *   {platform}        the platform's name              CodeStats
 *   {institution}     the institution's short name     MLRIT
 *   {institutionFull} the institution's full name       MLR Institute of Technology
 *   {club}            the institution's club            SCOPE Club
 *   {clubShort}       the club's short name             SCOPE
 *   {builder}         who built the platform: the institution's club if it has one, otherwise CodeStats.
 *                     Use it for "built by ..." so a platform is never said to be built by an institution
 *                     that did not build it.
 *
 * It is a plain .mjs file with no imports, so both the app (src/brand/index.js) and the build
 * (vite-brand-plugin.mjs, which fills index.html and the web app manifest) use the same code.
 */
export function namesOf(platform, institution) {
  const club = institution.clubName || institution.name;
  return {
    platform: platform.name,
    institution: institution.name,
    institutionFull: institution.fullName || institution.name,
    club,
    clubShort: institution.clubShortName || club,
    builder: institution.clubName || 'CodeStats',
  };
}

export function fill(text, names) {
  return String(text ?? '').replace(/\{(platform|institution|institutionFull|club|clubShort|builder)\}/g, (_, key) => names[key] ?? '');
}
