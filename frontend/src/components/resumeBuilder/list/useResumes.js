import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../../contexts/AuthContext";
import { apiUrl } from "../../../config/apiConfig";

/**
 * The resumes of the list page and the two things a student does to them. The endpoints, the
 * Authorization header and the toasts are the ones the page has always used:
 *
 *   GET    ${apiUrl}/resumes/templates   the template and font catalogues
 *   GET    ${apiUrl}/resumes             { resumes, limit }
 *   POST   ${apiUrl}/resumes             { title, template }
 *   DELETE ${apiUrl}/resumes/:id
 *
 * The first load shows skeletons; reloads after a change refresh quietly behind the cards.
 *
 * @returns {{ resumes: Array, templates: Array, fonts: Array, limit: number, loading: boolean,
 *   failed: boolean, reload: () => Promise<void>,
 *   create: (title: string, template: string) => Promise<string|null>,
 *   remove: (id: string) => Promise<boolean> }}
 */
export default function useResumes() {
  const { token } = useAuth() || {};
  const [state, setState] = useState({
    resumes: [],
    templates: [],
    fonts: [],
    limit: 5,
    loading: true,
    failed: false,
  });
  const alive = useRef(true);

  const authHeader = useMemo(() => ({ headers: { Authorization: `Bearer ${token}` } }), [token]);

  const loadResumes = useCallback(async () => {
    const response = await axios.get(`${apiUrl}/resumes`, authHeader);
    if (!alive.current) return;
    setState((previous) => ({
      ...previous,
      resumes: response.data.resumes || [],
      limit: response.data.limit ?? 5,
    }));
  }, [authHeader]);

  const load = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, failed: false }));
    try {
      const catalogue = await axios.get(`${apiUrl}/resumes/templates`, authHeader);
      if (!alive.current) return;
      setState((previous) => ({
        ...previous,
        templates: catalogue.data.templates || [],
        fonts: catalogue.data.fonts || [],
      }));
      await loadResumes();
      if (alive.current) setState((previous) => ({ ...previous, loading: false }));
    } catch {
      toast.error("Could not load your resumes");
      if (alive.current) setState((previous) => ({ ...previous, loading: false, failed: true }));
    }
  }, [authHeader, loadResumes]);

  useEffect(() => {
    alive.current = true;
    if (token) load();
    return () => {
      alive.current = false;
    };
  }, [token, load]);

  /** Creates a resume and refreshes the list. Returns the new id, or null when it failed. */
  const create = useCallback(
    async (title, template) => {
      try {
        const response = await axios.post(`${apiUrl}/resumes`, { title, template }, authHeader);
        await loadResumes().catch(() => {});
        return response.data._id;
      } catch (err) {
        toast.error(err.response?.data?.message || "Could not create the resume");
        return null;
      }
    },
    [authHeader, loadResumes],
  );

  /** Deletes a resume and refreshes the list. Returns true when the server accepted it. */
  const remove = useCallback(
    async (id) => {
      try {
        await axios.delete(`${apiUrl}/resumes/${id}`, authHeader);
        await loadResumes().catch(() => {});
        toast.success("Resume deleted");
        return true;
      } catch (err) {
        toast.error(err.response?.data?.message || "Could not delete the resume");
        return false;
      }
    },
    [authHeader, loadResumes],
  );

  return { ...state, reload: load, create, remove };
}
