/**
 * Language tab for open-ended answers (question and answer, storytelling): the
 * rubric the judge's language model scored, with its reason for each line.
 */

const { pct } = require("./common");

const LABELS = {
  relevance: "Relevance",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  coherence: "Coherence",
  content: "Content",
  completeness: "Completeness",
  topic_relevance: "Topic relevance",
  logical_flow: "Logical flow",
  structure: "Structure",
  tone: "Tone",
};

const labelOf = (key) => LABELS[key] || key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

function buildLanguage(language) {
  const entries = Object.entries(language?.dimensions || {});
  if (entries.length === 0) return null;

  const dimensions = entries.map(([key, value]) => ({
    key,
    label: labelOf(key),
    score: pct(value?.score),
    justification: String(value?.justification || ""),
  }));

  const average = dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length;
  return { score: Math.round(average), dimensions };
}

module.exports = { buildLanguage, labelOf };
