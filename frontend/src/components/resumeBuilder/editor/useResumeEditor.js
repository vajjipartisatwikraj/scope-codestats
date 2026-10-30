import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { apiUrl } from "../../../config/apiConfig";
import { useAuth } from "../../../contexts/AuthContext";
import { downloadHtml, printResume } from "./exportResume";
import { applyProfile } from "./resumeDetails";

const EMPTY = { title: "", template: "", details: {} };

const PREVIEW_DELAY = 250;
// How many steps each global layout control can move from the template as designed
export const LAYOUT_LIMIT = 4;

/**
 * Everything the editor knows and does, kept out of the components.
 *
 *   GET  ${apiUrl}/resumes/templates      the templates: name, the sections and fields each one uses
 *   GET  ${apiUrl}/resumes/:id            the resume { title, template, details, html }
 *   PUT  ${apiUrl}/resumes/:id            save { title, template, details }
 *   POST ${apiUrl}/resumes/render         the preview of unsaved details: { html }
 *   GET  ${apiUrl}/resumes/profile-data   the snapshot "Import from profile" applies
 *
 * `draft` is what the student sees; `saved` is the last copy the server confirmed. `dirty` is true while
 * they differ, and the beforeunload warning follows it. The preview is the server's HTML for the draft,
 * asked for a moment after the last keystroke, so what you see is what is saved and printed.
 *
 * @param id  the resume id from the route
 */
