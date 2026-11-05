import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import * as api from '../api/bankLibraryApi';

const POLL_MS = 2000;

/**
 * The imports of a cohort: the latest one, kept up to date while it runs.
 *
 * An import runs on the server in the background, so the page asks for it again every two seconds
 * while it is active. Because the state lives on the server, a person who reloads the page, or opens
 * the cohort from another browser, sees the same import still going.
 *
 *   cohortId
 *   onSettled(job)   called once when an import that was active has finished, failed or stopped
 *
 * Returns
 *   latest      the newest import, or null
 *   active      the newest import is queued or running
 *   adopt(job)  show a job that was just started, without waiting for the next poll
 *   refresh()   ask again now
 *   cancel(), retry()   act on the latest import; both resolve with the new state of the job or null
 */
export default function useCohortImports(cohortId, { onSettled } = {}) {
  const { token } = useAuth();
  const [jobs, setJobs] = useState([]);
  const wasActive = useRef(new Set());
  const settled = useRef(onSettled);
  settled.current = onSettled;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Takes a list of jobs, shows it, and reports the jobs that stopped being active */
  const take = useCallback((list) => {
    if (!mounted.current) return;
    setJobs(list);
    list.forEach((job) => {
      if (job.active) {
        wasActive.current.add(job.id);
      } else if (wasActive.current.has(job.id)) {
        wasActive.current.delete(job.id);
        if (settled.current) settled.current(job);
      }
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!cohortId) return null;
    try {
      const list = await api.listImports(token, cohortId, 3);
      take(list);
      return list;
    } catch (error) {
      // A library that is not set up has no imports to show; any other failure is tried again on the next poll
      return null;
    }
  }, [token, cohortId, take]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const latest = jobs[0] || null;
  const active = Boolean(latest && latest.active);

  useEffect(() => {
    if (!active) return undefined;
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [active, refresh]);

  const adopt = useCallback((job) => take([job, ...jobs.filter((entry) => entry.id !== job.id)]), [take, jobs]);

  const act = useCallback(
    async (request) => {
      if (!latest) return null;
      const job = await request(token, latest.id);
      take([job, ...jobs.filter((entry) => entry.id !== job.id)]);
      return job;
    },
    [token, latest, jobs, take]
  );

  const cancel = useCallback(() => act(api.cancelImport), [act]);
  const retry = useCallback(() => act(api.retryImport), [act]);

  return { latest, active, adopt, refresh, cancel, retry };
}
