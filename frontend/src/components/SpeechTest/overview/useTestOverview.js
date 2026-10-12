import { useCallback, useEffect, useRef, useState } from "react";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import useNotFoundRedirect from "../useNotFoundRedirect";

const PENDING = ["queued", "scoring"];

/**
 * Loads a student's view of a test and keeps it fresh.
 *
 * - While any section is waiting for its score, it re-checks every few seconds,
 *   so results appear on their own.
 * - It also refreshes when the student returns to the tab.
 * - `windowState` ("upcoming" | "live" | "ended") follows the server clock, not
 *   the browser's, so a skewed PC clock cannot open a closed test.
 */
const useTestOverview = (id) => {
  const redirectIfNotFound = useNotFoundRedirect();
  const [test, setTest] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [feedbackDone, setFeedbackDone] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const offsetRef = useRef(0);

  const reload = useCallback(async () => {
    try {
      const data = await studentApi.get(id);
      offsetRef.current = new Date(data.serverTime).getTime() - Date.now();
      setTest(data.test);
      setAttempt(data.attempt);
      setFeedbackDone(data.feedbackDone !== false);
      setError("");
    } catch (err) {
      if (redirectIfNotFound(err)) return;
      setError(apiErrorMessage(err, "Could not load this test"));
    } finally {
      setLoading(false);
    }
  }, [id, redirectIfNotFound]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const hasPending = Boolean(attempt?.sections?.some((s) => PENDING.includes(s.status)));
  useEffect(() => {
    if (!hasPending) return undefined;
    const poll = setInterval(reload, 4000);
    return () => clearInterval(poll);
  }, [hasPending, reload]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && reload();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  const serverNow = now + offsetRef.current;
  const windowState = !test
    ? null
    : serverNow < new Date(test.startTime).getTime()
    ? "upcoming"
    : serverNow >= new Date(test.endTime).getTime()
    ? "ended"
    : "live";

  return { test, attempt, setAttempt, feedbackDone, loading, error, windowState, reload };
};

export default useTestOverview;
