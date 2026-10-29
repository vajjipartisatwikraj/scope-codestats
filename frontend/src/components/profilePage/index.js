/**
 * profilePage: the signed-in student's own profile (route /profile).
 *
 *   import ProfilePage from "./components/profilePage";
 *
 * A student who has not finished setting up gets a four-step setup (SetupWizard); everyone else gets
 * the profile (ProfileManage): the person and how complete the profile is, what to do next, and each
 * part as a card with its own editor. What other people see is the public profile
 * (components/publicProfile); this page is where it is kept up to date.
 *
 *   profilePage.css   plain CSS on the design tokens (prefix pf-)
 *   useProfileData    every read and write
 *   profileModel      the lists, the rules and the payloads
 *   completion        how complete the profile is, and what is next
 *   parts/            SectionCard (a card with one way to edit) and SectionEditor (the one drawer)
 *   forms/            the fields of each part; the editors and the setup both use them
 *   sections/         the read view of each part
 *   manage/           the page for a finished profile
 *   setup/            the first-time setup
 */
export { default } from './ProfilePage';
export { default as ProfilePage } from './ProfilePage';
