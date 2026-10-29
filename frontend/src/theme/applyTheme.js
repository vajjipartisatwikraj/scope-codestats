import {
  FONT_FAMILY,
  FONT_MONO,
  daylight,
  midnight,
  motion,
  radii,
  spacing,
  type,
} from "./tokens";

/**
 * Publishes the design tokens to the page as CSS variables.
 *
 * Every token becomes a --ds-* variable: --ds-surface, --ds-accent-text, --ds-radius-xl,
 * --ds-series-blue and so on (camelCase keys become kebab-case). The colour variables are set
 * under [data-theme="midnight"] and [data-theme="daylight"], so switching theme is one
 * attribute change on <html>, and any subtree can opt in by carrying the attribute itself.
 *
 * Plain CSS then needs no theme logic:
 *     .card { background: var(--ds-surface); border-radius: var(--ds-radius-xl); }
 *
 * No Material UI in this file, so migrated components can depend on it freely.
 */

const STYLE_ID = "ds-theme-tokens";
const PREFIX = "--ds-";

const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

/** { a: { bC: 1 } } -> [["a-b-c", 1]] */
const flatten = (object, path = []) =>
  Object.entries(object).flatMap(([key, value]) =>
    value !== null && typeof value === "object"
      ? flatten(value, [...path, key])
      : [[[...path, key].map(kebab).join("-"), value]]
  );

const declare = (entries) =>
  entries.map(([name, value]) => `${PREFIX}${name}:${value};`).join("");

const px = (value) => `${value}px`;

/** Variables that are the same in both themes. */
const sharedVariables = () => [
  ["font", FONT_FAMILY],
  ["font-mono", FONT_MONO],
  ...Object.entries(radii).map(([key, value]) => [`radius-${key}`, px(value)]),
  ...Object.entries(spacing).map(([key, value]) => [`space-${key}`, px(value)]),
  ["duration-fast", motion.durationFast],
  ["duration-base", motion.durationBase],
  ["duration-enter", motion.durationEnter],
  ["ease", motion.ease],
  ["ease-enter", motion.easeEnter],
  // Ready-to-use font shorthands: `font: var(--ds-type-label);`
  ...Object.entries(type).flatMap(([role, spec]) => [
    [`type-${kebab(role)}`, `${spec.weight} ${spec.size}/${spec.lineHeight} ${FONT_FAMILY}`],
    [`tracking-${kebab(role)}`, spec.tracking],
  ]),
];

/** Every role of a theme except its name and mode. */
const colorVariables = ({ name, mode, ...roles }) => flatten(roles);

// Scrollbars follow the theme: a thin `high` thumb on the `canvas` track. :where() keeps the
// specificity at zero, so a component's own scrollbar styling still wins.
const SCROLLBAR_CSS = [
  ":where(html[data-theme]) *{scrollbar-width:thin;scrollbar-color:var(--ds-high) var(--ds-canvas)}",
  ":where(html[data-theme]) ::-webkit-scrollbar{width:8px;height:8px;background-color:var(--ds-canvas)}",
  ":where(html[data-theme]) ::-webkit-scrollbar-thumb{background-color:var(--ds-high);border-radius:4px}",
  ":where(html[data-theme]) ::-webkit-scrollbar-thumb:hover{background-color:var(--ds-bar-muted)}",
  ":where(html[data-theme]) ::-webkit-scrollbar-track{background-color:var(--ds-canvas)}",
].join("\n");

export const buildThemeCss = () =>
  [
    `:root{${declare(sharedVariables())}}`,
    ...[midnight, daylight].map(
      (theme) =>
        `[data-theme="${theme.name}"]{color-scheme:${theme.mode};${declare(colorVariables(theme))}}`
    ),
    SCROLLBAR_CSS,
  ].join("\n");

const THEME_CSS = buildThemeCss();

function ensureStylesheet() {
  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  // Compare so a hot reload picks up edited tokens without adding a second tag.
  if (style.textContent !== THEME_CSS) style.textContent = THEME_CSS;
}

/**
 * Make a token set the active theme: add the variables (once) and mark <html>.
 * The page background and text colour are set on <body> as before, so they win over any
 * page-level CSS and the document never flashes the wrong theme when switching.
 */
export function applyTheme(theme) {
  ensureStylesheet();
  document.documentElement.setAttribute("data-theme", theme.name);
  document.body.style.backgroundColor = theme.canvas;
  document.body.style.color = theme.text;
}
