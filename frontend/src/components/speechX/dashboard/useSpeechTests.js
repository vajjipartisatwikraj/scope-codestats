import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";

const POLL_MS = 30000;

/**
 * The student's assigned tests, kept fresh.
 *
 * Logic of the old SpeechTestDashboard, unchanged: the list is fetched on mount and every 30
 * seconds, a one second tick re-renders the countdowns, and the window state of a test
 * ("upcoming" | "live" | "ended") follows the server clock, not the browser's, so a skewed PC
 * clock cannot open a closed test. A failed request shows the same toast as before; `error` also
 * lets the page show a notice with Retry when there is nothing to show yet.
 */
const useSpeechTests = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  // Server minus browser clock
  const offsetRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.myTests();
      offsetRef.current = new Date(data.serverTime).getTime() - Date.now();
      setTests(data.tests || []);
      setError("");
    } catch (err) {
      const message = apiErrorMessage(err, "Could not load your speech tests");
      // One toast at a time, so a failing 30 second poll does not pile them up
      toast.error(message, { toastId: "speech-tests-load" });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const poll = setInterval(load, POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    load();
  }, [load]);

  const serverNow = now + offsetRef.current;
  const stateOf = (test) => {
    if (serverNow < new Date(test.startTime).getTime()) return "upcoming";
    if (serverNow >= new Date(test.endTime).getTime()) return "ended";
    return "live";
  };

  return { tests, loading, error, retry, serverNow, stateOf };
};

export default useSpeechTests;
