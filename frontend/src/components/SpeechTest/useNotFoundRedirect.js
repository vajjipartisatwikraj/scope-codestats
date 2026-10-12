import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

/** Any path the app has no page for, so the router shows its regular 404 page. */
export const NOT_FOUND_PATH = "/404";

/**
 * For pages that load something by the id in their URL. Pass a failed request's
 * error to the returned function: if the server said the thing does not exist
 * (a wrong or deleted id, or a test the student is not allowed to open), it
 * sends the browser to the 404 page, replacing the bad address in the history,
 * and returns true so the caller can stop.
 */
const useNotFoundRedirect = () => {
  const navigate = useNavigate();

  return useCallback(
    (error) => {
      if (error?.response?.status !== 404) return false;
      navigate(NOT_FOUND_PATH, { replace: true });
      return true;
    },
    [navigate]
  );
};

export default useNotFoundRedirect;
