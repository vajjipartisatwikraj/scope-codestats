/**
 * GitHub timeline for the dashboard Progress tab.
 *
 * Nothing about GitHub is stored. GitHub itself keeps a dated record of every contribution,
 * so each request asks for the dates it needs and the answer is cached for a few minutes
 * (shared by identical requests).
 *
 * Per day, for the last N days:
 *   commits         commits made
 *   pullRequests    pull requests opened
 *   merged          pull requests (authored by the user) that were merged
 *   reposCreated    repositories created
 *   contributions   everything GitHub counts on its own contribution graph
 * and for the whole range, code reviews and issues opened as totals.
 *
 * Days are GitHub's own (UTC), so the numbers match the contribution graph on github.com.
 * Only public activity is visible, plus private activity the user chose to show on their
 * profile. GitHub's GraphQL API needs a token (GITHUB_ACCESS_TOKEN).
 *
 * The range is cut into windows of at most 90 days: one call answers at most a year, and
 * per-repository commit days are limited to 100 per call.
 */
const http = require("../platformScraper/http");
const { isValidGitHubUsername } = require("../platformScraper/github");
const TtlCache = require("../../utils/TtlCache");
const { GITHUB_SETTINGS } = require("../../config/platformProgress");
const { dayKeyOf, addDays, listDayKeys } = require("../../utils/dayKeys");
const { bucketize } = require("./seriesBuilder");
const log = require("../../utils/logger").scope("GITHUB-TIMELINE");

const cache = new TtlCache({
  ttlMs: GITHUB_SETTINGS.cacheTtlMs,
  maxEntries: GITHUB_SETTINGS.cacheMaxEntries,
});

/** An expected failure, with the `state` the page should show. */
class GithubTimelineError extends Error {
  constructor(state, message) {
    super(message);
    this.name = "GithubTimelineError";
    this.state = state;
  }
}

const token = () => {
  const value = process.env.GITHUB_ACCESS_TOKEN;
  return value && value !== "your_github_token_here" ? value : null;
};

