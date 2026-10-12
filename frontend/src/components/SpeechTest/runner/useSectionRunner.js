import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import useNotFoundRedirect from "../useNotFoundRedirect";
import { cancelSpeech, speak } from "../../../utils/browserSpeech";
import {
  clearSectionDrafts,
  getSectionDrafts,
  markDraftSynced,
  saveDraft,
} from "../../../utils/speechDraftStore";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const RETRY_TICK_MS = 4000;

/** True once an answer holds something the server can score. */
export const hasContent = (answer) => Boolean(answer && (answer.kind === "audio" || answer.text));

/**
 * All state and side effects of one running section. The screen components only
 * render what this returns.
 *
 * Time: the deadline comes from the server when the section starts. This hook
 * mirrors it, using the offset between server and browser clocks, and
 * auto-submits at zero. If the page is closed, the server submits at the
 * deadline anyway.
 *
 * Safety: every answer is written to IndexedDB, then uploaded to the server.
 * Failed uploads retry in the background and are flushed before a submit, so a
 * dropped connection never costs the student an answer. A submit reads the
 * stored answers on the server, not anything held in the page.
 *
 * Leaving: reload and tab close trigger the browser's own confirmation (browsers
 * do not allow custom text there). Back and the Exit button open our own dialog
 * offering to submit the section.
 */
