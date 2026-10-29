import { useCallback, useEffect, useState } from 'react';
import { apiUrl } from '../../config/apiConfig';

/**
 * Loads one public profile (GET /api/users/public/:username) and keeps the page from asking the
 * server more than it has to. The server allows 2 requests per second per IP and blocks the IP for a
 * minute after that, so this hook makes at most ONE request per visit:
 *
 *  - a profile seen in the last 5 minutes is read from localStorage (shared by every tab);
 *  - two components asking for the same profile at once share one request;
 *  - when the server answers 429, the end of the block is remembered in localStorage and no request
 *    is made until it is over, in any tab. The page shows a countdown instead of retrying.
 *
 * Returns { status, profile, message, retryAt, reload }
 *   status   'loading' | 'ready' | 'notfound' | 'limited' | 'error'
 *   profile  the answer, when ready
 *   retryAt  ms timestamp the block ends, when limited
 *   message  a sentence for notfound, limited and error
 *   reload() asks again (the Try again button); it skips the saved copy
 */

const CACHE_MS = 5 * 60 * 1000;
const DEFAULT_BLOCK_SECONDS = 60;
const BLOCK_KEY = 'publicProfile:blockedUntil';

const cacheKey = (username) => `publicProfile:v2:${String(username).toLowerCase()}`;

const storage = {
  read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  write(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage is full or off: the page works without it
    }
  },
  remove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // nothing to do
    }
  },
};

function readSaved(username) {
  const raw = storage.read(cacheKey(username));
  if (!raw) return null;
  try {
    const { data, at } = JSON.parse(raw);
    if (data && typeof data === 'object' && Date.now() - at < CACHE_MS) return data;
  } catch {
    // a broken entry is dropped below
  }
  storage.remove(cacheKey(username));
  return null;
}

const blockedUntil = () => {
  const until = Number(storage.read(BLOCK_KEY));
  return Number.isFinite(until) && until > Date.now() ? until : 0;
};

/** The requests in flight, by profile, so a second ask joins the first */
const inFlight = new Map();

function fetchProfile(username) {
  if (inFlight.has(username)) return inFlight.get(username);

  const request = fetch(`${apiUrl}/users/public/${encodeURIComponent(username)}`, { headers: { Accept: 'application/json' } })
    .then(async (response) => {
      let body = null;
      try {
        body = await response.json();
      } catch {
        // an answer without a body is handled by its status
      }
      return { status: response.status, ok: response.ok, body };
    })
    .finally(() => inFlight.delete(username));

  inFlight.set(username, request);
  return request;
}

const initialState = (username) => {
  const saved = username ? readSaved(username) : null;
  return saved ? { status: 'ready', profile: saved } : { status: 'loading' };
};

export default function usePublicProfile(username) {
  const [state, setState] = useState(() => initialState(username));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    const set = (next) => {
      if (current) setState(next);
    };

    if (!username) {
      set({ status: 'notfound', message: 'This address has no profile name in it.' });
      return undefined;
    }

    // A fresh copy needs no request (but "Try again" always asks)
    if (attempt === 0) {
      const saved = readSaved(username);
      if (saved) {
        set({ status: 'ready', profile: saved });
        return () => {
          current = false;
        };
      }
    }

    // Someone (this tab or another) was blocked a moment ago: do not ask again until it is over
    const until = blockedUntil();
    if (until) {
      set({ status: 'limited', retryAt: until, message: 'Too many requests were made from this network.' });
      return () => {
        current = false;
      };
    }

    set({ status: 'loading' });
    fetchProfile(username)
      .then(({ status, ok, body }) => {
        if (ok && body) {
          storage.write(cacheKey(username), JSON.stringify({ data: body, at: Date.now() }));
          set({ status: 'ready', profile: body });
        } else if (status === 404) {
          set({ status: 'notfound', message: 'We could not find a student with this profile name.' });
        } else if (status === 429) {
          const seconds = Number(body?.retryAfterSeconds) > 0 ? Number(body.retryAfterSeconds) : DEFAULT_BLOCK_SECONDS;
          const retryAt = Date.now() + seconds * 1000;
          storage.write(BLOCK_KEY, String(retryAt));
          set({ status: 'limited', retryAt, message: body?.message || 'Too many requests were made from this network.' });
        } else {
          set({ status: 'error', message: 'The profile could not be loaded. Check your connection and try again.' });
        }
      })
      .catch(() => set({ status: 'error', message: 'The profile could not be loaded. Check your connection and try again.' }));

    return () => {
      current = false;
    };
  }, [username, attempt]);

  const reload = useCallback(() => setAttempt((count) => count + 1), []);
  return { ...state, reload };
}
