import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_LANGUAGE, LANGUAGES, fileNameOf } from './codePadLanguages';

/**
 * The state of CodePad. Only the interface lives here: nothing is sent to a server.
 *
 *   language, setLanguage   the chosen language; each language keeps its own draft, so switching
 *                           back and forth never loses what was typed
 *   code, setCode           the draft of the current language
 *   resetCode()             back to the starter program of the current language
 *   input, setInput         the text for stdin
 *   status                  'idle' | 'running' | 'success' | 'compile' | 'runtime'
 *   output                  the text the program printed (or the error text)
 *   notice                  a line about the page itself, shown apart from the program's output
 *   run()                   starts a run
 *   copiedCode, copiedOutput, copyCode(), copyOutput(), downloadCode()
 *
 * RUNNING IS NOT CONNECTED. run() only plays the "running" state for a moment and leaves a notice
 * that says so; it makes no request. To connect it, replace the body of run() with the request that
 * the previous page made (see runCode in utils/compilerApi.js) and set
 * status to 'success', 'compile' or 'runtime' and output to the text it returns. Nothing in the
 * components needs to change: they already draw all of those states.
 */

const NOT_CONNECTED = 'Running code is not connected in this version of CodePad. The editor, the input and the layout are ready for it.';

export default function useCodePad() {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);
  const [drafts, setDrafts] = useState({});
  const [input, setInput] = useState('');
  const [status, setStatus] = useState('idle');
  const [output, setOutput] = useState('');
  const [notice, setNotice] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const timers = useRef([]);

  const code = drafts[language] ?? LANGUAGES[language].defaultCode;

  const setCode = useCallback(
    (next) => {
      setDrafts((current) => ({ ...current, [language]: next }));
    },
    [language]
  );

  const resetCode = useCallback(() => {
    setDrafts((current) => {
      const next = { ...current };
      delete next[language];
      return next;
    });
  }, [language]);

  const setLanguage = useCallback((next) => {
    if (!LANGUAGES[next]) return;
    setLanguageState(next);
    // The result belongs to the program that made it
    setStatus('idle');
    setOutput('');
    setNotice(null);
  }, []);

  const later = useCallback((callback, delay) => {
    const id = window.setTimeout(callback, delay);
    timers.current.push(id);
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  const run = useCallback(() => {
    setStatus('running');
    setOutput('');
    setNotice(null);
    later(() => {
      setStatus('idle');
      setNotice(NOT_CONNECTED);
    }, 700);
  }, [later]);

  const copy = useCallback(
    (text, flag) => {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(
        () => {
          flag(true);
          later(() => flag(false), 1500);
        },
        () => {}
      );
    },
    [later]
  );

  const copyCode = useCallback(() => copy(code, setCopiedCode), [copy, code]);
  const copyOutput = useCallback(() => copy(output, setCopiedOutput), [copy, output]);

  const downloadCode = useCallback(() => {
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
    link.href = url;
    link.download = fileNameOf(language);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [code, language]);

  return {
    language,
    setLanguage,
    code,
    setCode,
    resetCode,
    input,
    setInput,
    status,
    output,
    notice,
    run,
    copiedCode,
    copiedOutput,
    copyCode,
    copyOutput,
    downloadCode,
  };
}
