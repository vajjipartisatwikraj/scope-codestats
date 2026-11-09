import { useEffect } from "react";
import { enterFullscreen, exitFullscreen } from "../../../utils/fullscreen";

/**
 * The pages that belong to a speech test the student is sitting: the instructions and checks (/speech-tests/:id/setup),
 * the section list (/speech-tests/:id) and a running section (/speech-tests/:id/sections/:sectionId). The dashboard
 * list, the results of a section, the feedback form and the leaderboard are not part of it.
 */
const EXAM_PATH = /^\/speech-tests\/[^/]+(\/setup|\/sections\/[^/]+)?\/?$/;

export const isExamPath = (pathname) => EXAM_PATH.test(pathname || "");

/**
 * Keeps the window in full screen for as long as the student is inside a speech test, from the instructions to the last
 * section, and gives it back when they leave it (to the results, the feedback form or the list of tests).
 *
 * It is called once, by the app (App.jsx), with the current path, so full screen is not dropped and asked for again each
 * time the student moves from one exam page to the next. A browser only allows full screen after a click or a key press:
 * the buttons that open the test ask for it themselves (the dashboard, the section list), and this asks again on every
 * page change inside the exam, which works because the student has just pressed a button (Continue, Start section) and
 * does nothing when the browser says no.
 */
const useExamFullscreen = (pathname) => {
  const inExam = isExamPath(pathname);

  useEffect(() => {
    if (inExam) enterFullscreen();
  }, [inExam, pathname]);

  useEffect(() => {
    if (!inExam) return undefined;
    return () => {
      exitFullscreen();
    };
  }, [inExam]);
};

export default useExamFullscreen;