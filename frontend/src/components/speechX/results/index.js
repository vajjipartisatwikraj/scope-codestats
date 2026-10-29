/**
 * speechX/results: the section results page and the answer analysis, rebuilt on plain CSS, the
 * design tokens, the ui kit, the custom chart components and Phosphor icons (no Material UI).
 *
 *   import { SectionResultsPage } from "./components/speechX/results";
 *   <Route path="/speech-tests/:id/sections/:sectionId/results" element={<SectionResultsPage />} />
 *
 * Folder map (prefix sxe-, one stylesheet: results.css)
 *   SectionResultsPage.jsx   the route component (loading, not ready, error, and the report)
 *   ResultsNavbar.jsx        the shared FocusHeader with the title and "Result ready"
 *   ResultsState.jsx         skeletons, "not ready yet" and the error with Retry, in a live region
 *   ResultCard.jsx           a flat card with a banner and a staged entrance
 *   resultsMeta.js           score bands (word, icon, tone), STAGE timings (replaces resultsTheme.js)
 *   useSectionResults.js     the same request as before, plus reload() and notReady
 *   useCollapseOnScroll.js   the band folds once the results are scrolled (900px and wider)
 *   charts/                  ScoreSummary (spotlight tile), Donut (PieChart), SkillRadar (RadarChart),
 *                            SkillBars (ProgressBar), QuestionBars (BarChart)
 *   details/                 ResultsRibbon, RibbonItem, RibbonBackButton, Collapsible
 *   analysis/                QuestionAnalysis, QuestionRow (ui Disclosure), QuestionDetail, QuestionHeader,
 *                            QuestionTabs (PillTabs), MetricTile (StatTile), ScoreBadge (Badge), CriteriaRow,
 *                            SpeechTimeline (TimelineStrip), tabs/ (Overview, Transcription, Pronunciation,
 *                            Language, Fluency, Answer)
 */
export { default as SectionResultsPage } from "./SectionResultsPage";
export { default } from "./SectionResultsPage";
export { default as useSectionResults } from "./useSectionResults";
