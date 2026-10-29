/**
 * The editor is a full-screen surface, so the list opens it in its own tab, as it always has.
 */
export const editorPath = (resumeId) => `/build-resume/${resumeId}/edit`;

/**
 * Opens the editor in a new tab. When the browser blocks the pop-up (this runs after a request,
 * so the click may be too old) the editor opens in this tab instead, via `fallback(path)`.
 */
export function openEditorInNewTab(resumeId, fallback) {
  const path = editorPath(resumeId);
  const tab = window.open(path, "_blank");
  if (tab) {
    try {
      // The new tab gets no handle back to this one
      tab.opener = null;
    } catch {
      // Cross-origin tabs refuse; nothing to do
    }
    return;
  }
  if (fallback) fallback(path);
}
