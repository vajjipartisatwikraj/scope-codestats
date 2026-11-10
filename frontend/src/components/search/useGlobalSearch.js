import { useEffect, useState } from 'react';
import axios from 'axios';
import { apiUrl } from '../../config/apiConfig';

const SEARCH_DELAY_MS = 300;

/**
 * Searches the platform (GET /api/search) a moment after the text stops changing. A newer text
 * cancels the search in flight, and clearing the text clears the results.
 *
 * @param {string} token  the signed-in user's token; nothing is searched without it
 * @param {string} text   what was typed (trimmed by the caller)
 * @returns {{results: object | null, loading: boolean}} `results` is null until a search finished
 */
const useGlobalSearch = (token, text) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !text) {
      setResults(null);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${apiUrl}/search`, {
          params: { query: text },
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        setResults(response.data);
      } catch (error) {
        if (!axios.isCancel(error)) console.error('Search error:', error);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [text, token]);

  return { results, loading };
};

export default useGlobalSearch;
