import React, { useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { Skeleton } from '../../../../../ui';
import { defineScopeThemes, editorThemeFor } from '../../../../../CodePad/monacoThemes';
import { useTheme } from '../../../../../../contexts/ThemeContext';
import { monacoLanguageOf } from '../../model/languages';
import { editorOptions, useIgnoreEditorCancel } from './monacoSetup';

/**
 * CodeViewer: code in the same editor, read only, wrapped, in the current theme. Used for a
 * submission. Give the parent a height.
 *
 *   code, language   what to show
 */
export default function CodeViewer({ code, language }) {
  const { themeName } = useTheme();
  useIgnoreEditorCancel();
  const options = useMemo(() => editorOptions({ wrap: true, readOnly: true, label: 'Submitted code' }), []);
  return (
    <Editor
      height="100%"
      language={monacoLanguageOf(language)}
      value={code || ''}
      theme={editorThemeFor(themeName)}
      beforeMount={defineScopeThemes}
      loading={<Skeleton height="100%" radius={0} />}
      options={options}
    />
  );
}
