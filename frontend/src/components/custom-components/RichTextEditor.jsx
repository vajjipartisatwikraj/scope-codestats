import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { EraserIcon } from '@phosphor-icons/react/dist/csr/Eraser';
import { LinkBreakIcon } from '@phosphor-icons/react/dist/csr/LinkBreak';
import { LinkIcon } from '@phosphor-icons/react/dist/csr/Link';
import { ListBulletsIcon } from '@phosphor-icons/react/dist/csr/ListBullets';
import { ListNumbersIcon } from '@phosphor-icons/react/dist/csr/ListNumbers';
import { TextBIcon } from '@phosphor-icons/react/dist/csr/TextB';
import { TextHThreeIcon } from '@phosphor-icons/react/dist/csr/TextHThree';
import { TextItalicIcon } from '@phosphor-icons/react/dist/csr/TextItalic';
import { TextUnderlineIcon } from '@phosphor-icons/react/dist/csr/TextUnderline';
import { WarningCircleIcon } from '@phosphor-icons/react/dist/csr/WarningCircle';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import '../ui/prose.css';
import './RichTextEditor.css';

/**
 * RichTextEditor: a small writing box with a toolbar, for text that is stored as HTML (an
 * announcement's description). Heading, bold, italic, underline, bulleted and numbered lists, links
 * and "clear formatting". Pasted text keeps no formatting, so nothing odd arrives from a web page or
 * a document. What it hands back is cleaned (scripts, event handlers and javascript: links removed)
 * and is empty ("") when nothing was written. Show it with <Prose html={...} />.
 *
 * It is uncontrolled while someone types, so the caret never jumps; a `value` that differs from the
 * last thing it handed back (a form that was reset, another item opened) replaces the content.
 *
 * Props
 *   label        the label above the editor
 *   value        the HTML
 *   onChange(html)   called as the text changes
 *   placeholder  shown while the editor is empty
 *   hint         one muted line under the editor
 *   error        a sentence that says what to fix (linked to the editor)
 *   maxLength    optional: how many characters of text; a counter shows and goes red above it
 *   minHeight    the height of the writing area in px (default 160; it grows with the text)
 *   id           optional id of the writing area
 *   disabled
 *
 * Colours come from --rte-* variables that default to --ds-* tokens, so it follows Midnight and
 * Daylight without any theme code.
 */

/** Toolbar buttons that run a browser editing command. `state` is the command whose state shows as pressed. */
const FORMATS = [
  { key: 'heading', label: 'Heading', icon: TextHThreeIcon, run: 'heading', toggle: true },
  { key: 'bold', label: 'Bold', icon: TextBIcon, command: 'bold', state: 'bold', toggle: true, shortcut: 'Ctrl+B' },
  { key: 'italic', label: 'Italic', icon: TextItalicIcon, command: 'italic', state: 'italic', toggle: true, shortcut: 'Ctrl+I' },
  { key: 'underline', label: 'Underline', icon: TextUnderlineIcon, command: 'underline', state: 'underline', toggle: true, shortcut: 'Ctrl+U' },
];
const LISTS = [
  { key: 'bullets', label: 'Bulleted list', icon: ListBulletsIcon, command: 'insertUnorderedList', state: 'insertUnorderedList', toggle: true },
  { key: 'numbers', label: 'Numbered list', icon: ListNumbersIcon, command: 'insertOrderedList', state: 'insertOrderedList', toggle: true },
];

const plainText = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();

/** The editor's HTML, cleaned; "" when there is no text and no picture */
function cleanHtml(html) {
  if (!plainText(html) && !/<img\b/i.test(html)) return '';
  return sanitizeHtml(html);
}

/** A web address from what was typed: http, https and mailto stay, a path stays, a bare name gets https:// */
function linkTarget(raw) {
  const text = String(raw || '').trim();
  if (!text) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return /^(https?:|mailto:)/i.test(text) ? text : '';
  if (text.startsWith('/') || text.startsWith('#')) return text;
  return `https://${text}`;
}

