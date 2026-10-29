import React, { useLayoutEffect, useRef } from "react";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { TextBIcon } from "@phosphor-icons/react/dist/csr/TextB";
import { toast } from "react-toastify";
import { IconButton, formatNumber } from "../../ui";

const BOLD = "**";
const CODE = "`";

/**
 * Wraps the selection in a mark, or takes the mark off when the selection already has it (inside
 * the selection or just around it). With nothing selected it inserts a pair and puts the caret
 * between them.
 */
export function toggleMark(text, start, end, mark) {
  const size = mark.length;
  const selected = text.slice(start, end);

  if (start >= size && text.slice(start - size, start) === mark && text.slice(end, end + size) === mark) {
    return {
      text: text.slice(0, start - size) + selected + text.slice(end + size),
      start: start - size,
      end: end - size,
    };
  }

  if (selected.length >= size * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
    const inner = selected.slice(size, selected.length - size);
    return { text: text.slice(0, start) + inner + text.slice(end), start, end: start + inner.length };
  }

  return {
    text: text.slice(0, start) + mark + selected + mark + text.slice(end),
    start: start + size,
    end: end + size,
  };
}

/**
 * A text area for the fields the paper formats: **bold** and `code` (the marks the preview, the
 * PDF and the Word export all read). A small toolbar applies them to the selection, and Ctrl+B or
 * Cmd+B makes the selection bold.
 *
 *   id, ariaLabel / labelledBy   the accessible name of the text area
 *   describedBy                  the id of the hint under the field
 *   value, onChange(text)        controlled text
 *   maxLength, placeholder, rows
 */
export default function RichTextArea({
  id,
  ariaLabel,
  labelledBy,
  describedBy,
  value,
  onChange,
  maxLength,
  placeholder,
  rows = 3,
}) {
  const ref = useRef(null);
  const selection = useRef(null);

  // After a mark is applied the text has re-rendered; put the selection back where it belongs
  useLayoutEffect(() => {
    if (!selection.current || !ref.current) return;
    const [start, end] = selection.current;
    selection.current = null;
    ref.current.focus();
    ref.current.setSelectionRange(start, end);
  });

  const apply = (mark) => {
    const area = ref.current;
    if (!area) return;
    const result = toggleMark(value, area.selectionStart, area.selectionEnd, mark);
    if (maxLength && result.text.length > maxLength) {
      toast.warn("This text is at its length limit, so the mark could not be added");
      return;
    }
    selection.current = [result.start, result.end];
    onChange(result.text);
  };

  const onKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "b") {
      event.preventDefault();
      apply(BOLD);
    }
  };

  // Pressing a toolbar button must not take the selection away from the text
  const keepSelection = (event) => event.preventDefault();

  return (
    <div className="rbe-rich">
      <textarea
        ref={ref}
        id={id}
        className="rbe-rich__input"
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        aria-label={labelledBy ? undefined : ariaLabel}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="rbe-rich__bar">
        <div className="rbe-rich__tools" role="group" aria-label="Text formatting">
          <IconButton
            label="Bold"
            size="sm"
            tone="plain"
            aria-keyshortcuts="Control+B Meta+B"
            onMouseDown={keepSelection}
            onClick={() => apply(BOLD)}
          >
            <TextBIcon size={18} weight="bold" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Code"
            size="sm"
            tone="plain"
            onMouseDown={keepSelection}
            onClick={() => apply(CODE)}
          >
            <CodeIcon size={18} weight="regular" aria-hidden="true" />
          </IconButton>
        </div>
        {maxLength ? (
          <span className="rbe-rich__count">
            {formatNumber(value.length)} of {formatNumber(maxLength)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
