/**
 * Full screen for the pages that must hold the whole window (a running speech test).
 *
 * A browser only allows full screen after a click or a key press, so call enterFullscreen() from the handler of the
 * button that opens the page; if it is called later it simply does nothing when the browser says no. Both functions
 * are safe to call at any time: they never throw, and say whether it worked.
 */
const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;

export const isFullscreen = () => typeof document !== 'undefined' && Boolean(fullscreenElement());

/** Asks the browser to show the page in full screen. Resolves to true when it is (or already was) full screen. */
export async function enterFullscreen(element) {
  if (typeof document === 'undefined') return false;
  if (fullscreenElement()) return true;
  const target = element || document.documentElement;
  const request = target.requestFullscreen || target.webkitRequestFullscreen;
  if (!request) return false;
  try {
    await request.call(target);
    return true;
  } catch (error) {
    return false;
  }
}

/** Leaves full screen if the page is in it. */
export async function exitFullscreen() {
  if (typeof document === 'undefined' || !fullscreenElement()) return;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  if (!exit) return;
  try {
    await exit.call(document);
  } catch (error) {
    // Already out of it
  }
}