import React from 'react';
import { KeyboardIcon } from '@phosphor-icons/react/dist/csr/Keyboard';

/**
 * The input pane: the text the program reads from standard input (stdin).
 *
 *   value, onChange(text)   the text
 */
export default function InputPane({ value, onChange }) {
  return (
    <section className="cp-pane" aria-labelledby="cp-input-title">
      <header className="cp-pane__header">
        <h2 className="cp-pane__title" id="cp-input-title">
          <KeyboardIcon size={20} weight="regular" aria-hidden="true" />
          <span>Input</span>
        </h2>
        <span className="cp-pane__note">stdin</span>
      </header>

      <div className="cp-console cp-console--field">
        <label className="cp-sr" htmlFor="cp-stdin">
          Input for the program (stdin)
        </label>
        <textarea
          id="cp-stdin"
          className="cp-stdin"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="Type the values your program reads, one per line"
        />
      </div>
    </section>
  );
}