export default function useResumeEditor(id) {
  const auth = useAuth();
  const token = auth?.token;

  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null); // { missing, message }
  const [reloadKey, setReloadKey] = useState(0);

  const [templates, setTemplates] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saved, setSaved] = useState(JSON.stringify(EMPTY));
  const [updatedAt, setUpdatedAt] = useState(null);
  const [html, setHtml] = useState("");
  const [previewing, setPreviewing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // The last thing worth announcing to a screen reader ("Saved", "Unsaved changes")
  const [announcement, setAnnouncement] = useState("");

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const previewRun = useRef(0);
  // The HTML that arrives with the resume already matches the draft, so the first draft is not redrawn
  const skipPreview = useRef(false);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    const previousTitle = document.title;

    const load = async () => {
      setPhase("loading");
      setError(null);
      try {
        const [templatesResponse, resumeResponse] = await Promise.all([
          axios.get(`${apiUrl}/resumes/templates`, authHeader),
          axios.get(`${apiUrl}/resumes/${id}`, authHeader),
        ]);
        if (cancelled) return;

        const templateList = templatesResponse.data.templates || [];
        const resume = resumeResponse.data;
        const template = templateList.find((item) => item.id === resume.template) || templateList[0];

        const next = { title: resume.title, template: template?.id || resume.template, details: resume.details || {} };

        skipPreview.current = true;
        setTemplates(templateList);
        setDraft(next);
        setSaved(JSON.stringify(next));
        setUpdatedAt(resume.updatedAt);
        setHtml(resume.html || "");
        setPhase("ready");
        document.title = `${resume.title} · Resume Builder`;
      } catch (err) {
        if (cancelled) return;
        setError({
          missing: err.response?.status === 404,
          message:
            err.response?.status === 404
              ? "This resume no longer exists."
              : "Could not load this resume. Please try again.",
        });
        setPhase("error");
      }
    };

    load();
    return () => {
      cancelled = true;
      document.title = previousTitle;
    };
  }, [id, token, authHeader, reloadKey]);

  const template = useMemo(
    () => templates.find((item) => item.id === draft.template),
    [templates, draft.template],
  );

  const dirty = phase === "ready" && JSON.stringify(draft) !== saved;

  // The preview follows the draft: the server draws it a moment after the last change
  useEffect(() => {
    if (phase !== "ready") return undefined;
    if (skipPreview.current) {
      skipPreview.current = false;
      return undefined;
    }
    const run = ++previewRun.current;
    setPreviewing(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await axios.post(
          `${apiUrl}/resumes/render`,
          { template: draft.template, details: draft.details },
          authHeader,
        );
        if (run === previewRun.current) setHtml(response.data.html);
      } catch {
        // The last preview stays on screen; the next change tries again
      } finally {
        if (run === previewRun.current) setPreviewing(false);
      }
    }, PREVIEW_DELAY);
    return () => window.clearTimeout(timer);
  }, [phase, draft.template, draft.details, authHeader]);

  // Announce a change of state once, not every time the clock moves
  useEffect(() => {
    if (phase !== "ready") return;
    if (dirty) setAnnouncement("Unsaved changes");
  }, [dirty, phase]);

  // Warn before losing unsaved edits
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  const setTitle = useCallback((title) => setDraft((prev) => ({ ...prev, title })), []);

  // The details are the same for every template, so switching keeps everything the student wrote
  const changeTemplate = useCallback((templateId) => setDraft((prev) => ({ ...prev, template: templateId })), []);

  const changeField = useCallback(
    (key, value) => setDraft((prev) => ({ ...prev, details: { ...prev.details, [key]: value } })),
    [],
  );

  // A section's own heading ("Work history" instead of "Experience"); empty goes back to the default
  const changeSectionTitle = useCallback(
    (key, text) =>
      setDraft((prev) => {
        const titles = { ...(prev.details.titles || {}) };
        if (text) titles[key] = text;
        else delete titles[key];
        return { ...prev, details: { ...prev.details, titles } };
      }),
    [],
  );

  // The global text size, gaps and padding: one step either way (-4 to 4, 0 as the template is designed)
  const changeLayout = useCallback(
    (key, change) =>
      setDraft((prev) => {
        const layout = { font: 0, gap: 0, pad: 0, ...(prev.details.layout || {}) };
        layout[key] = Math.max(-LAYOUT_LIMIT, Math.min(LAYOUT_LIMIT, (layout[key] || 0) + change));
        return { ...prev, details: { ...prev.details, layout } };
      }),
    [],
  );

  const resetLayout = useCallback(
    () => setDraft((prev) => ({ ...prev, details: { ...prev.details, layout: { font: 0, gap: 0, pad: 0 } } })),
    [],
  );

  // Whether a section starts on a new page
  const changeBreak = useCallback(
    (key, on) =>
      setDraft((prev) => {
        const breaks = { ...(prev.details.breaks || {}) };
        if (on) breaks[key] = true;
        else delete breaks[key];
        return { ...prev, details: { ...prev.details, breaks } };
      }),
    [],
  );

  // Prefills the draft from the saved profile. Only the draft changes, so the preview reflects it at
  // once and Save stays under the student's control.
  const importFromProfile = useCallback(async () => {
    if (!template) return;
    setImporting(true);
    try {
      const response = await axios.get(`${apiUrl}/resumes/profile-data`, authHeader);
      const { details: imported, applied } = applyProfile(draft.details, response.data.profile, template.sections);

      if (applied.length === 0) {
        toast.info("Your profile has nothing to import yet");
        return;
      }

      setDraft((prev) => ({ ...prev, details: imported }));
      toast.success(`Imported ${applied.length} section${applied.length > 1 ? "s" : ""} from your profile`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not import from your profile");
    } finally {
      setImporting(false);
    }
  }, [authHeader, template, draft.details]);

  /**
   * Saves the draft. Resolves to "saved", "invalid" (no name) or "failed".
   * Text typed while the request is in flight is kept: only an untouched draft is replaced by the
   * server's copy.
   */
  const save = useCallback(async () => {
    if (!draft.title.trim()) {
      toast.error("Resume name is required");
      return "invalid";
    }

    const sent = draft;
    setSaving(true);
    setAnnouncement("Saving");
    try {
      const response = await axios.put(`${apiUrl}/resumes/${id}`, sent, authHeader);
      const next = {
        title: response.data.title,
        template: response.data.template,
        details: response.data.details,
      };
      setSaved(JSON.stringify(next));
      // Only an untouched draft takes the server's cleaned copy; otherwise the typing goes on
      setDraft((current) => (current === sent ? next : current));
      setUpdatedAt(response.data.updatedAt);
      document.title = `${next.title} · Resume Builder`;
      setAnnouncement("Resume saved");
      toast.success("Resume saved");
      return "saved";
    } catch (err) {
      setAnnouncement("Could not save");
      toast.error(err.response?.data?.message || "Could not save the resume");
      return "failed";
    } finally {
      setSaving(false);
    }
  }, [draft, id, authHeader]);

  /** Exports the resume as previewed: the draft, including edits that are not saved yet */
  const exportAs = useCallback(
    async (format) => {
      if (!html) return;
      setExporting(true);
      try {
        if (format === "html") {
          downloadHtml(html, draft.title);
          toast.success("HTML file downloaded");
        } else {
          await printResume(html, draft.title);
        }
      } catch (err) {
        toast.error(err.message || "Could not export the resume");
      } finally {
        setExporting(false);
      }
    },
    [html, draft.title],
  );

  return {
    phase,
    error,
    templates,
    draft,
    template,
    html,
    previewing,
    dirty,
    updatedAt,
    saving,
    importing,
    exporting,
    announcement,
    retry,
    setTitle,
    changeTemplate,
    changeField,
    changeSectionTitle,
    changeBreak,
    changeLayout,
    resetLayout,
    importFromProfile,
    save,
    exportAs,
  };
}
