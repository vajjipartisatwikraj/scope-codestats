import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Keeps a screen honest about an exam's time window.
 *
 * A student can sit on an already-loaded page long after an exam closes, so the
 * page asks the server periodically whether the window is still open. When it
 * is not, the student is told once and sent to their dashboard.
 *
 * The server is the only clock that matters. The poll returns `serverTime`
 * alongside the window, and the local countdown is anchored to the offset
 * between that and the browser clock, so a skewed or edited client clock cannot
 * extend the exam. Enforcement never depends on this hook regardless: every
 * protected route rejects late requests on its own.
 *
 * @param {object} options
 * @param {string} options.cohortId
 * @param {boolean} [options.enabled]        Skip polling entirely (practice cohorts, admins).
 * @param {number}  [options.pollIntervalMs]
 * @param {string}  [options.redirectTo]
 * @returns {{exam: object|null, remainingMs: number|null, isExam: boolean,
 *   state: string|null, expired: boolean, refresh: function}}
 */
const useExamGuard = ({
  cohortId,
  enabled = true,
  pollIntervalMs = 20000,
  redirectTo = "/dashboard",
} = {}) => {
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [title, setTitle] = useState("");
  const [remainingMs, setRemainingMs] = useState(null);
  // Set once the server confirms this cohort is not time-boxed, which stops the
  // polling. Callers can therefore enable the guard unconditionally without
  // adding a recurring request to every practice cohort.
  const [notAnExam, setNotAnExam] = useState(false);

  // Server-minus-client offset, so the ticking countdown follows server time.
  const clockOffsetRef = useRef(0);
  // The redirect must happen exactly once, even if a poll and the local ticker
  // notice the expiry in the same instant.
  const handledExpiryRef = useRef(false);

  const handleExpired = useCallback(
    (message) => {
      if (handledExpiryRef.current) return;
      handledExpiryRef.current = true;

      toast.info(message, { autoClose: 6000 });
      navigate(redirectTo, { replace: true });
    },
    [navigate, redirectTo]
  );

  const fetchStatus = useCallback(async () => {
    if (!cohortId) return null;

    try {
      const { data } = await axios.get(`${apiUrl}/cohorts/${cohortId}/exam-status`);

      if (data?.exam?.serverTime) {
        clockOffsetRef.current =
          new Date(data.exam.serverTime).getTime() - Date.now();
      }

      setExam(data?.exam || null);
      setTitle(data?.title || "");

      if (data?.exam?.isExam) {
        setRemainingMs(
          typeof data.exam.msRemaining === "number" ? data.exam.msRemaining : null
        );
      } else if (data?.exam) {
        setNotAnExam(true);
      }

      // Privileged users are reported as accessible, so they are never evicted.
      if (data && data.accessible === false) {
        if (data.reason === "exam_ended") {
          handleExpired("The exam has ended. Your submissions have been saved.");
        } else if (data.reason === "exam_submitted") {
          handleExpired("Your test has been submitted.");
        }
      }

      return data;
    } catch (error) {
      // A transient network failure must not throw a student out of a live exam.
      // The server still rejects any late request, so failing quiet is safe.
      console.error("Exam status check failed:", error?.message || error);
      return null;
    }
  }, [cohortId, handleExpired]);

  // Poll on mount, on an interval, and whenever the tab regains focus — a
  // backgrounded tab may have had its timers throttled for minutes.
  useEffect(() => {
    if (!enabled || !cohortId || notAnExam) return undefined;

    handledExpiryRef.current = false;
    fetchStatus();

    const interval = setInterval(fetchStatus, pollIntervalMs);
    const onFocus = () => fetchStatus();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, cohortId, notAnExam, pollIntervalMs, fetchStatus]);

  // A different cohort may well be an exam, so the short-circuit resets with it.
  useEffect(() => {
    setNotAnExam(false);
    setExam(null);
    setRemainingMs(null);
    handledExpiryRef.current = false;
  }, [cohortId]);

  // Local countdown between polls, anchored to server time so the displayed
  // clock matches the clock that actually enforces the cut-off.
  useEffect(() => {
    if (!enabled || !exam?.isExam || !exam?.endsAt) return undefined;

    const endMs = new Date(exam.endsAt).getTime();

    const tick = () => {
      const serverNow = Date.now() + clockOffsetRef.current;
      const left = endMs - serverNow;
      setRemainingMs(Math.max(left, 0));

      if (left <= 0) {
        handleExpired("The exam has ended. Your submissions have been saved.");
      }
    };

    tick();
    const ticker = setInterval(tick, 1000);
    return () => clearInterval(ticker);
  }, [enabled, exam?.isExam, exam?.endsAt, handleExpired]);

  return {
    exam,
    title,
    remainingMs,
    isExam: Boolean(exam?.isExam),
    state: exam?.state || null,
    expired: exam?.state === "ended",
    refresh: fetchStatus,
  };
};

export default useExamGuard;
