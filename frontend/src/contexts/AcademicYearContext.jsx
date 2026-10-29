import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axios from "axios";
import { apiUrl } from "../config/apiConfig";
import { useAuth } from "./AuthContext";
import {
  getDefaultConfig,
  getAcademicYearForGraduation,
  getDisplayNameForGraduation,
  getAllAcademicYears,
} from "../utils/academicYearConfig";

/**
 * The academic year configuration (which graduation year is "II Year", which
 * years are "Graduated"), loaded once and shared by the whole app.
 *
 * Without this, every component that needed it sent its own request
 * (/leaderboard/academic-year-config), and the navbar and the leaderboard sent
 * another one every time the browser tab regained focus.
 *
 * Requests:
 *  - one per session: the answer is kept in sessionStorage for MAX_AGE_MS, so
 *    a page reload or a new route does not fetch it again;
 *  - components that mount together share the same request in flight;
 *  - refresh() fetches again on purpose. The admin page calls it after saving.
 *
 * It is cleared on logout. Other users see an admin's change after
 * MAX_AGE_MS or on their next session.
 */
const STORAGE_KEY = "academicYearConfig";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

const AcademicYearContext = createContext(null);

const readStored = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
    if (stored?.config?.yearMappings && Date.now() - stored.savedAt < MAX_AGE_MS) {
      return stored.config;
    }
  } catch {
    // unreadable entry: fetch again
  }
  return null;
};

const store = (config) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ config, savedAt: Date.now() }));
  } catch {
    // storage full or blocked: the in-memory copy still works
  }
};

export const AcademicYearProvider = ({ children }) => {
  const { token } = useAuth();
  const [config, setConfig] = useState(() => readStored());
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(null);

  const load = useCallback(
    async ({ force = false } = {}) => {
      if (!token) return null;

      if (!force) {
        const stored = readStored();
        if (stored) {
          setConfig(stored);
          return stored;
        }
      }

      // Everyone who asks while a request is running gets that request's answer.
      if (inFlight.current) return inFlight.current;

      setLoading(true);
      inFlight.current = axios
        .get(`${apiUrl}/leaderboard/academic-year-config`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((response) => {
          if (!response.data?.success) throw new Error("Failed to fetch academic year configuration");
          const fresh = response.data.config;
          store(fresh);
          setConfig(fresh);
          return fresh;
        })
        .catch((error) => {
          console.error("Error fetching academic year config:", error);
          // Same fallback as before: a configuration worked out from today's date.
          // It is not stored, so the next session asks the server again.
          const fallback = getDefaultConfig();
          setConfig((current) => current || fallback);
          return fallback;
        })
        .finally(() => {
          inFlight.current = null;
          setLoading(false);
        });

      return inFlight.current;
    },
    [token],
  );

  useEffect(() => {
    if (!token) {
      sessionStorage.removeItem(STORAGE_KEY);
      setConfig(null);
      return;
    }
    load();
  }, [token, load]);

  const refresh = useCallback(() => load({ force: true }), [load]);

  const value = useMemo(
    () => ({
      /** The configuration, or null until it has loaded. The helpers below also work while it is null. */
      config,
      loading,
      refresh,
      /** "First Year" ... "Fourth Year" or "Graduated" */
      getAcademicYear: (graduationYear) => getAcademicYearForGraduation(graduationYear, config),
      /** "I Year" ... "IV Year" or "Graduated" */
      getDisplayName: (graduationYear) => getDisplayNameForGraduation(graduationYear, config),
      /** Every academic year name, for filter dropdowns. */
      academicYears: getAllAcademicYears(config),
    }),
    [config, loading, refresh],
  );

  return <AcademicYearContext.Provider value={value}>{children}</AcademicYearContext.Provider>;
};

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) throw new Error("useAcademicYear must be used inside <AcademicYearProvider>");
  return context;
};
