/**
 * Keeps requests to one site apart. `createThrottle(gapMs)` returns `wait()`: await it before every
 * request to that site. Calls are queued, so even requests started together leave `gapMs` apart.
 * `pause(ms)` holds the whole queue back (after a 429, the site asked us to slow down).
 */
function createThrottle(gapMs) {
  let nextFree = 0;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  async function wait() {
    const now = Date.now();
    const slot = Math.max(now, nextFree);
    nextFree = slot + gapMs;
    if (slot > now) await sleep(slot - now);
  }

  function pause(ms) {
    nextFree = Math.max(nextFree, Date.now() + ms);
  }

  return { wait, pause };
}

module.exports = { createThrottle };
