import { useEffect, useState } from "react";
import { studentApi, apiErrorMessage } from "../../../services/speechTestApi";
import useNotFoundRedirect from "../useNotFoundRedirect";

/** Loads the detailed results report of one section. */
const useSectionResults = (id, sectionId) => {
  const redirectIfNotFound = useNotFoundRedirect();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    studentApi
      .sectionResults(id, sectionId)
      .then((data) => {
        if (!cancelled) setReport(data.report);
      })
      .catch((err) => {
        if (cancelled || redirectIfNotFound(err)) return;
        setError(apiErrorMessage(err, "Could not load these results"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, sectionId, redirectIfNotFound]);

  return { report, loading, error };
};

export default useSectionResults;
