import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/apiConfig';

/**
 * How the server lets people in, from GET /api/auth/config (public, no sign-in needed):
 *
 *   loginMode    'domain' (only college addresses) | 'allowlist' (only addresses an admin listed)
 *   domainHint   '@mlrit.ac.in or @mlrinstitutions.ac.in', for the sentence on the sign-in page
 *   loaded       false until the answer arrived (or failed)
 *
 * Until the answer arrives, and if it never does, the page shows the domain wording, which is
 * what every deployment said before this setting existed. The answer is kept for the life of the
 * page, so several screens share one request.
 */
const FALLBACK = { loginMode: 'domain', domainHint: '@mlrit.ac.in or @mlrinstitutions.ac.in' };

let answer = null;
let pending = null;

function fetchConfig() {
  if (answer) return Promise.resolve(answer);
  if (!pending) {
    pending = axios
      .get(`${apiUrl}/auth/config`)
      .then((response) => {
        const data = response.data || {};
        answer = {
          loginMode: data.loginMode === 'allowlist' ? 'allowlist' : 'domain',
          domainHint: data.domainHint || FALLBACK.domainHint,
        };
        return answer;
      })
      .catch((error) => {
        pending = null; // try again next time
        throw error;
      });
  }
  return pending;
}

export default function useLoginConfig() {
  const [config, setConfig] = useState(answer || FALLBACK);
  const [loaded, setLoaded] = useState(Boolean(answer));

  useEffect(() => {
    if (answer) return undefined;
    let cancelled = false;
    fetchConfig()
      .then((value) => {
        if (cancelled) return;
        setConfig(value);
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { ...config, loaded };
}
