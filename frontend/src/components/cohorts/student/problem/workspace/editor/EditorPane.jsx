import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { ArrowsInIcon } from '@phosphor-icons/react/dist/csr/ArrowsIn';
import { ArrowsOutIcon } from '@phosphor-icons/react/dist/csr/ArrowsOut';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/csr/LockSimple';
import { PencilSimpleLineIcon } from '@phosphor-icons/react/dist/csr/PencilSimpleLine';
import { Badge, IconButton, SelectField } from '../../../../../ui';
import Pane, { FoldButton } from '../../shared/Pane';
import { LANGUAGES, languageOptions } from '../../model/languages';
import CodeEditor from './CodeEditor';
import { encryptedCopy } from './encryptedClipboard';

/**
 * The editor pane: a header with the language, what is special about this question (encrypted
 * clipboard, fill in the blank) and the actions on the code (copy, download, expand, fold), over the
 * code editor. Expanding makes the pane fill the screen (a plain overlay, not the browser's full
 * screen, so an exam keeps its own fullscreen); Escape closes it.
 *
 *   question                        the question (its languages and its editor settings)
 *   language, onLanguage            the language and how to change it
 *   code, onCode                    the code and how it changes
 *   themeName                       "midnight" | "daylight"
 *   editorRef                       the editor's handle (getCodeForSubmission)
 *   folded, onFold                  fold to the header
 *   expanded, onExpand              fill the screen; omit onExpand to hide the button
 *   wrap                            wrap long lines (on a phone)
 */
export default function EditorPane({ question, language, onLanguage, code, onCode, themeName, editorRef, folded, onFold, expanded, onExpand, wrap }) {
  const options = languageOptions(question);
  const single = options.length <= 1;
  const encrypted = Boolean(question.encryptedEditor);
  const fillInTheBlank = Boolean(question.fillInTheBlank);

  useEffect(() => {
    if (!expanded) return undefined;
    const onKeyDown = (event) => event.key === 'Escape' && onExpand();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded, onExpand]);

  const currentCode = () => (editorRef.current?.getCodeForSubmission ? editorRef.current.getCodeForSubmission() : code);

  const copy = () => {
    if (encrypted) {
      encryptedCopy(currentCode());
      return;
    }
    navigator.clipboard.writeText(currentCode()).then(() => toast.info('Code copied to clipboard'));
  };

  const download = () => {
    const name = `solution.${LANGUAGES[language]?.extension || 'txt'}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([currentCode()], { type: 'text/plain' }));
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.info(`Downloaded as ${name}`);
  };

  const lead = (
    <>
      <SelectField variant="pill" aria-label="Language" value={language} onChange={(event) => onLanguage(event.target.value)} disabled={single} options={options} />
      {encrypted && !fillInTheBlank ? (
        <Badge tone="info" icon={<LockSimpleIcon size={14} weight="regular" aria-hidden="true" />}>
          Encrypted copy and paste
        </Badge>
      ) : null}
      {fillInTheBlank ? (
        <Badge tone="success" icon={<PencilSimpleLineIcon size={14} weight="regular" aria-hidden="true" />}>
          Fill in the blank
        </Badge>
      ) : null}
    </>
  );

  const actions = (
    <>
      <IconButton label="Copy the code" size="sm" tone="plain" onClick={copy}>
        <CopyIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>
      <IconButton label="Download the code" size="sm" tone="plain" onClick={download}>
        <DownloadSimpleIcon size={20} weight="regular" aria-hidden="true" />
      </IconButton>
      {onExpand ? (
        <IconButton label={expanded ? 'Close the large editor' : 'Make the editor large'} size="sm" tone="plain" onClick={onExpand} active={expanded}>
          {expanded ? <ArrowsInIcon size={20} weight="regular" aria-hidden="true" /> : <ArrowsOutIcon size={20} weight="regular" aria-hidden="true" />}
        </IconButton>
      ) : null}
      {onFold && !expanded ? <FoldButton folded={folded} onToggle={onFold} name="the editor" /> : null}
    </>
  );

  return (
    <Pane className="ps-editor" label="Code editor" lead={lead} actions={actions} folded={folded} flush data-expanded={expanded ? 'true' : 'false'}>
      <CodeEditor ref={editorRef} code={code} language={language} onChange={onCode} themeName={themeName} encrypted={encrypted} fillInTheBlank={fillInTheBlank} wrap={wrap} />
    </Pane>
  );
}
