/**
 * Resume builder (routes /build-resume and /build-resume/:id/edit).
 *
 *   list/        the list of resumes, the new resume dialog and the live thumbnails
 *   editor/      the full-screen editor: top bar, section cards and the live preview
 *   templates/   the paper document (always Daylight) and its page geometry
 *
 * Import from the folder:  import { ResumeList, ResumeEditor } from "./components/resumeBuilder";
 */
export { default as ResumeList } from "./list/ResumeList";
export { default as ResumeEditor } from "./editor/ResumeEditor";
