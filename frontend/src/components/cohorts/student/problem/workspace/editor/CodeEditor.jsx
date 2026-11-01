import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Skeleton } from '../../../../../ui';
import { defineScopeThemes, editorThemeFor } from '../../../../../CodePad/monacoThemes';
import {
  FILL_IN_BLANK_MARKERS,
  applyFillInBlankDecorations,
  injectFillInBlankStyles,
  parseFillInBlankRegions,
  removeMarkerLinesForDisplay,
  setupFillInBlankRestrictions,
} from '../../../../../cohort/fillInBlankUtils';
import { monacoLanguageOf } from '../../model/languages';
import { installEncryptedClipboard } from './encryptedClipboard';
import { editorOptions, useIgnoreEditorCancel } from './monacoSetup';

/**
 * The code editor: Monaco in the scope-midnight or scope-daylight theme.
 *
 *   code, language, onChange   what is being edited
 *   themeName                  "midnight" | "daylight" (ThemeContext)
 *   encrypted                  the question uses the encrypted clipboard (see encryptedClipboard.js)
 *   fillInTheBlank             only the regions marked in the starter code can be edited. The markers
 *                              are never shown, and getCodeForSubmission() returns the code without them.
 *   wrap                       wrap long lines (on a phone)
 *   ref                        { getCodeForSubmission() }
 */
const CodeEditor = forwardRef(function CodeEditor({ code, language, onChange, themeName, encrypted = false, fillInTheBlank = false, wrap = false }, ref) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const markedRef = useRef('');
  useIgnoreEditorCancel();

  // The starter code of a fill-in-the-blank question carries markers around the editable regions.
  // The editor shows it without them and keeps the marked copy to know where the regions are.
  const marked = fillInTheBlank && code.includes(FILL_IN_BLANK_MARKERS.START);
  if (marked) markedRef.current = code;
  const value = marked ? removeMarkerLinesForDisplay(code) : code;

  useImperativeHandle(ref, () => ({ getCodeForSubmission: () => (editorRef.current ? editorRef.current.getValue() : value) }), [value]);

  useEffect(() => {
    if (!mounted || !fillInTheBlank || !markedRef.current) return undefined;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const { editableRegions } = parseFillInBlankRegions(markedRef.current);
    if (!editableRegions || editableRegions.length === 0) return undefined;
    injectFillInBlankStyles();
    applyFillInBlankDecorations(editor, monaco, markedRef.current);
    const stop = setupFillInBlankRestrictions(editor, markedRef.current, editableRegions, monaco);
    return () => {
      if (stop) stop();
      editor.deltaDecorations(editor._fillInBlankDecorations || [], []);
    };
  }, [mounted, fillInTheBlank, markedRef.current]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeClipboard = useRef(null);
  useEffect(() => () => removeClipboard.current && removeClipboard.current(), []);

  const options = useMemo(() => editorOptions({ wrap }), [wrap]);

  const onMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    if (encrypted && !fillInTheBlank) removeClipboard.current = installEncryptedClipboard(editor, monaco);
    setMounted(true);
  };

  return (
    <Editor
      height="100%"
      language={monacoLanguageOf(language)}
      value={value}
      onChange={(next) => onChange(next ?? '')}
      theme={editorThemeFor(themeName)}
      beforeMount={defineScopeThemes}
      onMount={onMount}
      loading={<Skeleton height="100%" radius={0} />}
      options={options}
    />
  );
});

export default CodeEditor;
