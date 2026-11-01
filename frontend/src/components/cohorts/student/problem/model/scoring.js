/**
 * Scoring tiers: a question can award more points for a faster solution. Each language lists tiers
 * (a time limit in ms and the points it earns, fastest first) and the points kept when the solution
 * is correct but slower than every tier. No React and no network.
 */

/**
 * Where a solution that ran in `executionTime` ms stands.
 *
 * Returns null when the question has no tiers for the language. Otherwise
 *   tiers      [{ maxTime, points, state }] with state 'earned' (the tier the solution reached),
 *              'faster' (a tier it did not reach) or 'slower' (a tier below the one it reached)
 *   fallback   { points, earned } when the language keeps minimum points for a slower solution
 *   points     the points earned
 *   hint       one sentence on how to earn more, or null at the best tier
 */
export function scoringTiersOf(question, language, executionTime) {
  if (!question || !executionTime) return null;
  const languages = question.languages || [];
  const entry = languages.find((item) => item.name === language && item.scoringTiers?.length) || languages.find((item) => item.scoringTiers?.length);
  if (!entry) return null;

  const tiers = entry.scoringTiers;
  const minimum = entry.minimumPoints || 0;
  const reached = tiers.findIndex((tier) => executionTime <= tier.maxTime);
  const withinLimit = executionTime <= (question.constraints?.timeLimit || Infinity);

  let hint = null;
  if (reached > 0) hint = `Run in ${tiers[reached - 1].maxTime} ms or less to earn ${tiers[reached - 1].points} points.`;
  else if (reached === -1) hint = `Run in ${tiers[tiers.length - 1].maxTime} ms or less to earn ${tiers[tiers.length - 1].points} points.`;

  return {
    tiers: tiers.map((tier, index) => ({
      maxTime: tier.maxTime,
      points: tier.points,
      state: reached === -1 || index < reached ? 'faster' : index === reached ? 'earned' : 'slower',
    })),
    fallback: minimum > 0 ? { points: minimum, earned: reached === -1 && withinLimit } : null,
    points: reached >= 0 ? tiers[reached].points : minimum,
    hint,
  };
}
