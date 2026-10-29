import React, { useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { ArrowCounterClockwiseIcon } from '@phosphor-icons/react/dist/csr/ArrowCounterClockwise';
import { FONT_MONO } from '../../theme/tokens';
import Tip from './Tip';
import { LANGUAGES, fileNameOf } from './codePadLanguages';
import { defineScopeThemes, editorThemeFor } from './monacoThemes';

/**
 * The editor pane: a header with the file name and the actions on the code (start again, copy,
 * download), and the code editor (Monaco) in the scope-midnight or scope-daylight theme.
 *
 *   language, code, onCodeChange   what is being edited
 *   themeName                      "midnight" | "daylight" (ThemeContext)
 *   copied                         true for a moment after the code was copied
 *   onReset, onCopy, onDownload    the actions
 *   wrap                           wrap long lines (on a phone)
 */
export default function EditorPane({ language, code, onCodeChange, themeName, copied, onReset, onCopy, onDownload, wrap }) {
  // The editor cancels its own pending work when it unmounts and reports it as an error; that is
  // expected, so it is kept out of the console while this pane is open
  useEffect(() => {
    const onError = (event) => {
      if (event.message && event.message.includes('Canceled')) event.preventDefault();
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);

  return (
    <section className="cp-pane" aria-labelledby="cp-editor-title">
      <header className="cp-pane__header">
        <h2 className="cp-pane__title" id="cp-editor-title">
          <CodeIcon size={20} weight="regular" aria-hidden="true" />
          <span className="cp-pane__file">{fileNameOf(language)}</span>
        </h2>
        <div className="cp-pane__actions">
          <Tip text="Start again with the starter code">
            <button type="button" className="cp-icon-button" onClick={onReset} aria-label="Start again with the starter code">
              <ArrowCounterClockwiseIcon size={20} weight="regular" aria-hidden="true" />
            </button>
          </Tip>
          <Tip text={copied ? 'Copied' : 'Copy the code'}>
            <button type="button" className="cp-icon-button" onClick={onCopy} aria-label={copied ? 'Code copied' : 'Copy the code'} data-done={copied ? 'true' : 'false'}>
              {copied ? <CheckIcon size={20} weight="bold" aria-hidden="true" /> : <CopyIcon size={20} weight="regular" aria-hidden="true" />}
            </button>
          </Tip>
          <Tip text="Download the code">
            <button type="button" className="cp-icon-button" onClick={onDownload} aria-label="Download the code">
              <DownloadSimpleIcon size={20} weight="regular" aria-hidden="true" />
            </button>
          </Tip>
        </div>
      </header>

      <div className="cp-editor">
        <Editor
          height="100%"
          language={LANGUAGES[language].monaco}
          value={code}
          onChange={(value) => onCodeChange(value ?? '')}
          theme={editorThemeFor(themeName)}
          beforeMount={defineScopeThemes}
          loading={<div className="cp-editor__loading" role="status" aria-label="Loading the editor" />}
          options={{
            ariaLabel: 'Code editor',
            fontFamily: FONT_MONO,
            fontSize: 14,
            lineHeight: 22,
            fontLigatures: false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            overviewRulerBorder: false,
            renderLineHighlight: 'line',
            roundedSelection: true,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            wordWrap: wrap ? 'on' : 'off',
            padding: { top: 12, bottom: 12 },
            bracketPairColorization: { enabled: true },
            scrollbar: { alwaysConsumeMouseWheel: false, useShadows: false, verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
          }}
        />
      </div>
    </section>
  );
}
