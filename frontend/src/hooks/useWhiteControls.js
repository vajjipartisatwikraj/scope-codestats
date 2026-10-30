import { useEffect } from 'react';

// The screens whose inputs, filters and buttons are pure white on Daylight (see ui/ui.css)
const WHITE_CONTROL_ROUTES = /^\/(courses|opportunities|build-resume|speech-tests|admin\/(courses|opportunities|communication-tests))(\/|$)/;

/**
 * Marks <html> with data-white-controls while the current page is one of the screens above. It is
 * set on <html> rather than on a page wrapper so the drawers and dialogs, which are drawn in a
 * portal outside the page, get the same white controls.
 */
export default function useWhiteControls(pathname) {
  useEffect(() => {
    const root = document.documentElement;
    if (WHITE_CONTROL_ROUTES.test(pathname)) {
      root.setAttribute('data-white-controls', 'true');
    } else {
      root.removeAttribute('data-white-controls');
    }
    return () => root.removeAttribute('data-white-controls');
  }, [pathname]);
}
