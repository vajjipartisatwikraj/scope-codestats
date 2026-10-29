import React, { useCallback, useEffect, useRef, useState } from 'react';
import { CornersInIcon } from '@phosphor-icons/react/dist/csr/CornersIn';
import { CornersOutIcon } from '@phosphor-icons/react/dist/csr/CornersOut';
import { DesktopIcon } from '@phosphor-icons/react/dist/csr/Desktop';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
import { SpinnerGapIcon } from '@phosphor-icons/react/dist/csr/SpinnerGap';
import { PillTabs } from '../custom-components';
import { useTheme } from '../../contexts/ThemeContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import './CodePad.css';
import EditorPane from './EditorPane';
import InputPane from './InputPane';
import LanguageSelect from './LanguageSelect';
import OutputPane from './OutputPane';
import Tip from './Tip';
import useCodePad from './useCodePad';
import useSplit from './useSplit';

/**
 * CodePad (route /codepad): a scratch editor for trying code in the browser.
 *
 * It follows design/screens.md section 9 (code editor surfaces), without a problem pane:
 *   - a 56px header strip: the title, the language select (a pill), full screen and the one primary
 *     button, Run
 *   - from 900px a full-height split: the editor on the left, the output above the input on the right,
 *     with 8px gutters that can be dragged (or moved with the arrow keys)
 *   - below 900px the editor, the output and the input become tabs
 *   - plain CSS on the design tokens (CodePad.css); the editor is Monaco in the scope-midnight and
 *     scope-daylight themes (monacoThemes.js)
 *
 * Only the interface is built: Run does not execute anything yet (see useCodePad.js).
 */

const TABS = [
  { key: 'editor', label: 'Editor' },
  { key: 'output', label: 'Output' },
  { key: 'input', label: 'Input' },
];

export default function CodePad() {
  const { themeName } = useTheme();
  const wide = useMediaQuery('(min-width: 900px)');
  const pad = useCodePad();
  const rootRef = useRef(null);
  const [tab, setTab] = useState('editor');
  const [fullscreen, setFullscreen] = useState(false);

  // The editor takes 58% of the width, the output 62% of the height of the right side
  const columns = useSplit({ axis: 'x', initial: 0.58, min: 0.3, max: 0.75, label: 'Resize the editor and the console' });
  const rows = useSplit({ axis: 'y', initial: 0.62, min: 0.25, max: 0.8, label: 'Resize the output and the input' });

  const running = pad.status === 'running';

  const startRun = pad.run;
  const run = useCallback(() => {
    startRun();
    // On a small screen the result is on another tab: take the student to it
    setTab('output');
  }, [startRun]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (rootRef.current && rootRef.current.requestFullscreen) rootRef.current.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Also follows the Escape key, which leaves full screen without going through the button
  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const editor = (
    <EditorPane
      language={pad.language}
      code={pad.code}
      onCodeChange={pad.setCode}
      themeName={themeName}
      copied={pad.copiedCode}
      onReset={pad.resetCode}
      onCopy={pad.copyCode}
      onDownload={pad.downloadCode}
      wrap={!wide}
    />
  );
  const output = <OutputPane status={pad.status} output={pad.output} notice={pad.notice} copied={pad.copiedOutput} onCopy={pad.copyOutput} onRun={run} />;
  const input = <InputPane value={pad.input} onChange={pad.setInput} />;

  return (
    <div className="cp" ref={rootRef} data-fullscreen={fullscreen ? 'true' : 'false'}>
      <header className="cp-header">
        <h1 className="cp-title">CodePad</h1>
        <div className="cp-header__actions">
          <LanguageSelect value={pad.language} onChange={pad.setLanguage} />
          {wide ? (
            <Tip text={fullscreen ? 'Leave full screen' : 'Full screen'}>
              <button
                type="button"
                className="cp-icon-button cp-icon-button--large"
                onClick={toggleFullscreen}
                aria-label={fullscreen ? 'Leave full screen' : 'Full screen'}
                aria-pressed={fullscreen}
              >
                {fullscreen ? <CornersInIcon size={20} weight="regular" aria-hidden="true" /> : <CornersOutIcon size={20} weight="regular" aria-hidden="true" />}
              </button>
            </Tip>
          ) : null}
          <button type="button" className="cp-run" onClick={run} disabled={running} aria-busy={running}>
            {running ? <SpinnerGapIcon size={18} weight="bold" aria-hidden="true" data-spin="true" /> : <PlayIcon size={18} weight="fill" aria-hidden="true" />}
            <span>Run</span>
          </button>
        </div>
      </header>

      <p className="cp-small-screen">
        <DesktopIcon size={20} weight="regular" aria-hidden="true" />
        <span>CodePad works best on a larger screen. You can still write and read code here.</span>
      </p>

      {wide ? (
        <div
          className="cp-body"
          ref={columns.containerRef}
          data-dragging={columns.dragging || rows.dragging ? 'true' : 'false'}
          style={{ gridTemplateColumns: `minmax(0, ${columns.ratio}fr) 8px minmax(0, ${1 - columns.ratio}fr)` }}
        >
          {editor}
          <div className="cp-gutter" data-axis="x" {...columns.gutterProps}>
            <span className="cp-gutter__handle" />
          </div>
          <div className="cp-side" ref={rows.containerRef} style={{ gridTemplateRows: `minmax(0, ${rows.ratio}fr) 8px minmax(0, ${1 - rows.ratio}fr)` }}>
            {output}
            <div className="cp-gutter" data-axis="y" {...rows.gutterProps}>
              <span className="cp-gutter__handle" />
            </div>
            {input}
          </div>
        </div>
      ) : (
        <>
          <PillTabs items={TABS} value={tab} onChange={setTab} label="CodePad views" idPrefix="cp" className="cp-tabs" />
          <div className="cp-body cp-body--tabs">
            {TABS.map(({ key }) => (
              <div key={key} className="cp-panel" role="tabpanel" id={`cp-panel-${key}`} aria-labelledby={`cp-tab-${key}`} hidden={tab !== key}>
                {key === 'editor' ? editor : key === 'output' ? output : input}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
