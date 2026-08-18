import { useCallback, useEffect, useRef, useState } from "react";
import axios from "../utils/axiosConfig";
import { apiUrl } from "../config/apiConfig";

/**
 * Exam integrity monitoring for an exam session tab.
 *
 * Watches three things and reports each to the server, which owns the counters:
 *   - leaving fullscreen
 *   - switching tab or minimising (`visibilitychange`)
 *   - moving focus to another window while this tab is still visible (`blur`)
 *
 * Accuracy notes, which is where naive implementations go wrong:
 *   - `visibilitychange` and `blur` both fire for a single alt-tab, which would
 *     double count. A short suppression window collapses the pair into one tab
 *     switch, and a plain `blur` is only recorded once that window passes.
 *   - Leaving fullscreen via Esc also fires `blur` in some browsers, so a
 *     fullscreen exit likewise suppresses the blur that follows it.
 *   - Entering fullscreen fires a `fullscreenchange` too; only transitions to
 *     "not fullscreen" count.
 *   - Events are queued and retried, so a dropped request does not silently
 *     lose a violation.
 *
 * The counters displayed here are the server's response, never a local tally.
 */

/** Two events landing inside this window are treated as one incident. */
const DEDUPE_WINDOW_MS = 1200;

const isFullscreen = () =>
  Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
  );

const requestFullscreen = async (element = document.documentElement) => {
  const request =
    element.requestFullscreen ||
    element.webkitRequestFullscreen ||
    element.mozRequestFullScreen ||
    element.msRequestFullscreen;

  if (!request) return false;
  try {
    await request.call(element);
    return true;
  } catch {
    // Browsers reject this outside a user gesture; the caller re-prompts.
    return false;
  }
};

const useExamProctor = ({
  cohortId,
  enabled = false,
  onWarning = null,
} = {}) => {
  const [fullscreen, setFullscreen] = useState(isFullscreen());
  const [counters, setCounters] = useState({
    tabSwitchCount: 0,
    fullscreenExitCount: 0,
    windowBlurCount: 0,
  });

  // Timestamp of the last recorded incident, used to collapse duplicate events.
  const lastEventAtRef = useRef(0);
  const queueRef = useRef([]);
  const flushingRef = useRef(false);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  // Set the moment the page starts to go away (reload, close, navigation).
  //
  // Teardown fires `visibilitychange` → hidden and `fullscreenchange` → not
  // fullscreen, which would otherwise be recorded as a tab switch and a
  // fullscreen exit on every refresh. Neither is something the student did, so
  // reporting stops as soon as the unload begins.
  const unloadingRef = useRef(false);

  /** Sends queued events one at a time, keeping anything that fails. */
  const flushQueue = useCallback(async () => {
    if (flushingRef.current || !cohortId) return;
    flushingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const event = queueRef.current[0];
        try {
          const { data } = await axios.post(
            `${apiUrl}/cohorts/${cohortId}/proctor/event`,
            event
          );
          queueRef.current.shift();
          if (data?.counters) setCounters(data.counters);
        } catch (error) {
          // Leave it queued and try again on the next event or unmount.
          console.error("Proctor event not recorded:", error?.message || error);
          break;
        }
      }
    } finally {
      flushingRef.current = false;
    }
  }, [cohortId]);

  const report = useCallback(
    (type, detail) => {
      if (!enabledRef.current || !cohortId) return;
      // Anything emitted by page teardown is not a student action.
      if (unloadingRef.current && type !== "session_start") return;
      queueRef.current.push({ type, ...(detail ? { detail } : {}) });
      flushQueue();
    },
    [cohortId, flushQueue]
  );

  /** True when an incident was already recorded moments ago. */
  const withinDedupeWindow = () =>
    Date.now() - lastEventAtRef.current < DEDUPE_WINDOW_MS;

  const markIncident = () => {
    lastEventAtRef.current = Date.now();
  };

  /** Puts the page into fullscreen. Must be called from a user gesture. */
  const enterFullscreen = useCallback(async () => {
    const ok = await requestFullscreen();
    setFullscreen(isFullscreen());
    return ok;
  }, []);

  // Mark attendance as soon as monitoring starts.
  useEffect(() => {
    if (!enabled || !cohortId) return;
    report("session_start");
  }, [enabled, cohortId, report]);

  useEffect(() => {
    if (!enabled || !cohortId) return undefined;

    const handleFullscreenChange = () => {
      const active = isFullscreen();
      setFullscreen(active);

      if (!active) {
        markIncident();
        report("fullscreen_exit", "Left fullscreen mode");
        onWarning?.({
          type: "fullscreen_exit",
          message:
            "You left fullscreen. This is recorded. Return to fullscreen to continue.",
        });
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") return;

      // A tab switch is the stronger signal, so it wins over the blur that
      // accompanies it.
      markIncident();
      report("tab_switch", "Tab hidden or window minimised");
      onWarning?.({
        type: "tab_switch",
        message: "Switching tabs during the exam is recorded.",
      });
    };

    const handleBlur = () => {
      // Only count a blur that is not part of a tab switch or fullscreen exit
      // already recorded in the last moment.
      if (document.visibilityState === "hidden" || withinDedupeWindow()) return;

      markIncident();
      report("window_blur", "Focus moved to another window");
      onWarning?.({
        type: "window_blur",
        message: "Leaving the exam window is recorded.",
      });
    };

    // A refresh or close begins here. Marking it first means the events that
    // teardown emits are ignored rather than logged against the student.
    const handleUnload = () => {
      unloadingRef.current = true;
    };

    /**
     * Fullscreen can only be requested from a user gesture, so after a reload
     * the first click or key press restores it. This is what makes a refresh
     * recover on its own instead of waiting on the dialog button.
     */
    const restoreFullscreenOnGesture = () => {
      if (!enabledRef.current || isFullscreen()) return;
      requestFullscreen().then(() => setFullscreen(isFullscreen()));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    document.addEventListener("pointerdown", restoreFullscreenOnGesture);
    document.addEventListener("keydown", restoreFullscreenOnGesture);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
      document.removeEventListener("pointerdown", restoreFullscreenOnGesture);
      document.removeEventListener("keydown", restoreFullscreenOnGesture);
      // Last chance to deliver anything still queued.
      flushQueue();
    };
  }, [enabled, cohortId, report, flushQueue, onWarning]);

  return { fullscreen, counters, enterFullscreen, isFullscreen };
};

export default useExamProctor;
