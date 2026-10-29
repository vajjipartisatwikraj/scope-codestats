import { useCallback, useEffect, useState } from "react";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import { useNotFoundRedirect } from "../shared";

/**
 * Loads the detailed results report of one section.
 *
 * Same request and same redirect on "not found" as the old hook (SpeechTest/results). Added for
 * the new screen: `reload()` asks again (the Retry and "Check again" buttons) and `notReady` is
 * true when the server answers 409, "the results for this section are not ready yet", so the
 * page can say scoring is still running instead of showing a failure.
 */
const useSectionResults = (id, sectionId) => {
  const redirectIfNotFound = useNotFoundRedirect();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notReady, setNotReady] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setNotReady(false);

    studentApi
      .sectionResults(id, sectionId)
      .then((data) => {
        if (!cancelled) setReport(data.report);
      })
      .catch((err) => {
        if (cancelled || redirectIfNotFound(err)) return;
        setNotReady(err?.response?.status === 409);
        setError(apiErrorMessage(err, "Could not load these results"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, sectionId, redirectIfNotFound, attempt]);

  return { report, loading, error, notReady, reload };
};

export default useSectionResults;
