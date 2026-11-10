/**
 * Judge0 (the code execution engine behind programming questions) for the admin Monitoring page.
 *
 * Judge0 measures itself and serves it from a few read-only endpoints. This service reads all of
 * them through services/judges/codeJudge.js (the only module that knows the engine's address and
 * token), in parallel, and hands them to the page:
 *
 *   /statistics     submissions in total, today and per day for 30 days; by language; by status
 *                   (Accepted, Wrong Answer, Time Limit Exceeded, errors ...); size of its database.
 *                   Judge0 caches it for 10 minutes; `refresh` asks for a fresh count.
 *   /workers        per queue: submissions waiting, workers available, idle, working, paused, failed
 *   /config_info    the limits it enforces (time, memory, queue size ...) and its switches
 *   /system_info    the machine of the web server (CPU, memory)
 *   /about          its version
 *   /isolate        the sandbox it runs programs in
 *
 * Each report is fetched on its own: one that fails is reported next to its part of the page and
 * the others still show. The time /about takes to answer is measured as the API's response time.
 * The engine's address and token never leave the server.
 */
const codeJudge = require("../judges/codeJudge");

const CACHE_MS = 15 * 1000;

let cache = null; // { at, value }
let pending = null;

/** Runs a call and answers { ok, data, ms } or { ok: false, error, status } instead of throwing. */
async function settle(call) {
  const started = Date.now();
  try {
    const data = await call;
    return { ok: true, data, ms: Date.now() - started };
  } catch (error) {
    const status = error.response?.status || null;
    const message = status
      ? `Judge0 answered ${status}`
      : error.code === "ECONNABORTED"
        ? "Judge0 did not answer in time"
        : error.code === "ECONNREFUSED" || error.code === "ENOTFOUND"
          ? "Judge0 is unreachable"
          : error.message || "Request failed";
    return { ok: false, error: message, status };
  }
}

/** "Version: 1.8.1\n..." -> "1.8.1" (Judge0 prints the output of `isolate --version`) */
function isolateVersion(text) {
  const match = String(text || "").match(/(\d+\.\d+(?:\.\d+)?)/);
  return match ? match[1] : null;
}

const number = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/** The parts of `lscpu` and `free -h` an admin reads, under plain names. */
function systemOf(info) {
  return {
    architecture: info.Architecture || null,
    cpuModel: info["Model name"] || null,
    vendor: info["Vendor ID"] || null,
    cpus: number(info["CPU(s)"]),
    threadsPerCore: number(info["Thread(s) per core"]),
    coresPerSocket: number(info["Core(s) per socket"]),
    sockets: number(info["Socket(s)"]),
    mhz: number(info["CPU MHz"]),
    hypervisor: info["Hypervisor vendor"] || null,
    caches: { l1d: info["L1d cache"] || null, l1i: info["L1i cache"] || null, l2: info["L2 cache"] || null, l3: info["L3 cache"] || null },
    // `free -h` text such as "3.7Gi"
    memory: info.Mem || null,
    swap: info.Swap || null,
  };
}

async function load({ refresh }) {
  const generatedAt = new Date();
  if (!codeJudge.isConfigured()) return { generatedAt, configured: false };

  const read = (path, options) => settle(codeJudge.read(path, options));
  const [about, workers, statistics, system, config, isolate] = await Promise.all([
    read("/about"),
    read("/workers"),
    // Judge0 keeps its statistics for 10 minutes; a manual reload asks it to count again
    read("/statistics", { params: refresh ? { invalidate_cache: true } : undefined, timeoutMs: 30000 }),
    read("/system_info"),
    read("/config_info"),
    read("/isolate"),
  ]);

  if (![about, workers, statistics, system, config].some((report) => report.ok)) {
    return { generatedAt, configured: true, reachable: false, error: about.error };
  }

  return {
    generatedAt,
    configured: true,
    reachable: true,
    // How long the API took to answer a trivial request, from this server
    pingMs: about.ok ? about.ms : null,
    version: about.ok ? about.data.version || null : null,
    isolate: isolate.ok ? isolateVersion(isolate.data) : null,
    maintenance: config.ok ? Boolean(config.data.maintenance_mode) : null,
    workers: workers.ok && Array.isArray(workers.data) ? workers.data : null,
    statistics: statistics.ok ? statistics.data : null,
    limits: config.ok ? config.data : null,
    system: system.ok ? systemOf(system.data) : null,
    problems: {
      ...(workers.ok ? {} : { workers: workers.error }),
      ...(statistics.ok ? {} : { statistics: statistics.error }),
      ...(config.ok ? {} : { limits: config.error }),
      ...(system.ok ? {} : { system: system.error }),
    },
  };
}

/**
 * Everything the Judge0 API tab shows.
 * @param {{refresh?: boolean}} params `refresh` skips this server's short cache and asks Judge0 to count again
 */
async function getOverview({ refresh = false } = {}) {
  if (!refresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  if (!refresh && pending) return pending;

  const request = load({ refresh })
    .then((value) => {
      cache = { at: Date.now(), value };
      return value;
    })
    .finally(() => {
      if (pending === request) pending = null;
    });
  if (!refresh) pending = request;
  return request;
}

module.exports = { getOverview };
