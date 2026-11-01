import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../../../../../contexts/AuthContext';
import { apiUrl } from '../../../../../config/apiConfig';
import { orderQuestions } from '../model/questions';

/**
 * The questions of one module: GET {apiUrl}/cohorts/:id/modules/:moduleId/questions. The server
 * answers only what a list needs ({ _id, title, type, difficultyLevel, marks, stats }), in storage
 * order; they are put in the order the teacher set (the module's own list of ids).
 *
 * Returns { questions, loading, error, reload }. Switching module clears the previous module's
 * questions at once, so the page never shows one module's questions under another's title, and an
 * answer that arrives late for a module the student has left is ignored.
 *
 * @param {string} cohortId
 * @param {object|null} module   the selected module (with its `questions` ids), or null
 */
export default function useModuleQuestions(cohortId, module) {
  const { token } = useAuth();
  const moduleId = module?._id;
  const [raw, setRaw] = useState([]);
  const [loading, setLoading] = useState(Boolean(moduleId));
  const [error, setError] = useState(null);
  const latest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latest.current;
    setRaw([]);
    setError(null);
    if (!moduleId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${apiUrl}/cohorts/${cohortId}/modules/${moduleId}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (request !== latest.current) return;
      setRaw(Array.isArray(response.data) ? response.data : []);
    } catch {
      if (request !== latest.current) return;
      setError('We could not load the questions of this module. Check your connection and try again.');
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [cohortId, moduleId, token]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  const questions = useMemo(() => orderQuestions(raw, module), [raw, module]);

  return { questions, loading, error, reload: load };
}
