import { toast } from 'react-toastify';
import { decryptCode, encryptCode, isEncryptedContent, unwrapEncryptedContent, wrapEncryptedContent } from '../../../../../../utils/editorEncryption';

/**
 * The clipboard of an encrypted editor (a question set to "encrypted editor"). Code copied inside the
 * platform goes to the clipboard encrypted with the platform key and only pastes back inside the
 * platform. Anything pasted from outside is replaced by a comment that says so, and plain paste
 * shortcuts and drag and drop are blocked.
 *
 * The comment text is part of the record a teacher reads, so it is kept word for word.
 */

const OUTSIDE_PASTE = '/* \u26A0\uFE0F Pasted content is detected from outside of the platform */\n';

/** Copies text to the clipboard as encrypted, platform-only content */
export async function encryptedCopy(text) {
  try {
    const encrypted = encryptCode(text);
    if (!encrypted) {
      toast.error('Failed to encrypt code');
      return;
    }
    await navigator.clipboard.writeText(wrapEncryptedContent(encrypted));
  } catch (error) {
    console.error('Copy failed:', error);
    toast.error('Failed to copy code');
  }
}

function pasteInto(editor, text) {
  editor.executeEdits('paste', [{ range: editor.getSelection(), text, forceMoveMarkers: true }]);
  editor.focus();
}

async function encryptedPaste(editor) {
  try {
    const clipboard = await navigator.clipboard.readText();
    if (!isEncryptedContent(clipboard)) {
      // Plain text carries no platform marker: it came from outside
      pasteInto(editor, OUTSIDE_PASTE);
      return;
    }
    const decrypted = decryptCode(unwrapEncryptedContent(clipboard) || '');
    if (decrypted) {
      pasteInto(editor, decrypted);
    } else {
      pasteInto(editor, OUTSIDE_PASTE);
      toast.error('Invalid encrypted content');
    }
  } catch (error) {
    console.error('Paste failed:', error);
    toast.error('Paste failed');
  }
}

/** The selected text, or the current line when nothing is selected (what the editor copies) */
function rangesToCopy(editor, monaco) {
  const model = editor.getModel();
  const selected = editor.getSelections().filter((selection) => !selection.isEmpty());
  if (selected.length > 0) return selected;
  const line = editor.getPosition()?.lineNumber;
  if (!model || !line) return [];
  const last = line === model.getLineCount();
  return [last ? new monaco.Range(Math.max(1, line - 1), line > 1 ? model.getLineMaxColumn(line - 1) : 1, line, model.getLineMaxColumn(line)) : new monaco.Range(line, 1, line + 1, 1)];
}

/**
 * Installs the encrypted clipboard on an editor. Returns a function that removes the listeners
 * added to the editor's element.
 */
export function installEncryptedClipboard(editor, monaco) {
  const { KeyMod, KeyCode } = monaco;
  const selectedText = () => editor.getModel().getValueInRange(editor.getSelection());

  editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyV, () => encryptedPaste(editor));
  editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyV, () => toast.warning('Paste is disabled'));
  editor.addCommand(KeyMod.Shift | KeyCode.Insert, () => toast.warning('Paste is disabled'));
  editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyC, () => {
    const text = selectedText();
    if (text) encryptedCopy(text);
  });

  editor.addAction({
    id: 'encrypted-copy',
    label: 'Copy (encrypted)',
    contextMenuGroupId: 'navigation',
    contextMenuOrder: 1,
    run: () => {
      const text = selectedText();
      if (text) encryptedCopy(text);
    },
  });
  editor.addAction({ id: 'encrypted-paste', label: 'Paste (encrypted)', contextMenuGroupId: 'navigation', contextMenuOrder: 2, run: () => encryptedPaste(editor) });

  const node = editor.getDomNode();
  if (!node) return () => {};

  // A native paste (a context menu, the middle button, a virtual keyboard) never reaches the editor
  const blockPaste = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toast.warning('Paste is disabled');
  };
  // Paste shortcuts are stopped before they reach the editor, on any keyboard layout
  const blockShortcut = (event) => {
    const key = (event.key || '').toLowerCase();
    const pasteKey = key === 'v' || event.code === 'KeyV';
    const insertKey = key === 'insert' || event.code === 'Insert';
    if (((event.ctrlKey || event.metaKey) && event.shiftKey && pasteKey) || (event.shiftKey && insertKey)) blockPaste(event);
  };
  // A native copy or cut would put plain text on the clipboard, which the encrypted paste would
  // then reject as "from outside". Both go through the encrypted clipboard, and a cut also removes the text.
  const clipboardEvent = (cut) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    const model = editor.getModel();
    const ranges = rangesToCopy(editor, monaco);
    if (!model || ranges.length === 0) return;
    const text = ranges.map((range) => model.getValueInRange(range)).join('\n');
    if (!text) return;
    const encrypted = encryptCode(text);
    if (!encrypted) {
      toast.error('Failed to encrypt code');
      return;
    }
    const wrapped = wrapEncryptedContent(encrypted);
    if (event.clipboardData) event.clipboardData.setData('text/plain', wrapped);
    else navigator.clipboard.writeText(wrapped).catch(() => {});
    if (cut) editor.executeEdits('encrypted-cut', ranges.map((range) => ({ range, text: '', forceMoveMarkers: true })));
  };
  const onCopy = clipboardEvent(false);
  const onCut = clipboardEvent(true);
  const onDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    toast.warning('Drag and drop is disabled');
  };
  const swallow = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  node.addEventListener('paste', blockPaste, true);
  node.addEventListener('keydown', blockShortcut, true);
  node.addEventListener('copy', onCopy, true);
  node.addEventListener('cut', onCut, true);
  node.addEventListener('drop', onDrop);
  node.addEventListener('dragover', swallow);
  node.addEventListener('dragenter', swallow);
  return () => {
    node.removeEventListener('paste', blockPaste, true);
    node.removeEventListener('keydown', blockShortcut, true);
    node.removeEventListener('copy', onCopy, true);
    node.removeEventListener('cut', onCut, true);
    node.removeEventListener('drop', onDrop);
    node.removeEventListener('dragover', swallow);
    node.removeEventListener('dragenter', swallow);
  };
}