const useSectionRunner = (id, sectionId) => {
  const navigate = useNavigate();
  const redirectIfNotFound = useNotFoundRedirect();

  const [phase, setPhase] = useState("loading"); // loading | running | submitting | error
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [arrangements, setArrangements] = useState({});
  const [index, setIndex] = useState(0);
  const [remainingMs, setRemainingMs] = useState(null);
  const [dialog, setDialog] = useState(null); // null | "submit" | "leave"
  const [speaking, setSpeaking] = useState(false);

  const answersRef = useRef({});
  const chainRef = useRef({});
  const inflightRef = useRef(new Set());
  const recorderRef = useRef(null);
  const attemptIdRef = useRef(null);
  const deadlineRef = useRef(0);
  const offsetRef = useRef(0);
  const submittingRef = useRef(false);
  const autoSubmitRef = useRef(false);
  const finishedRef = useRef(false);
  const submitRef = useRef(null);
  const flushTypingRef = useRef(null); // set below; submit() runs earlier in the file

  // ---- answer state helpers ----------------------------------------------
  const commitAnswers = useCallback(() => setAnswers({ ...answersRef.current }), []);

  const patchAnswer = useCallback(
    (questionId, patch) => {
      const current = answersRef.current[questionId];
      if (!current) return;
      answersRef.current[questionId] = { ...current, ...patch };
      commitAnswers();
    },
    [commitAnswers]
  );

  const leaveToOverview = useCallback(
    (message) => {
      finishedRef.current = true;
      if (message) toast.info(message);
      navigate(`/speech-tests/${id}`, { replace: true });
    },
    [id, navigate]
  );

  // ---- uploads -------------------------------------------------------------
  const uploadLatest = useCallback(
    async (questionId) => {
      const answer = answersRef.current[questionId];
      if (!answer || answer.status === "saved") return;

      inflightRef.current.add(questionId);
      const { version } = answer;
      patchAnswer(questionId, { status: "saving" });

      try {
        if (answer.kind === "audio") {
          // A restored answer has no local audio; the server already holds it.
          if (answer.blob) {
            await studentApi.saveAudioAnswer(id, sectionId, questionId, answer.blob);
          }
        } else {
          await studentApi.saveTextAnswer(id, sectionId, questionId, answer.text || "");
        }

        if (answersRef.current[questionId]?.version === version) {
          patchAnswer(questionId, { status: "saved" });
          markDraftSynced(attemptIdRef.current, questionId);
        } else {
          // Changed while uploading: the newer value still has to go up.
          patchAnswer(questionId, { status: "pending" });
        }
      } catch (error) {
        const code = error?.response?.data?.code;
        if (code === "SECTION_CLOSED" || code === "SECTION_TIME_UP") {
          leaveToOverview("This section was already submitted.");
          return;
        }
        patchAnswer(questionId, { status: "error" });
      } finally {
        inflightRef.current.delete(questionId);
      }
    },
    [id, sectionId, patchAnswer, leaveToOverview]
  );

  const scheduleUpload = useCallback(
    (questionId) => {
      const previous = chainRef.current[questionId] || Promise.resolve();
      chainRef.current[questionId] = previous
        .then(() => uploadLatest(questionId))
        .catch(() => {});
    },
    [uploadLatest]
  );

  /** Waits until every answer is on the server, or the time budget runs out. */
  const flushUploads = useCallback(
    async (timeoutMs) => {
      const stopAt = Date.now() + timeoutMs;
      for (;;) {
        const unsaved = Object.entries(answersRef.current).filter(([, a]) => a.status !== "saved");
        if (unsaved.length === 0) return true;

        unsaved.forEach(([questionId]) => {
          if (!inflightRef.current.has(questionId)) scheduleUpload(questionId);
        });
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(unsaved.map(([questionId]) => chainRef.current[questionId]));

        if (Object.values(answersRef.current).every((a) => a.status === "saved")) return true;
        if (Date.now() > stopAt) return false;
        // eslint-disable-next-line no-await-in-loop
        await sleep(1000);
      }
    },
    [scheduleUpload]
  );

  // Background retry for anything that failed to upload.
  useEffect(() => {
    if (phase !== "running") return undefined;
    const retry = () => {
      Object.entries(answersRef.current).forEach(([questionId, answer]) => {
        if ((answer.status === "error" || answer.status === "pending") && !inflightRef.current.has(questionId)) {
          scheduleUpload(questionId);
        }
      });
    };
    const timer = setInterval(retry, RETRY_TICK_MS);
    window.addEventListener("online", retry);
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", retry);
    };
  }, [phase, scheduleUpload]);

  // ---- loading / resuming --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await studentApi.startSection(id, sectionId);
        if (cancelled) return;

        attemptIdRef.current = data.attemptId;
        offsetRef.current = new Date(data.serverTime).getTime() - Date.now();
        deadlineRef.current = new Date(data.section.deadlineAt).getTime();

        // Server copy first, then anything newer that only exists locally.
        const restored = {};
        data.answers.forEach((a) => {
          restored[a.questionId] = {
            kind: a.kind,
            durationS: a.durationS,
            text: a.text || "",
            blob: null,
            url: null,
            status: "saved",
            version: 1,
          };
        });

        const drafts = await getSectionDrafts(data.attemptId, sectionId);
        drafts.forEach((draft) => {
          const onServer = restored[draft.questionId];
          const localIsNewer = !onServer || !draft.synced;

          if (localIsNewer) {
            restored[draft.questionId] = {
              kind: draft.kind,
              durationS: draft.durationS || 0,
              text: draft.text || "",
              blob: draft.blob || null,
              url: draft.blob ? URL.createObjectURL(draft.blob) : null,
              status: "pending",
              version: 1,
            };
          } else if (draft.blob) {
            onServer.blob = draft.blob;
            onServer.url = URL.createObjectURL(draft.blob);
          }
        });

        // Rebuild on-screen jumbled arrangements from the saved word order.
        const rebuilt = {};
        data.questions.forEach((question) => {
          const saved = restored[question._id];
          if (question.words && saved?.kind === "text" && saved.text) {
            const used = new Set();
            rebuilt[question._id] = saved.text
              .split(/\s+/)
              .map((word) => {
                const at = question.words.findIndex((w, i) => w === word && !used.has(i));
                if (at >= 0) used.add(at);
                return at;
              })
              .filter((i) => i >= 0);
          }
        });

        answersRef.current = restored;
        setAnswers({ ...restored });
        setArrangements(rebuilt);
        setSession(data);

        const firstOpen = data.questions.findIndex((q) => !restored[q._id]);
        setIndex(firstOpen >= 0 ? firstOpen : 0);
        setPhase("running");

        Object.entries(restored).forEach(([questionId, answer]) => {
          if (answer.status === "pending") scheduleUpload(questionId);
        });
      } catch (error) {
        if (cancelled) return;
        const code = error?.response?.data?.code;

        if (code === "SECTION_TIME_UP" || code === "SECTION_SUBMITTED") {
          leaveToOverview(error.response.data.message);
          return;
        }
        if (code === "SECTION_ALREADY_RUNNING") {
          finishedRef.current = true;
          toast.info("Finish the section you already have open first.");
          navigate(`/speech-tests/${id}/sections/${error.response.data.runningSectionId}`, { replace: true });
          return;
        }
        if (redirectIfNotFound(error)) return;
        setLoadError(apiErrorMessage(error, "Could not open this section"));
        setPhase("error");
      }
    };

    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, sectionId]);

  // Free local object URLs when leaving.
  useEffect(
    () => () => {
      Object.values(answersRef.current).forEach((a) => a.url && URL.revokeObjectURL(a.url));
    },
    []
  );

  // ---- submitting ------------------------------------------------------------
  const submit = useCallback(
    async ({ auto = false } = {}) => {
      if (submittingRef.current) return;
      submittingRef.current = true;
      setDialog(null);
      setPhase("submitting");

      try {
        // Capture a recording that is still going when the clock stops, and any
        // text still waiting to be sent.
        await recorderRef.current?.finish();
        flushTypingRef.current?.();

        const saved = await flushUploads(auto ? 12000 : 45000);
        if (!saved && !auto) {
          toast.error("Some answers have not been saved yet. Check your connection and try again.");
          submittingRef.current = false;
          setPhase("running");
          return;
        }

        for (;;) {
          try {
            // eslint-disable-next-line no-await-in-loop
            await studentApi.submitSection(id, sectionId, auto);
            break;
          } catch (error) {
            // A timed-out section must still go through once the network is back.
            if (auto && !error?.response) {
              // eslint-disable-next-line no-await-in-loop
              await sleep(2500);
              continue;
            }
            throw error;
          }
        }

        await clearSectionDrafts(attemptIdRef.current, sectionId);
        finishedRef.current = true;
        toast.success(
          auto
            ? "Time is up. Your answers were submitted."
            : "Section submitted. Your result will appear shortly."
        );
        navigate(`/speech-tests/${id}`, { replace: true });
      } catch (error) {
        toast.error(apiErrorMessage(error, "Could not submit the section"));
        submittingRef.current = false;
        setPhase("running");
      }
    },
    [flushUploads, id, navigate, sectionId]
  );
  submitRef.current = submit;

  // ---- the server-anchored clock --------------------------------------------
  useEffect(() => {
    if (phase !== "running" && phase !== "submitting") return undefined;

    const tick = () => {
      const left = deadlineRef.current - (Date.now() + offsetRef.current);
      setRemainingMs(Math.max(0, left));
      if (left <= 0 && !autoSubmitRef.current) {
        autoSubmitRef.current = true;
        submitRef.current({ auto: true });
      }
    };

    tick();
    const timer = setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [phase]);

  // ---- leave protection --------------------------------------------------------
  const guarded = Boolean(session);
  useEffect(() => {
    if (!guarded) return undefined;

    const onBeforeUnload = (event) => {
      if (finishedRef.current) return undefined;
      event.preventDefault();
      // Required by browsers to show their native confirmation.
      // eslint-disable-next-line no-param-reassign
      event.returnValue = "";
      return "";
    };

    // One extra history entry that the Back button consumes instead of leaving.
    // The router's own state (its history index) is carried over so it stays
    // consistent.
    const pushGuard = () =>
      window.history.pushState(
        { ...(window.history.state || {}), speechGuard: true },
        "",
        window.location.href
      );
    pushGuard();
    const onPopState = () => {
      if (finishedRef.current) return;
      pushGuard();
      setDialog("leave");
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [guarded]);

  // ---- recording handlers ------------------------------------------------------
  const handleRecorded = useCallback(
    async (questionId, { blob, durationS }) => {
      const previous = answersRef.current[questionId];
      if (previous?.url) URL.revokeObjectURL(previous.url);

      answersRef.current[questionId] = {
        kind: "audio",
        blob,
        url: URL.createObjectURL(blob),
        durationS,
        text: "",
        status: "pending",
        version: (previous?.version || 0) + 1,
      };
      commitAnswers();

      await saveDraft({
        attemptId: attemptIdRef.current,
        sectionId,
        questionId,
        kind: "audio",
        blob,
        durationS,
        synced: false,
      });
      scheduleUpload(questionId);
    },
    [commitAnswers, scheduleUpload, sectionId]
  );

  const handleArrange = useCallback(
    async (question, nextArrangement) => {
      setArrangements((prev) => ({ ...prev, [question._id]: nextArrangement }));

      const text = nextArrangement.map((i) => question.words[i]).join(" ");
      const previous = answersRef.current[question._id];

      // An empty text is still sent, so a half-built answer that was cleared is
      // not scored.
      answersRef.current[question._id] = {
        kind: "text",
        text,
        status: "pending",
        version: (previous?.version || 0) + 1,
      };
      commitAnswers();

      await saveDraft({
        attemptId: attemptIdRef.current,
        sectionId,
        questionId: question._id,
        kind: "text",
        text,
        synced: false,
      });
      scheduleUpload(question._id);
    },
    [commitAnswers, scheduleUpload, sectionId]
  );

  // ---- spoken prompt for REPEAT questions -------------------------------------------
  // The browser reads the sentence aloud; the text is never put on screen.
  const question = session?.questions?.[index];
  const questionId = question?._id;

  const playPrompt = useCallback(
    async (rate) => {
      if (!question?.text) return;
      setSpeaking(true);
      try {
        await speak(question.text, { accent: question.accent, gender: question.gender, rate });
      } catch {
        toast.error("Could not play the sentence. Check your device volume and try again.");
      } finally {
        setSpeaking(false);
      }
    },
    [question]
  );

  // Silence the prompt when the question changes or the page closes, so it
  // never leaks into a recording.
  useEffect(() => {
    cancelSpeech();
    setSpeaking(false);
    return () => cancelSpeech();
  }, [questionId]);

  // ---- typed and chosen answers ---------------------------------------------------
  // The text is kept and drafted on every keystroke; the upload waits until typing
  // pauses, so a long email is not sent once per letter.
  const typingTimers = useRef({});

  const flushTyping = useCallback(() => {
    Object.entries(typingTimers.current).forEach(([id, timer]) => {
      clearTimeout(timer);
      scheduleUpload(id);
    });
    typingTimers.current = {};
  }, [scheduleUpload]);

  flushTypingRef.current = flushTyping;

  /**
   * @param {object} question the question being answered
   * @param {string} text     what was typed, or the chosen option ids joined by commas
   * @param {{ immediate?: boolean }} options immediate = upload now (a choice, not typing)
   */
  const handleTextAnswer = useCallback(
    (question, text, { immediate = false } = {}) => {
      const previous = answersRef.current[question._id];
      answersRef.current[question._id] = {
        kind: "text",
        text,
        status: "pending",
        version: (previous?.version || 0) + 1,
      };
      commitAnswers();

      saveDraft({
        attemptId: attemptIdRef.current,
        sectionId,
        questionId: question._id,
        kind: "text",
        text,
        synced: false,
      });

      clearTimeout(typingTimers.current[question._id]);
      if (immediate) {
        delete typingTimers.current[question._id];
        scheduleUpload(question._id);
      } else {
        typingTimers.current[question._id] = setTimeout(() => {
          delete typingTimers.current[question._id];
          scheduleUpload(question._id);
        }, 700);
      }
    },
    [commitAnswers, scheduleUpload, sectionId]
  );

  useEffect(
    () => () => {
      Object.values(typingTimers.current).forEach(clearTimeout);
    },
    []
  );

  const goTo = useCallback(
    async (next) => {
      if (!session || next < 0 || next >= session.questions.length) return;
      // Never lose a recording or half-typed answer because the student moved on.
      await recorderRef.current?.finish();
      flushTyping();
      setIndex(next);
    },
    [session, flushTyping]
  );

  return {
    phase,
    loadError,
    session,
    answers,
    arrangements,
    index,
    remainingMs,
    dialog,
    setDialog,
    speaking,
    recorderRef,
    submit,
    goTo,
    playPrompt,
    handleRecorded,
    handleArrange,
    handleTextAnswer,
    flushTyping,
    backToOverview: () => navigate(`/speech-tests/${id}`, { replace: true }),
  };
};

export default useSectionRunner;
