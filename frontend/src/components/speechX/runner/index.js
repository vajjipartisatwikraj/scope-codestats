/**
 * speechX/runner: the question screen of a running speech test section
 * (route /speech-tests/:id/sections/:sectionId).
 *
 * Same layout and flow as the screen it replaces (fixed top bar with the title, section label,
 * progress, timer and locked brand; the question list on the left, a block on top on phones; the
 * question, recorder and footer navigation on the right; the review page that swaps in without
 * leaving the route; the submit dialogs and the submitting overlay), rebuilt on plain CSS and the
 * theme tokens with no Material UI. All behaviour is in useSectionRunner.js, copied unchanged
 * apart from one import path.
 *
 * Import:  import SpeechSectionRunner from "./components/speechX/runner";
 *     or:  import { SectionRunner } from "./components/speechX/runner";
 */
import SectionRunner from "./SectionRunner";

export { SectionRunner };
export default SectionRunner;