const escapeHtml = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export default function RichTextEditor({ label, value = '', onChange, placeholder = 'Write here', hint, error, maxLength, minHeight = 160, id: idProp, disabled = false }) {
  const autoId = useId();
  const id = idProp || autoId;
  const editorRef = useRef(null);
  const lastEmitted = useRef(null);
  const savedRange = useRef(null);
  const linkInputRef = useRef(null);
  const [empty, setEmpty] = useState(!value);
  const [length, setLength] = useState(() => plainText(value || '').length);
  const [active, setActive] = useState({});
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkError, setLinkError] = useState('');

  // Content from outside: the first value, a reset, another item. Typing never goes through here.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastEmitted.current) return;
    editor.innerHTML = value ? sanitizeHtml(value) : '';
    lastEmitted.current = value;
    setEmpty(!plainText(editor.innerHTML));
    setLength(plainText(editor.innerHTML).length);
  }, [value]);

  // Paragraphs, not <div>s, when Enter is pressed
  useEffect(() => {
    try {
      document.execCommand('defaultParagraphSeparator', false, 'p');
    } catch (failure) {
      /* an old browser keeps its own separator */
    }
  }, []);

  const refreshActive = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;
    const next = {};
    [...FORMATS, ...LISTS].forEach((item) => {
      if (item.state) next[item.key] = document.queryCommandState(item.state);
    });
    next.heading = String(document.queryCommandValue('formatBlock')).toLowerCase() === 'h3';
    setActive(next);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  /** Read the editor, tell the form, and keep the empty and length states up to date */
  const sync = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // Links open in a new tab and carry rel, so a reader never loses the page they were on
    editor.querySelectorAll('a[href]').forEach((anchor) => {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    });
    const text = plainText(editor.innerHTML);
    setEmpty(!text);
    setLength(text.length);
    const html = cleanHtml(editor.innerHTML);
    lastEmitted.current = html;
    if (onChange) onChange(html);
  }, [onChange]);

  const run = (command, argument) => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
    document.execCommand(command, false, argument);
    sync();
    refreshActive();
  };

  const toggleHeading = () => run('formatBlock', String(document.queryCommandValue('formatBlock')).toLowerCase() === 'h3' ? 'p' : 'h3');

  const clearFormatting = () => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    editor.focus();
    document.execCommand('removeFormat');
    document.execCommand('unlink');
    document.execCommand('formatBlock', false, 'p');
    sync();
    refreshActive();
  };

  const openLink = () => {
    const editor = editorRef.current;
    if (!editor || disabled) return;
    const selection = window.getSelection();
    savedRange.current = selection && selection.rangeCount && editor.contains(selection.anchorNode) ? selection.getRangeAt(0).cloneRange() : null;
    setLinkValue('');
    setLinkError('');
    setLinkOpen(true);
    window.requestAnimationFrame(() => linkInputRef.current && linkInputRef.current.focus());
  };

  const closeLink = () => {
    setLinkOpen(false);
    const editor = editorRef.current;
    if (editor) editor.focus();
  };

  const applyLink = (event) => {
    event.preventDefault();
    const target = linkTarget(linkValue);
    if (!target) {
      setLinkError('Enter a web address, for example scope.mlrit.ac.in');
      return;
    }
    const editor = editorRef.current;
    editor.focus();
    const selection = window.getSelection();
    if (savedRange.current) {
      selection.removeAllRanges();
      selection.addRange(savedRange.current);
    }
    if (selection.isCollapsed) {
      // Nothing was selected: the address is also the text of the link
      document.execCommand('insertHTML', false, `<a href="${escapeHtml(target)}">${escapeHtml(linkValue.trim())}</a>`);
    } else {
      document.execCommand('createLink', false, target);
    }
    sync();
    setLinkOpen(false);
  };

  const onPaste = (event) => {
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    if (text) document.execCommand('insertText', false, text);
  };

  const onKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openLink();
    }
  };

  const over = typeof maxLength === 'number' && length > maxLength;
  const labelId = `${id}-label`;
  const describedBy = [hint && !error ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;
  // A mouse press on a toolbar button must not take the selection away from the writing area
  const keepSelection = (event) => event.preventDefault();

  const button = (item, onClick) => {
    const Icon = item.icon;
    const pressed = Boolean(active[item.key]);
    return (
      <button
        key={item.key}
        type="button"
        className="rte__tool"
        aria-label={item.label}
        aria-pressed={item.toggle ? pressed : undefined}
        title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
        disabled={disabled}
        onMouseDown={keepSelection}
        onClick={onClick}
      >
        <Icon size={18} weight={pressed ? 'bold' : 'regular'} aria-hidden="true" />
      </button>
    );
  };

  return (
    <div className="rte" data-invalid={error || over ? 'true' : 'false'} data-disabled={disabled ? 'true' : 'false'}>
      {label ? (
        <span className="rte__label" id={labelId}>
          {label}
        </span>
      ) : null}
      <div className="rte__box">
        <div className="rte__toolbar" role="toolbar" aria-label={label ? `${label} formatting` : 'Formatting'}>
          {FORMATS.map((item) => button(item, item.run === 'heading' ? toggleHeading : () => run(item.command)))}
          <span className="rte__sep" aria-hidden="true" />
          {LISTS.map((item) => button(item, () => run(item.command)))}
          <span className="rte__sep" aria-hidden="true" />
          {button({ key: 'link', label: 'Add link', icon: LinkIcon, shortcut: 'Ctrl+K' }, openLink)}
          {button({ key: 'unlink', label: 'Remove link', icon: LinkBreakIcon }, () => run('unlink'))}
          <span className="rte__sep" aria-hidden="true" />
          {button({ key: 'clear', label: 'Clear formatting', icon: EraserIcon }, clearFormatting)}
        </div>

        {linkOpen ? (
          <form className="rte__link" onSubmit={applyLink} noValidate>
            <input
              ref={linkInputRef}
              className="rte__link-input"
              type="text"
              inputMode="url"
              value={linkValue}
              placeholder="Web address"
              aria-label="Web address of the link"
              aria-invalid={linkError ? true : undefined}
              onChange={(event) => {
                setLinkValue(event.target.value);
                setLinkError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  closeLink();
                }
              }}
            />
            <button type="submit" className="rte__link-button" data-primary="true">
              Add link
            </button>
            <button type="button" className="rte__link-button" onClick={closeLink}>
              Cancel
            </button>
            {linkError ? (
              <p className="rte__link-error" role="alert">
                {linkError}
              </p>
            ) : null}
          </form>
        ) : null}

        <div
          ref={editorRef}
          id={id}
          className="rte__area ui-prose"
          role="textbox"
          aria-multiline="true"
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          aria-disabled={disabled ? true : undefined}
          contentEditable={!disabled}
          suppressContentEditableWarning
          spellCheck
          data-empty={empty ? 'true' : 'false'}
          data-placeholder={placeholder}
          style={{ minHeight }}
          onInput={sync}
          onBlur={sync}
          onPaste={onPaste}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="rte__foot">
        <div className="rte__notes">
          {hint && !error ? (
            <p className="rte__hint" id={`${id}-hint`}>
              {hint}
            </p>
          ) : null}
          {error ? (
            <p className="rte__error" id={`${id}-error`} role="alert">
              <WarningCircleIcon size={16} weight="fill" aria-hidden="true" />
              <span>{error}</span>
            </p>
          ) : null}
        </div>
        {typeof maxLength === 'number' ? (
          <p className="rte__count" data-over={over ? 'true' : 'false'}>
            <span className="rte__sr">Characters: </span>
            {length} / {maxLength}
            {over ? <span className="rte__sr"> (too long)</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
