/**
 * The address of a student's profile page. Every link to a profile in the app should come from here
 * (or from the same shape): /public-profile/<the part of the email before the "@">.
 *
 * @param {string} emailOrUsername  an email address, or the name that is already before the "@"
 * @returns {string|null}  null when there is nothing to link to
 */
export const profilePath = (emailOrUsername) => {
  const text = String(emailOrUsername || '').trim();
  const username = text.includes('@') ? text.split('@')[0] : text;
  return username ? `/public-profile/${encodeURIComponent(username)}` : null;
};
