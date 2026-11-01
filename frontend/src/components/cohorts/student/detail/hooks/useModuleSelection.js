import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Which module is open, and what the right-hand side shows.
 *
 * The open module lives in the address (?module=<id>), so a refresh, the back button or a shared link
 * lands on the same module; without it the first module is open. Other parts of the query (the exam
 * flag, `?exam=1`) are kept. The change replaces the history entry instead of adding one, so the back
 * button leaves the cohort rather than stepping through modules.
 *
 * `panel` is what the right side shows: 'questions' (the open module), 'notes' (its notes), or the
 * cohort-wide 'progress' and 'feedback'. Choosing a module always returns to its questions.
 *
 * `view` is only for phones, where there is room for one side at a time: 'modules' (the list) or
 * 'detail' (the right side). From 900px both sides show and `view` is ignored by the CSS.
 *
 * @param {Array<{_id: string}>} modules
 */
export default function useModuleSelection(modules) {
  const [params, setParams] = useSearchParams();
  const [panel, setPanel] = useState('questions');
  // A link to a module (or a return to one) opens it; a plain visit starts at the list
  const [view, setView] = useState(() => (params.get('module') ? 'detail' : 'modules'));

  const wanted = params.get('module');
  const selected = useMemo(() => modules.find((module) => module._id === wanted) || modules[0] || null, [modules, wanted]);

  const selectModule = useCallback(
    (moduleId) => {
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('module', moduleId);
          return next;
        },
        { replace: true }
      );
      setPanel('questions');
      setView('detail');
    },
    [setParams]
  );

  /** Show a cohort-wide panel (progress, feedback) or return to the module's questions */
  const showPanel = useCallback((name) => {
    setPanel((current) => (current === name ? 'questions' : name));
    setView('detail');
  }, []);

  return { selected, selectModule, panel, setPanel, showPanel, view, setView };
}
