import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminApi, leaderboard as fetchLeaderboard, apiErrorMessage } from "../../../services/speechTestApi";
import { useNotFoundRedirect } from "../shared";

/**
 * Loads the results of a speech test: the staff results (every attempt, also those still in
 * progress) or the students' leaderboard (finished attempts only).
 *
 * Same requests and the same handling as the old SpeechTestLeaderboard: a missing test goes to the
 * 404 page, any other failure is a toast. New: `error` (so the page can offer Retry when nothing
 * has loaded yet) and `refreshing` (a reload keeps the rows on screen instead of replacing them
 * with a spinner).
 */
const useSpeechLeaderboard = (testId, isAdmin) => {
  const redirectIfNotFound = useNotFoundRedirect();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);
  const [entries, setEntries] = useState([]);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = isAdmin ? await adminApi.results(testId) : await fetchLeaderboard(testId);
      setMeta(data.test);
      setEntries(data.entries || []);
      setError("");
    } catch (err) {
      if (redirectIfNotFound(err)) return;
      const message = apiErrorMessage(err, "Could not load the leaderboard");
      toast.error(message);
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [testId, isAdmin, redirectIfNotFound]);

  useEffect(() => {
    load();
  }, [load]);

  return { loading, refreshing, error, meta, entries, reload: load };
};

export default useSpeechLeaderboard;
