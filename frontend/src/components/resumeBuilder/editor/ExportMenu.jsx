import React, { useEffect, useId, useRef, useState } from "react";
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { FileDocIcon } from "@phosphor-icons/react/dist/csr/FileDoc";
import { FilePdfIcon } from "@phosphor-icons/react/dist/csr/FilePdf";
import useDismiss from "../../Navbar/useDismiss";
import { EXPORT_FORMATS } from "../../../utils/resumeExport";
import { Button } from "../../ui";

const FORMAT_ICONS = { pdf: FilePdfIcon, word: FileDocIcon };

/**
 * The Export control: a button that opens a small menu of formats (PDF, Word), each with its hint.
 * It behaves like the language select of CodePad: a panel that stays mounted and fades in through
 * data-open, closes on an outside press or Escape (focus returns to the button), and the arrow
 * keys, Home and End move between the items.
 *
 *   exporting   an export is running: the button shows its spinner and cannot be pressed
 *   disabled    nothing to export yet
 *   onExport(formatId)
 */
export default function ExportMenu({ exporting, disabled, onExport }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const menuId = useId();

  useDismiss(rootRef, open, ({ escape }) => {
    setOpen(false);
    if (escape && triggerRef.current) triggerRef.current.focus();
  });

  // Opening puts focus on the first format
  useEffect(() => {
    if (!open || !listRef.current) return;
    const first = listRef.current.querySelector('[role="menuitem"]');
    if (first) first.focus();
  }, [open]);

  const choose = (formatId) => {
    setOpen(false);
    if (triggerRef.current) triggerRef.current.focus();
    onExport(formatId);
  };

  const onListKeyDown = (event) => {
    const items = Array.from(listRef.current.querySelectorAll('[role="menuitem"]'));
    const at = items.indexOf(document.activeElement);
    let next = null;
    if (event.key === "ArrowDown") next = items[(at + 1) % items.length];
    else if (event.key === "ArrowUp") next = items[(at - 1 + items.length) % items.length];
    else if (event.key === "Home") next = items[0];
    else if (event.key === "End") next = items[items.length - 1];
    else if (event.key === "Tab") setOpen(false);
    if (!next) return;
    event.preventDefault();
    next.focus();
  };

  const onTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className="rbe-export" ref={rootRef}>
      <Button
        ref={triggerRef}
        loading={exporting}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        startIcon={<DownloadSimpleIcon size={18} weight="regular" aria-hidden="true" />}
        endIcon={<CaretDownIcon className="rbe-export__caret" size={16} weight="regular" aria-hidden="true" />}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={onTriggerKeyDown}
      >
        {exporting ? "Exporting" : "Export"}
      </Button>

      <ul
        ref={listRef}
        id={menuId}
        className="rbe-menu"
        role="menu"
        aria-label="Export as"
        data-open={open ? "true" : "false"}
        onKeyDown={onListKeyDown}
      >
        {EXPORT_FORMATS.map((format) => {
          const Icon = FORMAT_ICONS[format.id] || DownloadSimpleIcon;
          return (
            <li key={format.id} role="presentation">
              <button
                type="button"
                role="menuitem"
                tabIndex={open ? 0 : -1}
                className="rbe-menu__item"
                onClick={() => choose(format.id)}
              >
                <Icon size={24} weight="regular" aria-hidden="true" />
                <span className="rbe-menu__text">
                  <span className="rbe-menu__label">{format.label}</span>
                  <span className="rbe-menu__hint">{format.hint}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
