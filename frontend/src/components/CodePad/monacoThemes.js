import { daylight, midnight } from '../../theme/tokens';

/**
 * The editor themes of CodePad: scope-midnight and scope-daylight (DESIGN.md, Theme behaviour).
 *
 * They are built from the same roles as the rest of the interface, read from theme/tokens.js, so
 * the editor never drifts from the page around it. The editor needs plain colour values (it cannot
 * read CSS variables), which is why this file imports the tokens instead of using var(--ds-*).
 * Syntax colours come from the data series: keywords violet, strings green, numbers amber, types
 * sky, tags and attributes coral, comments in the subtle text colour.
 */

const bare = (hex) => hex.replace('#', '');

function build(t) {
  const s = t.series;
  return {
    base: t.mode === 'dark' ? 'vs-dark' : 'vs',
    inherit: false,
    rules: [
      { token: '', foreground: bare(t.text) },
      { token: 'comment', foreground: bare(t.subtle), fontStyle: 'italic' },
      { token: 'keyword', foreground: bare(s.violet) },
      { token: 'keyword.control', foreground: bare(s.violet) },
      { token: 'string', foreground: bare(s.green) },
      { token: 'string.escape', foreground: bare(s.teal) },
      { token: 'number', foreground: bare(s.amber) },
      { token: 'number.float', foreground: bare(s.amber) },
      { token: 'constant', foreground: bare(s.amber) },
      { token: 'type', foreground: bare(s.sky) },
      { token: 'type.identifier', foreground: bare(s.sky) },
      { token: 'predefined', foreground: bare(s.sky) },
      { token: 'identifier', foreground: bare(t.text) },
      { token: 'variable', foreground: bare(t.text) },
      { token: 'operator', foreground: bare(t.muted) },
      { token: 'delimiter', foreground: bare(t.muted) },
      { token: 'delimiter.bracket', foreground: bare(t.muted) },
      { token: 'tag', foreground: bare(s.coral) },
      { token: 'attribute.name', foreground: bare(s.amber) },
      { token: 'attribute.value', foreground: bare(s.green) },
      { token: 'annotation', foreground: bare(s.amber) },
      { token: 'metatag', foreground: bare(s.violet) },
    ],
    colors: {
      'editor.background': t.surface,
      'editor.foreground': t.text,
      'editorGutter.background': t.surface,
      'editorLineNumber.foreground': t.subtle,
      'editorLineNumber.activeForeground': t.text,
      'editor.lineHighlightBackground': t.raised,
      'editor.selectionBackground': t.accentSoft,
      'editor.inactiveSelectionBackground': t.high,
      'editor.selectionHighlightBackground': t.accentSoft,
      'editor.wordHighlightBackground': t.high,
      'editor.findMatchBackground': t.accentSoft,
      'editor.findMatchHighlightBackground': t.high,
      'editorCursor.foreground': t.accentText,
      'editorIndentGuide.background1': t.line,
      'editorIndentGuide.activeBackground1': t.fieldBorder,
      'editorWhitespace.foreground': t.line,
      'editorBracketMatch.background': t.accentSoft,
      'editorBracketMatch.border': t.accentText,
      'editorBracketHighlight.foreground1': s.blue,
      'editorBracketHighlight.foreground2': s.amber,
      'editorBracketHighlight.foreground3': s.violet,
      'editorBracketHighlight.foreground4': s.teal,
      'editorBracketHighlight.foreground5': s.coral,
      'editorBracketHighlight.foreground6': s.green,
      'scrollbarSlider.background': t.high,
      'scrollbarSlider.hoverBackground': t.barMuted,
      'scrollbarSlider.activeBackground': t.fieldBorder,
      'editorWidget.background': t.raised,
      'editorWidget.border': t.line,
      'editorSuggestWidget.background': t.raised,
      'editorSuggestWidget.border': t.line,
      'editorSuggestWidget.selectedBackground': t.high,
      'editorHoverWidget.background': t.raised,
      'editorHoverWidget.border': t.line,
      'input.background': t.surface,
      'input.border': t.fieldBorder,
      focusBorder: t.focus,
    },
  };
}

export const MIDNIGHT_EDITOR_THEME = 'scope-midnight';
export const DAYLIGHT_EDITOR_THEME = 'scope-daylight';

/** Registers both themes with the editor. Call it from the editor's beforeMount. */
export function defineScopeThemes(monaco) {
  monaco.editor.defineTheme(MIDNIGHT_EDITOR_THEME, build(midnight));
  monaco.editor.defineTheme(DAYLIGHT_EDITOR_THEME, build(daylight));
}

/** The editor theme that matches a theme name from ThemeContext ("midnight" | "daylight") */
export const editorThemeFor = (themeName) => (themeName === 'daylight' ? DAYLIGHT_EDITOR_THEME : MIDNIGHT_EDITOR_THEME);
