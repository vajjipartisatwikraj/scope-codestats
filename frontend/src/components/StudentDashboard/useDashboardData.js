import axios from '../../utils/axiosConfig';
import { apiUrl } from '../../config/apiConfig';
import { platformProgressApi } from '../../services/platformProgressApi';
import useProgressData from '../Dashboard/progress/useProgressData';

/**
 * The data hooks of the student dashboard. Each one returns { data, loading, error, reload }.
 *
 * useProgressData remembers every answer for a minute, so coming back to the dashboard within
 * that time shows it at once. The cache is shared by the whole page and its keys start with
 * the student's id, so two accounts in one tab never see each other's numbers. A null id means
 * "not signed in yet": nothing is requested.
 */
const cache = new Map();

/** Total score, every platform's score and the ranks over the last `days` days. null days = skip. */
export const useScores = (userId, days) =>
  useProgressData(cache, userId && days ? `${userId}:scores:${days}` : null, (signal) =>
    platformProgressApi.scores(days, { signal })
  );

/**
 * The signed-in student as the server describes them. One request feeds the two hooks below,
 * so the consistency card and the platform card never ask for it twice.
 */
const useMe = (userId) =>
  useProgressData(cache, userId ? `${userId}:me` : null, (signal) =>
    axios.get(`${apiUrl}/users/me`, { signal }).then((response) => ({
      weeklyActivity: response.data?.weeklyActivity || null,
      codingProfiles: response.data?.codingProfiles || {},
    }))
  );

/** One part of the student's answer, with the same loading and error state as the answer itself */
const partOf = (state, pick) => ({ ...state, data: state.data ? pick(state.data) : null });

/** The last-7-days activity the server keeps on the student: { activeDays, consistencyIndex, ... } */
export const useWeeklyActivity = (userId) => partOf(useMe(userId), (me) => me.weeklyActivity);

/** The stats of each linked platform, by platform: { leetcode: { problemsSolved, ... }, ... } */
export const useCodingProfiles = (userId) => partOf(useMe(userId), (me) => me.codingProfiles);

/** Problems solved per day for the last 12 months */
export const useHeatmap = (userId) =>
  useProgressData(cache, userId ? `${userId}:heatmap` : null, (signal) =>
    axios
      .get(`${apiUrl}/dashboard/heatmap/${userId}`, { params: { days: 365 }, signal })
      .then((response) => response.data)
  );

/**
 * One platform's history over the last `days` days (problems solved, rating, contests ...).
 * null platform or days = skip. Only the platforms with stored history have one: leetcode,
 * codeforces, codechef and hackerrank.
 */
export const usePlatformHistory = (userId, platform, days) =>
  useProgressData(cache, userId && platform && days ? `${userId}:history:${platform}:${days}` : null, (signal) =>
    platformProgressApi.platform(platform, days, { signal })
  );
