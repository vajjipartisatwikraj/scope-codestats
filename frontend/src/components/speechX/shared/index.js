/**
 * speechX/shared: the foundation of the redesigned speech (communication) test screens.
 *
 * Plain CSS on the design tokens (speechX.css, prefix sx-), Phosphor icons, no Material UI. It keeps
 * the feel of the old screens (a focus surface: a fixed top bar with the platform mark, centred
 * cards, stepper-like flows, the app footer below) in the current theme system (Midnight and Daylight).
 * Import from the folder:   import { FocusHeader, FocusPage, SpeechCard } from "../shared";
 *
 * ---------------------------------------------------------------------------------------------
 * THE SHELL OF A FOCUS SCREEN
 *
 *   <FocusHeader subtitle="Speech Judge">{right-hand slot}</FocusHeader>
 *   <FocusPage wide gap> ...cards... </FocusPage>
 *
 * App.jsx hides the navbar and sidebar on these routes and keeps the footer. The header is fixed at
 * the top (72px, --sx-header); FocusPage starts below it and is at least --sx-stage tall.
 *
 * Full-height stage (a screen that must not scroll, such as the question runner):
 *   <div className="sx-stage"> ... </div>   // height: calc(100dvh - 72px - footer), overflow hidden
 *   or  height: var(--sx-stage)  in your own CSS.
 * Footer height (--sx-footer): 80px from 520px wide, 112px under 520px, 136px under 360px (the bar
 * wraps on narrow screens; computed from Footer.css, see the comment in speechX.css).
 * Anything taller than the stage scrolls inside its own column, never the page.
 *
 * ---------------------------------------------------------------------------------------------
 * COMPONENTS
 *
 * FocusHeader  (FocusHeader.jsx)
 *   subtitle, to="/speech-tests", locked=false, backLabel="Back to speech tests", children,
 *   tools=true, profileInteractive (default !locked), compact=false, className.
 *   `locked` makes the brand plain text and the profile not pressable (a running section).
 *   children is the middle slot (right-aligned flex row; give a child flex:1 to fill it).
 *   Built in at the right: connection (SignalBars + Online/Offline, a live region), theme toggle,
 *   profile badge. Logo: /codestats-color.png (blue mark, transparent, legible in both themes).
 *   <FocusHeader subtitle="Speech Judge" locked><TimerPill .../></FocusHeader>
 *
 * FocusPage  (FocusPage.jsx)
 *   width="reading" ('narrow' 760 | 'reading' 880 | 'wide' 1100 | 'full' 1280), narrow, wide (shortcuts),
 *   center=false (vertical), gap=false (var(--sx-gap) between children), as="main", className, ...rest.
 *   <FocusPage narrow center><SpeechCard .../></FocusPage>
 *
 * Reveal  (Reveal.jsx)   CSS entrance: 280ms fade + rise; reduced motion gets a 150ms fade
 *   delay=0 (SECONDS, like the old Reveal), index=0 (adds index x 0.06s), y=12, duration=0.28 (seconds),
 *   leaving=false, still=false, as="div", className, style.
 *   <Reveal index={2}><SpeechCard .../></Reveal>
 *
 * SpeechCard  (SpeechCard.jsx)   flat card: 24px radius, no border, no shadow; body padding 24 / 16 on phones
 *   tone="plain" ('plain' | 'raised'), padded=true, fill=false (height 100%), minHeight, as="section",
 *   footer (node under the body), className, style, and the banner props, used when `title` is given:
 *   title, description, label, icon, hue, badge, actions, compact, divided, headingAs="h2".
 *   <SpeechCard icon={MicrophoneIcon} title="Microphone check" description="...">...</SpeechCard>
 *
 * CardBanner  (CardBanner.jsx)   the heading strip of a card (use it alone for custom card layouts)
 *   icon (Phosphor component), hue="accent", label, title, description, badge, actions, as="h2" ('h1' = Headline),
 *   compact=false, divided=true, className, children (full width under the text).
 *   <CardBanner icon={ClockIcon} title="Instructions" badge={<ExamStatusBadge status="live" />} />
 *
 * TonalMark  (TonalMark.jsx)   icon in a tonal circle, decorative (aria-hidden)
 *   icon (component or element), hue="accent" | blue teal amber violet coral green sky slate, size=40,
 *   weight="regular", className, style, children (replaces the icon).
 *   <TonalMark icon={MicrophoneIcon} hue={SECTION_TYPE_META[type].hue} />
 *
 * InfoLine  (InfoLine.jsx)   tonal mark + small label + value
 *   icon, label, value, hue="accent", size=32, as="div" ('li' in a ul.sx-info-grid), className.
 *   <InfoLine icon={ClockIcon} label="Duration" value={formatDuration(45)} />
 *
 * StatTile, StatGrid  (re-exported from ../../ui)   label, value, context, tone ('plain'|'spotlight'|'accent'),
 *   size ('l'|'m'), icon  /  columns (4|3), label.  At most one spotlight and one accent tile per screen.
 *   <StatGrid><StatTile label="Score" value="82%" context="of 100" tone="spotlight" /></StatGrid>
 *
 * StateDot, StateLegend  (StateDot.jsx)   the question state palette
 *   StateDot: state="open", size="md" ('sm' 24 | 'md' 36 | 'lg' 44), children (the number), label, decorative=false, ring.
 *   StateLegend: states (default answered current open later review), counts { answered: 3 }, label, className.
 *   <StateDot state="review" size="lg">7</StateDot>     <StateLegend counts={{ answered: 6, open: 4 }} />
 *
 * states.js   STATE_KEYS, STATE_LABEL, STATE_ICON (Phosphor components), questionState(flags).
 *   States: answered (accent-soft) | current (spotlight) | open (raised) | later (warning-soft, "Visit later") |
 *   review (violet tonal, "Marked for review") | flagged (warning-soft). Each has a word and an icon.
 *   questionState({ current, answered, later, review, flagged }) picks one: current, review, flagged,
 *   later, answered, open.  To style your own element (a palette tile): <button data-state="answered"
 *   className="sx-state"> gives it the state's background and text colour.
 *
 * ExamStatusBadge  (ExamStatusBadge.jsx)   ui Badge with icon and word
 *   status: upcoming | live (pulsing icon) | completed | not_attempted | ended | closed, or a section status
 *   not_started | in_progress | queued | scoring | scored | failed.  className.
 *   <ExamStatusBadge status={examStatusOf(windowState, attempt)} />
 *
 * SpeechPageHero  (SpeechPageHero.jsx)   the title block of the list pages (ui PageHeader + optional mark)
 *   title, description, actions, icon (Phosphor component), hue="accent", count, size="display" | "headline".
 *   Put it in a ui <Page>.  <SpeechPageHero title="Speech tests" description="..." icon={MicrophoneIcon} />
 *
 * ---------------------------------------------------------------------------------------------
 * LOGIC (copied from SpeechTest/, no Material UI)
 *
 *   examStatus.js        examStatusOf(windowState, attempt), EXAM_STATUS_META, SECTION_STATUS_BADGE_META
 *   speechTestMeta.js    BRAND, SECTION_TYPE_META (label, hint, hue, color as a var(--ds-series-*)), SECTION_TYPES,
 *                        TEXT_ONLY_TYPES, isTextOnly, typeLabel, SECTION_STATUS_META, TEST_STATE_META,
 *                        formatDateTime, formatShortDateTime, formatDuration, formatScore, formatClock, formatCountdown
 *   useNotFoundRedirect  default export hook: const redirect = useNotFoundRedirect(); if (redirect(error)) return;
 *                        and NOT_FOUND_PATH
 *   useOnlineStatus      default export hook: const online = useOnlineStatus();
 *   runnerCopy.js        STATE_LABEL, PROMPT_CUE, ANSWER_HINT
 *
 * ---------------------------------------------------------------------------------------------
 * CSS you may use
 *
 *   Variables   --sx-header (72px)  --sx-footer (80 / 112 / 136px)  --sx-stage  --sx-gap (12 / 16 / 20px)
 *               --sx-pad (16 / 24 / 32px)  --sx-state-bg / --sx-state-fg (inside any [data-state])
 *   Classes     sx-stage (no-scroll full-height region), sx-page, sx-card (+ data-tone="raised"), sx-divider
 *               (hairline), sx-info-grid (auto-fit grid of InfoLines), sx-state (+ data-state), sx-sr
 *               (visually hidden), sx-hide-phone (hidden under 600px), sx-phone-only (only under 600px),
 *               sx-hide-narrow (hidden under 900px), sx-reveal, sx-pulse (a looping scale for a live dot)
 *
 * Rules every screen built on this keeps: tokens only, cards flat, one spotlight and one accent tile
 * per screen (the current question dot counts as the spotlight), status never by colour alone,
 * motion 150 to 320ms on transform, opacity and colour, and a `transition: none` reset on the children
 * of any component that animates its own colours (the global `* { transition }` in index.css).
 */
import "./speechX.css";

export { default as FocusHeader } from "./FocusHeader";
export { default as FocusPage } from "./FocusPage";
export { default as Reveal } from "./Reveal";
export { default as SpeechCard } from "./SpeechCard";
export { default as CardBanner } from "./CardBanner";
export { default as InfoLine } from "./InfoLine";
export { default as TonalMark } from "./TonalMark";
export { StatTile, StatGrid } from "../../ui";
export { StateDot, StateLegend } from "./StateDot";
export { STATE_KEYS, STATE_LABEL, STATE_ICON, questionState } from "./states";
export { default as ExamStatusBadge } from "./ExamStatusBadge";
export { default as SpeechPageHero } from "./SpeechPageHero";

export { examStatusOf, EXAM_STATUS_META, SECTION_STATUS_BADGE_META } from "./examStatus";
export * from "./speechTestMeta";
export { default as useNotFoundRedirect, NOT_FOUND_PATH } from "./useNotFoundRedirect";
export { default as useOnlineStatus } from "./useOnlineStatus";
export { PROMPT_CUE, ANSWER_HINT } from "./runnerCopy";
