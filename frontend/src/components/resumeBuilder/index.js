/**
 * Resume builder (routes /build-resume and /build-resume/:id/edit).
 *
 *   list/        the list of resumes, the new resume dialog and the thumbnails
 *   editor/      the full-screen editor: top bar, section cards and the live preview
 *
 * A resume is one HTML document. The templates are single .html files on the server
 * (backend/resumeTemplates: structure, styles and {{placeholders}} in one file); the server fills the
 * chosen one with the student's details, and the editor shows the result in a frame. A resume is stored
 * as its template, its details and that HTML.
 *
 * Import from the folder:  import { ResumeList, ResumeEditor } from "./components/resumeBuilder";
 */
export { default as ResumeList } from "./list/ResumeList";
export { default as ResumeEditor } from "./editor/ResumeEditor";
