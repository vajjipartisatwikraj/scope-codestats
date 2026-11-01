import { withExamSession } from '../../../../../utils/examSession';
import { examOf } from './cohortStatus';

/**
 * Opens a cohort for the student.
 *
 * A practice cohort opens in this tab. An exam opens in its own tab, flagged with `?exam=1` so the
 * app shell draws the quiet exam chrome from the first paint (no navbar, no sidebar, just the
 * question and the countdown) while this list stays open. The flag only controls chrome; the
 * server decides who may enter and when.
 *
 * `window.open(..., 'noopener')` always answers null, which is indistinguishable from a blocked
 * pop-up, so the tab is opened normally and its `opener` is cut afterwards. Only a real block
 * falls back to opening the exam in this tab.
 *
 * @param {object} cohort   a cohort of the list
 * @param {(to: string) => void} navigate   react-router's navigate
 */
export default function openCohort(cohort, navigate) {
  if (!cohort || !cohort._id) return;
  const path = `/cohorts/${cohort._id}`;

  if (!examOf(cohort)) {
    navigate(path);
    return;
  }

  const url = withExamSession(path, true);
  const tab = window.open(url, '_blank');
  if (tab) {
    tab.opener = null;
  } else {
    navigate(url);
  }
}
