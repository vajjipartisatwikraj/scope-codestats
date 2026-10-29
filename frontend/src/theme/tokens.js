/**
 * Design tokens for SCOPE CodeStats.
 *
 * The one place in the front end that holds colour values. They are copied from the front
 * matter of DESIGN.md at the repo root, so change them there first and then here.
 *
 * How they reach components:
 *  - Plain CSS reads the --ds-* variables that applyTheme() publishes (see applyTheme.js).
 *  - JavaScript reads `tokens` from the theme context (`useTheme` in contexts/ThemeContext.jsx).
 *  - Screens that still use Material UI get a theme built from these values (createAppTheme.js).
 *
 * This file must stay free of Material UI so migrated components can use it on their own.
 */

export const FONT_FAMILY =
  "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif";
export const FONT_MONO = "ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, monospace";

/** Corner radii in px. Cards 24, dialogs 28, buttons and chips are pills. */
export const radii = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, "2xl": 28, pill: 999 };

/** Spacing steps in px, on a 4px base. */
export const spacing = {
  "2xs": 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
  "4xl": 56,
};

/**
 * Motion: 150 to 220ms with an exponential ease-out for state changes. `durationEnter` and
 * `easeEnter` are for the one entrance of a chart (bars, dials, heatmaps, lines) when it first
 * appears: slower, with a long soft landing.
 */
export const motion = {
  durationFast: "150ms",
  durationBase: "220ms",
  durationEnter: "560ms",
  ease: "cubic-bezier(0.2, 0, 0, 1)",
  easeEnter: "cubic-bezier(0.22, 1, 0.36, 1)",
};

/** Type roles: fixed rem sizes, with numerals on their own scale. */
export const type = {
  display: { weight: 700, size: "2.25rem", lineHeight: 1.22, tracking: "-0.02em" },
  headline: { weight: 700, size: "1.5rem", lineHeight: 1.33, tracking: "-0.015em" },
  title: { weight: 600, size: "1.125rem", lineHeight: 1.45, tracking: "-0.01em" },
  titleSm: { weight: 600, size: "1rem", lineHeight: 1.5, tracking: "-0.005em" },
  bodyLg: { weight: 400, size: "1rem", lineHeight: 1.625, tracking: "0" },
  body: { weight: 400, size: "0.875rem", lineHeight: 1.57, tracking: "0" },
  bodySm: { weight: 400, size: "0.8125rem", lineHeight: 1.54, tracking: "0" },
  label: { weight: 600, size: "0.875rem", lineHeight: 1.43, tracking: "0" },
  caption: { weight: 500, size: "0.75rem", lineHeight: 1.33, tracking: "0.01em" },
  numeralXl: { weight: 800, size: "3.5rem", lineHeight: 1.07, tracking: "-0.03em" },
  numeralL: { weight: 700, size: "2.5rem", lineHeight: 1.1, tracking: "-0.03em" },
  numeralM: { weight: 700, size: "1.75rem", lineHeight: 1.14, tracking: "-0.02em" },
};

// The accent fill and its states are the same in both themes.
const accent = {
  accent: "#0585E0",
  accentHover: "#0476C8",
  accentPress: "#0365AA",
  onAccent: "#FFFFFF",
};

/** Midnight: the dark theme. */
export const midnight = {
  name: "midnight",
  mode: "dark",
  ...accent,
  // Surfaces, from the page down to the highest step
  canvas: "#131522",
  surface: "#1D2030",
  raised: "#272B3F",
  high: "#323650",
  line: "#2C3048",
  fieldBorder: "#6A7096",
  // Text
  text: "#F1F3FB",
  muted: "#A9ADC9",
  subtle: "#9EA3C2",
  // Accent used as text, as a soft tint, and as the focus ring
  accentText: "#66BFFF",
  accentSoft: "#123954",
  focus: "#66BFFF",
  // The one inverted tile, the active nav pill, the highlighted bar
  spotlight: "#F1F3FB",
  onSpotlight: "#12141F",
  onSpotlightMuted: "#4B5066",
  // Status: text colour and soft tint
  success: "#52D6A0",
  successSoft: "#253D42",
  warning: "#FFC061",
  warningSoft: "#413A38",
  danger: "#FF7A8F",
  dangerSoft: "#412E3F",
  // Charts
  barMuted: "#7077A0",
  series: {
    blue: "#4D86FF",
    teal: "#2DD4BF",
    amber: "#FFC061",
    violet: "#A28BFF",
    coral: "#FF8A78",
    rose: "#F0405A",
    green: "#52D6A0",
    sky: "#5CC8FF",
    slate: "#9EA3C2",
  },
  // Layers that float above the page
  shadowFloatSm: "0 8px 24px rgba(8, 10, 24, 0.28)",
  shadowFloatMd: "0 16px 40px rgba(8, 10, 24, 0.45)",
  scrim: "rgba(10, 12, 24, 0.6)",
};

/** Daylight: the light theme. */
export const daylight = {
  name: "daylight",
  mode: "light",
  ...accent,
  canvas: "#F1F2F7",
  surface: "#FDFDFF",
  raised: "#F5F6FA",
  high: "#ECEEF5",
  line: "#E3E5EE",
  fieldBorder: "#7C84A0",
  text: "#11131C",
  muted: "#4B5066",
  subtle: "#5F657D",
  accentText: "#035FA0",
  accentSoft: "#E3F3FF",
  focus: "#0585E0",
  spotlight: "#11131C",
  onSpotlight: "#F4F6FD",
  onSpotlightMuted: "#B4B9D0",
  success: "#0B6B47",
  successSoft: "#E0EBE9",
  warning: "#8F5200",
  warningSoft: "#F0E8E0",
  danger: "#C81E3A",
  dangerSoft: "#F7E2E7",
  barMuted: "#7D87B4",
  series: {
    blue: "#1A66FF",
    teal: "#0B8A7E",
    amber: "#B26A00",
    violet: "#7A55F0",
    coral: "#D4472F",
    rose: "#F0405A",
    green: "#148A55",
    sky: "#0A7FB8",
    slate: "#6B7191",
  },
  shadowFloatSm: "0 8px 24px rgba(17, 19, 28, 0.10)",
  shadowFloatMd: "0 16px 40px rgba(17, 19, 28, 0.14)",
  scrim: "rgba(17, 19, 28, 0.4)",
};

export const themes = { midnight, daylight };

/** The token set for a mode: "dark" is Midnight, anything else is Daylight. */
export const themeForMode = (mode) => (mode === "light" ? daylight : midnight);
