import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { apiUrl } from "../../../config/apiConfig";
import { useAuth } from "../../../contexts/AuthContext";
import {
  applyProfileSnapshot,
  buildFields,
  isResumeDirty,
  setFieldValue,
} from "../../../utils/resume";
import { exportResumeAsWord } from "../../../utils/resumeExport";
import { downloadResumePdf } from "../../../utils/resumePdf";

const EMPTY = { title: "", template: "", font: "", fields: [] };

/**
 * Everything the editor knows and does, kept out of the components. The endpoints, the
 * Authorization header and the toasts are the ones the editor has always used:
 *
 *   GET ${apiUrl}/resumes/templates      the template and font catalogues
 *   GET ${apiUrl}/resumes/:id            the resume
 *   PUT ${apiUrl}/resumes/:id            save { title, template, font, fields }
 *   GET ${apiUrl}/resumes/profile-data   the snapshot "Import from profile" applies
 *
 * `draft` is what the student sees; `saved` is the last copy the server confirmed. `dirty` is
 * true while they differ, and the beforeunload warning follows it.
 *
 * @param id  the resume id from the route
 * @returns the state ({ phase, error, templates, fonts, draft, template, font, dirty, updatedAt,
 *   saving, importing, exporting, announcement }) and the actions
 */
export default function useResumeEditor(id) {
  const auth = useAuth();
  const token = auth?.token;

  const [phase, setPhase] = useState("loading"); // loading | ready | error
  const [error, setError] = useState(null); // { missing, message }
  const [reloadKey, setReloadKey] = useState(0);

  const [templates, setTemplates] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [draft, setDraft] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [updatedAt, setUpdatedAt] = useState(null);

  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  // The last thing worth announcing to a screen reader ("Saved", "Unsaved changes")
  const [announcement, setAnnouncement] = useState("");

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

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
        const fontList = templatesResponse.data.fonts || [];
        const resume = resumeResponse.data;
        const template = templateList.find((item) => item.id === resume.template) || templateList[0];
        const font =
          fontList.find((item) => item.id === resume.font) ||
          fontList.find((item) => item.id === templatesResponse.data.defaultFont) ||
          fontList[0];

        const next = {
          title: resume.title,
          template: template?.id || resume.template,
          font: font?.id || resume.font || "",
          fields: buildFields(template, resume.fields),
        };

        setTemplates(templateList);
        setFonts(fontList);
        setDraft(next);
        setSaved(next);
        setUpdatedAt(resume.updatedAt);
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

  const font = useMemo(
    () => fonts.find((item) => item.id === draft.font) || fonts[0],
    [fonts, draft.font],
  );

  const dirty = template ? isResumeDirty(draft, saved) : false;

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
  const setFont = useCallback((nextFont) => setDraft((prev) => ({ ...prev, font: nextFont })), []);

  // Switching template remaps the fields onto the new definition
  const changeTemplate = useCallback(
    (templateId) => {
      const nextTemplate = templates.find((item) => item.id === templateId);
      if (!nextTemplate) return;
      setDraft((prev) => ({
        ...prev,
        template: templateId,
        fields: buildFields(nextTemplate, prev.fields),
      }));
    },
    [templates],
  );

  const changeField = useCallback(
    (key, patch) => setDraft((prev) => ({ ...prev, fields: setFieldValue(prev.fields, key, patch) })),
    [],
  );

  // Prefills the draft from the saved profile. Only the draft changes, so the preview reflects it
  // at once and Save stays under the student's control.
  const importFromProfile = useCallback(async () => {
    setImporting(true);
    try {
      const response = await axios.get(`${apiUrl}/resumes/profile-data`, authHeader);
      const { fields: importedFields, applied } = applyProfileSnapshot(
        template,
        draft.fields,
        response.data.profile,
      );

      if (applied.length === 0) {
        toast.info("Your profile has nothing to import yet");
        return;
      }

      setDraft((prev) => ({ ...prev, fields: importedFields }));
      toast.success(
        `Imported ${applied.length} section${applied.length > 1 ? "s" : ""} from your profile`,
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not import from your profile");
    } finally {
      setImporting(false);
    }
  }, [authHeader, template, draft.fields]);

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
        font: response.data.font,
        fields: buildFields(template, response.data.fields),
      };
      setSaved(next);
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
  }, [draft, id, authHeader, template]);

  /**
   * Exports the resume exactly as previewed. Works on the current draft, so unsaved edits are
   * included. `node` is the unclipped copy of the template the editor keeps off-screen.
   */
  const exportAs = useCallback(
    async (format, node) => {
      if (!template) return;
      setExporting(true);
      try {
        if (format === "word") {
          exportResumeAsWord({ node, title: draft.title || "resume", page: template.page });
          toast.success("Word document downloaded");
        } else {
          await downloadResumePdf({
            template,
            fields: draft.fields,
            font,
            title: draft.title || "resume",
          });
          toast.success("PDF downloaded");
        }
      } catch (err) {
        toast.error(err.message || "Could not export the resume");
      } finally {
        setExporting(false);
      }
    },
    [template, draft.title, draft.fields, font],
  );

  return {
    phase,
    error,
    templates,
    fonts,
    draft,
    template,
    font,
    dirty,
    updatedAt,
    saving,
    importing,
    exporting,
    announcement,
    retry,
    setTitle,
    setFont,
    changeTemplate,
    changeField,
    importFromProfile,
    save,
    exportAs,
  };
}
