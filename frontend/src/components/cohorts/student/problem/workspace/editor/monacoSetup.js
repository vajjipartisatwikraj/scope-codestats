import { useEffect } from 'react';
import { FONT_MONO } from '../../../../../../theme/tokens';

/**
 * The editor settings shared by the code editor and the read-only viewer of a submission. The theme
 * (scope-midnight or scope-daylight) comes from CodePad's monacoThemes.js, built from the tokens.
 */
export function editorOptions({ wrap = false, readOnly = false, label = 'Code editor' } = {}) {
  return {
    ariaLabel: label,
    readOnly,
    domReadOnly: readOnly,
    fontFamily: FONT_MONO,
    fontSize: 14,
    lineHeight: 22,
    fontLigatures: false,
    tabSize: 2,
    minimap: { enabled: false },
    folding: false,
    stickyScroll: { enabled: false },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    overviewRulerBorder: false,
    renderLineHighlight: readOnly ? 'none' : 'line',
    roundedSelection: true,
    cursorBlinking: 'smooth',
    smoothScrolling: true,
    wordWrap: wrap ? 'on' : 'off',
    padding: { top: 12, bottom: 12 },
    bracketPairColorization: { enabled: true },
    scrollbar: { alwaysConsumeMouseWheel: false, useShadows: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
  };
}

/**
 * The editor cancels its own pending work when it unmounts and reports it as an error. That is
 * expected, so it is kept out of the console while an editor is open.
 */
export function useIgnoreEditorCancel() {
  useEffect(() => {
    const onError = (event) => {
      if (event.message && event.message.includes('Canceled')) event.preventDefault();
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);
}
