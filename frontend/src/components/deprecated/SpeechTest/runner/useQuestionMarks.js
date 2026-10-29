import { useCallback, useState } from "react";

/**
 * The student's own bookmarks on questions: "later" (come back to it) or
 * "review" (double-check it). They only exist in the browser and never affect
 * scoring. Choosing the mark a question already has clears it.
 */
const useQuestionMarks = () => {
  const [marks, setMarks] = useState({});

  const toggleMark = useCallback((questionId, kind) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[questionId] === kind) delete next[questionId];
      else next[questionId] = kind;
      return next;
    });
  }, []);

  return { marks, toggleMark };
};

export default useQuestionMarks;
