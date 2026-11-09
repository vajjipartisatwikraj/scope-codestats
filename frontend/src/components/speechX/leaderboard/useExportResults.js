import { useCallback, useState } from "react";
import { toast } from "react-toastify";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";

/** A failed blob request carries its JSON message inside a blob; read it out. */
const messageOf = async (error) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      if (parsed?.message) return parsed.message;
    } catch {
      // not JSON: fall through to the generic message
    }
  }
  return apiErrorMessage(error, "Could not export the results");
};

/**
 * Downloads the complete results of a test as an Excel workbook (leaderboard, section and question
 * scores, feedback). The server builds the file; this hands it to the browser.
 *
 * Returns { exporting, exportResults }.
 */
const useExportResults = (testId, title = "vocalq-test") => {
  const [exporting, setExporting] = useState(false);

  const exportResults = useCallback(async () => {
    setExporting(true);
    try {
      const response = await adminApi.exportResults(testId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // The server's own file name if the browser may read it, else one made from the title
      const named = /filename="?([^"]+)"?/.exec(response.headers?.["content-disposition"] || "");
      const safe = String(title).replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "vocalq-test";
      link.download = named?.[1] || `${safe}-results.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Results downloaded");
    } catch (error) {
      toast.error(await messageOf(error));
    } finally {
      setExporting(false);
    }
  }, [testId, title]);

  return { exporting, exportResults };
};

export default useExportResults;