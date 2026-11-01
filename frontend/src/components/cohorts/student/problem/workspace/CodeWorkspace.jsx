import React, { useState } from 'react';
import useSplit from '../../../../CodePad/useSplit';
import Gutter from '../shared/Gutter';
import ConsolePane from '../console/ConsolePane';
import EditorPane from './editor/EditorPane';
import './workspace.css';

/**
 * The editor above the console, with a draggable 8px gutter between them (arrow keys move it too).
 * Either can be folded to its header; then the gutter goes and the other takes the height. From a
 * small screen on, `stacked` is false and the two are shown one at a time by the page instead.
 *
 *   question, runner, themeName, editorRef, context   see EditorPane and ConsolePane
 *   fold                'editor' | 'test' | null: which pane is folded (state kept by the page)
 *   onFold(name)        toggles a fold
 *   wide                a desktop layout: the editor can be made large
 *   part                'both' (desktop) | 'editor' | 'console': which pane a phone shows
 */
export default function CodeWorkspace({ question, runner, themeName, editorRef, context, fold, onFold, wide, part = 'both' }) {
  const rows = useSplit({ axis: 'y', initial: 0.55, min: 0.25, max: 0.8, label: 'Resize the editor and the test cases' });
  const [expanded, setExpanded] = useState(false);

  const editor = (
    <EditorPane
      question={question}
      language={runner.language}
      onLanguage={runner.selectLanguage}
      code={runner.code}
      onCode={runner.setCode}
      themeName={themeName}
      editorRef={editorRef}
      folded={fold === 'editor'}
      onFold={wide ? () => onFold('editor') : undefined}
      expanded={expanded}
      onExpand={wide ? () => setExpanded((open) => !open) : undefined}
      wrap={!wide}
    />
  );
  const consolePane = <ConsolePane question={question} runner={runner} folded={fold === 'test'} onFold={() => onFold('test')} context={context} />;

  // A phone shows one pane at a time; the other stays mounted (hidden) so the editor keeps its state
  if (part !== 'both') {
    return (
      <>
        <div className="ps-solo" hidden={part !== 'editor'}>
          {editor}
        </div>
        <div className="ps-solo" hidden={part !== 'console'}>
          {consolePane}
        </div>
      </>
    );
  }

  const template = fold === 'editor' ? 'auto 0 minmax(0, 1fr)' : fold === 'test' ? 'minmax(0, 1fr) 0 auto' : `minmax(0, ${rows.ratio}fr) 8px minmax(0, ${1 - rows.ratio}fr)`;
  return (
    <div className="ps-workspace" ref={rows.containerRef} style={{ gridTemplateRows: template }} data-dragging={rows.dragging ? 'true' : 'false'}>
      {editor}
      {fold ? <span aria-hidden="true" /> : <Gutter axis="y" gutterProps={rows.gutterProps} />}
      {consolePane}
    </div>
  );
}