const WINDOW_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      totalCommitContributions
      totalIssueContributions
      totalPullRequestContributions
      totalPullRequestReviewContributions
      totalRepositoryContributions
      contributionCalendar {
        weeks { contributionDays { date contributionCount } }
      }
      commitContributionsByRepository(maxRepositories: 100) {
        contributions(first: 100) { nodes { occurredAt commitCount } }
      }
      pullRequestContributions(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes { occurredAt }
      }
      repositoryContributions(first: 100) {
        pageInfo { hasNextPage endCursor }
        nodes { occurredAt }
      }
    }
  }
}`;

const MORE_PULL_REQUESTS_QUERY = `
query($login: String!, $from: DateTime!, $to: DateTime!, $after: String) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      pullRequestContributions(first: 100, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { occurredAt }
      }
    }
  }
}`;

const MERGED_QUERY = `
query($q: String!, $after: String) {
  search(query: $q, type: ISSUE, first: 100, after: $after) {
    issueCount
    pageInfo { hasNextPage endCursor }
    nodes { ... on PullRequest { mergedAt } }
  }
}`;

/** One GraphQL call. Turns every way it can fail into a GithubTimelineError. */
async function graphql(query, variables) {
  let response;
  try {
    response = await http.post(
      GITHUB_SETTINGS.graphqlUrl,
      { query, variables },
      {
        headers: { Authorization: `bearer ${token()}`, "Content-Type": "application/json" },
        validateStatus: () => true,
      }
    );
  } catch (error) {
    throw new GithubTimelineError("unavailable", `Could not reach GitHub (${error.message}).`);
  }

  if (response.status === 401) {
    throw new GithubTimelineError("unavailable", "The server's GitHub token was rejected.");
  }
  if (response.status === 403 || response.status === 429) {
    throw new GithubTimelineError("rate_limited", "GitHub is limiting requests right now. Try again in a few minutes.");
  }
  if (response.status >= 500) {
    throw new GithubTimelineError("unavailable", "GitHub is not responding. Try again later.");
  }

  const errors = response.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    if (errors.some((e) => e.type === "NOT_FOUND")) {
      throw new GithubTimelineError("invalid_username", "That GitHub account was not found.");
    }
    if (errors.some((e) => e.type === "RATE_LIMITED")) {
      throw new GithubTimelineError("rate_limited", "GitHub is limiting requests right now. Try again in a few minutes.");
    }
    throw new GithubTimelineError("unavailable", errors[0].message || "GitHub returned an error.");
  }
  return response.data?.data;
}

const dateOf = (iso) => String(iso).slice(0, 10);

/** Cuts [startKey, endKey] into consecutive windows of at most `windowDays` days. */
function splitWindows(startKey, endKey, windowDays) {
  const windows = [];
  for (let start = startKey; start <= endKey; start = addDays(start, windowDays)) {
    const end = addDays(start, windowDays - 1);
    windows.push({ start, end: end > endKey ? endKey : end });
  }
  return windows;
}

/** Adds `amount` to a per-day tally. */
const tally = (map, key, amount = 1) => map.set(key, (map.get(key) || 0) + amount);

/** Everything GitHub says about one window. */
async function fetchWindow(login, window) {
  const variables = { login, from: `${window.start}T00:00:00Z`, to: `${window.end}T23:59:59Z` };
  const data = await graphql(WINDOW_QUERY, variables);
  const collection = data?.user?.contributionsCollection;
  if (!data?.user || !collection) {
    throw new GithubTimelineError("invalid_username", "That GitHub account was not found.");
  }

  const result = {
    commits: new Map(),
    pullRequests: new Map(),
    reposCreated: new Map(),
    contributions: new Map(),
    reviews: collection.totalPullRequestReviewContributions || 0,
    issues: collection.totalIssueContributions || 0,
    truncated: false,
  };

  for (const week of collection.contributionCalendar?.weeks || []) {
    for (const day of week.contributionDays) tally(result.contributions, day.date, day.contributionCount);
  }
  for (const repo of collection.commitContributionsByRepository || []) {
    for (const node of repo.contributions?.nodes || []) {
      tally(result.commits, dateOf(node.occurredAt), node.commitCount);
    }
  }
  for (const node of collection.repositoryContributions?.nodes || []) {
    tally(result.reposCreated, dateOf(node.occurredAt));
  }
  if (collection.repositoryContributions?.pageInfo?.hasNextPage) result.truncated = true;

  // Pull requests can exceed one page of 100: follow the cursor, up to a limit.
  let page = collection.pullRequestContributions;
  for (const node of page?.nodes || []) tally(result.pullRequests, dateOf(node.occurredAt));
  let pages = 1;
  while (page?.pageInfo?.hasNextPage && pages < GITHUB_SETTINGS.maxPagesPerList) {
    const more = await graphql(MORE_PULL_REQUESTS_QUERY, { ...variables, after: page.pageInfo.endCursor });
    page = more?.user?.contributionsCollection?.pullRequestContributions;
    for (const node of page?.nodes || []) tally(result.pullRequests, dateOf(node.occurredAt));
    pages += 1;
  }
  if (page?.pageInfo?.hasNextPage) result.truncated = true;

  return result;
}

/** Pull requests the user authored that were merged in the range, counted per merge day. */
async function fetchMerged(login, startKey, endKey) {
  const merged = new Map();
  const query = `author:${login} is:pr is:merged merged:${startKey}..${endKey}`;
  let after = null;
  let truncated = false;

  for (let page = 0; page < GITHUB_SETTINGS.maxSearchPages; page += 1) {
    const data = await graphql(MERGED_QUERY, { q: query, after });
    const search = data?.search;
    for (const node of search?.nodes || []) {
      if (node?.mergedAt) tally(merged, dateOf(node.mergedAt));
    }
    if (!search?.pageInfo?.hasNextPage) return { merged, truncated };
    after = search.pageInfo.endCursor;
  }
  truncated = true; // search never returns more than 1000 results
  return { merged, truncated };
}

/** Runs async jobs with at most `limit` at a time, keeping the order of the results. */
async function mapLimited(items, limit, work) {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await work(items[index]);
    }
  });
  await Promise.all(runners);
  return results;
}

const sumMap = (map) => [...map.values()].reduce((sum, value) => sum + value, 0);

/** Longest and current runs of consecutive days with any contribution. */
function streaks(daily) {
  let longest = 0;
  let run = 0;
  for (const day of daily) {
    run = day.contributions > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  let current = 0;
  for (let i = daily.length - 1; i >= 0; i -= 1) {
    // Today may simply not have happened yet: it does not break a streak.
    if (daily[i].contributions > 0) current += 1;
    else if (i === daily.length - 1) continue;
    else break;
  }
  return { longest, current };
}

/** Builds the full answer (uncached). */
async function buildTimeline(login, days) {
  const endKey = dayKeyOf(new Date(), "UTC");
  const startKey = addDays(endKey, -(days - 1));

  const windows = splitWindows(startKey, endKey, GITHUB_SETTINGS.windowDays);
  const [windowResults, mergedResult] = await Promise.all([
    mapLimited(windows, GITHUB_SETTINGS.maxConcurrentWindows, (window) => fetchWindow(login, window)),
    fetchMerged(login, startKey, endKey),
  ]);

  const total = {
    commits: new Map(),
    pullRequests: new Map(),
    reposCreated: new Map(),
    contributions: new Map(),
  };
  let reviews = 0;
  let issues = 0;
  let truncated = mergedResult.truncated;
  for (const result of windowResults) {
    for (const field of Object.keys(total)) {
      for (const [key, value] of result[field]) tally(total[field], key, value);
    }
    reviews += result.reviews;
    issues += result.issues;
    truncated = truncated || result.truncated;
  }

  const daily = listDayKeys(startKey, endKey).map((date) => ({
    date,
    commits: total.commits.get(date) || 0,
    pullRequests: total.pullRequests.get(date) || 0,
    merged: mergedResult.merged.get(date) || 0,
    reposCreated: total.reposCreated.get(date) || 0,
    contributions: total.contributions.get(date) || 0,
  }));

  const totals = {
    commits: sumMap(total.commits),
    pullRequests: sumMap(total.pullRequests),
    merged: sumMap(mergedResult.merged),
    reposCreated: sumMap(total.reposCreated),
    reviews,
    issues,
    contributions: sumMap(total.contributions),
  };

  let bestDay = null;
  for (const day of daily) {
    if (day.contributions > 0 && (!bestDay || day.contributions > bestDay.contributions)) bestDay = day;
  }

  return {
    state: "ok",
    range: { start: startKey, end: endKey, days, timezone: "UTC" },
    daily,
    totals,
    summary: {
      activeDays: daily.filter((day) => day.contributions > 0).length,
      bestDay: bestDay ? { date: bestDay.date, contributions: bestDay.contributions } : null,
      ...streaks(daily),
    },
    breakdown: [
      { name: "Commits", value: totals.commits },
      { name: "Pull requests", value: totals.pullRequests },
      { name: "Code reviews", value: totals.reviews },
      { name: "Issues", value: totals.issues },
      { name: "Repositories", value: totals.reposCreated },
    ].filter((item) => item.value > 0),
    buckets: bucketize(daily, days, {
      sum: {
        commits: "commits",
        pullRequests: "pullRequests",
        merged: "merged",
        reposCreated: "reposCreated",
        contributions: "contributions",
      },
    }),
    // true when GitHub had more items than the API returns for one request; the counts
    // may then be slightly low
    truncated,
  };
}

/**
 * The GitHub timeline of a user for the last `days` days (UTC days, ending today).
 * Never throws for an expected problem: the answer's `state` says what happened
 * (ok | invalid_username | rate_limited | unavailable).
 */
async function getTimeline(username, days) {
  const login = String(username || "").trim();
  if (!token()) {
    return {
      state: "unavailable",
      message: "GitHub activity is not available because the server has no GitHub access token.",
    };
  }
  if (!isValidGitHubUsername(login)) {
    return { state: "invalid_username", message: "That is not a valid GitHub username." };
  }

  try {
    const key = `${login.toLowerCase()}|${days}|${dayKeyOf(new Date(), "UTC")}`;
    return await cache.get(key, () => buildTimeline(login, days));
  } catch (error) {
    if (error instanceof GithubTimelineError) return { state: error.state, message: error.message };
    log.error(`GitHub timeline failed for ${login}:`, error);
    throw error;
  }
}

module.exports = { getTimeline, GithubTimelineError, splitWindows, streaks, cache };
