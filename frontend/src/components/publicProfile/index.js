/**
 * publicProfile: the one profile page of the app (route /public-profile/:username).
 *
 * It replaces the two near-identical pages that came before (UserView for signed-in users and
 * PublicUserView for everyone else). The leaderboard, the search and shared links all open this page.
 *
 *   import PublicProfile, { PublicProfileRedirect } from "./components/publicProfile";
 *
 * Plain CSS on the design tokens (publicProfile.css), Phosphor icons, the custom charts from
 * ../custom-components and the kit in ../ui. No Material UI.
 */
export { default, PublicProfileRedirect } from './PublicProfile';
export { default as PublicProfile } from './PublicProfile';
export { profilePath } from './profilePath';
