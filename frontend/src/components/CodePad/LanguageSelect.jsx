import React, { useEffect, useId, useRef, useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import useDismiss from '../Navbar/useDismiss';
import { LANGUAGES } from './codePadLanguages';

/**
 * The round mark of a language: its short name on a tone of the data series, like an avatar
 * without a photo. No brand logos (their colours are not tokens).
 */
export function LanguageMark({ language, size = 28 }) {
  const info = LANGUAGES[language];
  return (
    <span
      className="cp-mark"
      data-long={info.mark.length > 2 ? 'true' : 'false'}
      style={{ '--cp-size': `${size}px`, '--cp-tone': `var(--ds-series-${info.tone})` }}
      aria-hidden="true"
    >
      {info.mark}
    </span>
  );
}

/**
 * The language select (DESIGN.md, Select and filter): a pill showing the current language and a
 * chevron, opening a small menu. A listbox that works with the pointer and the keyboard:
 * the arrow keys, Home and End move, Enter or Space chooses, Escape closes and returns focus to
 * the pill, and a press outside closes it.
 *
 *   value       the key of the chosen language
 *   onChange    called with the key of another language
 */
export default function LanguageSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const listId = useId();

  useDismiss(rootRef, open, ({ escape }) => {
    setOpen(false);
    if (escape && triggerRef.current) triggerRef.current.focus();
  });

  // Opening puts focus on the chosen language
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector('[aria-selected="true"]');
    if (selected) selected.focus();
  }, [open]);

  const choose = (key) => {
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
    if (key !== value) onChange(key);
  };

  const onListKeyDown = (event) => {
    const options = Array.from(listRef.current.querySelectorAll('[role="option"]'));
    const at = options.indexOf(document.activeElement);
    let next = null;
    if (event.key === 'ArrowDown') next = options[(at + 1) % options.length];
    else if (event.key === 'ArrowUp') next = options[(at - 1 + options.length) % options.length];
    else if (event.key === 'Home') next = options[0];
    else if (event.key === 'End') next = options[options.length - 1];
    else if (event.key === 'Tab') setOpen(false);
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="cp-select" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="cp-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={`Language: ${LANGUAGES[value].name}. Change language`}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
      >
        <LanguageMark language={value} size={24} />
        <span className="cp-select__name">{LANGUAGES[value].name}</span>
        <CaretDownIcon size={16} weight="regular" aria-hidden="true" className="cp-select__caret" />
      </button>

      <ul
        ref={listRef}
        id={listId}
        className="cp-menu"
        role="listbox"
        aria-label="Language"
        data-open={open ? 'true' : 'false'}
        onKeyDown={onListKeyDown}
      >
        {Object.entries(LANGUAGES).map(([key, info]) => {
          const selected = key === value;
          return (
            <li key={key} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={open ? 0 : -1}
                className="cp-menu__option"
                onClick={() => choose(key)}
              >
                <LanguageMark language={key} size={28} />
                <span className="cp-menu__name">{info.name}</span>
                <span className="cp-menu__ext">.{info.extension}</span>
                {selected ? <CheckIcon size={18} weight="bold" aria-hidden="true" className="cp-menu__check" /> : <span className="cp-menu__check" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
