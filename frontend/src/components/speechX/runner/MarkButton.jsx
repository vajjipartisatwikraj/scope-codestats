import React from "react";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import "./runner.css";

/**
 * Toggle button for a question bookmark ("later" or "review"). While on, it takes the colours of
 * that question state (speechX.css `[data-state]`) and shows a filled icon and a check, so it is
 * not a colour change alone; `aria-pressed` carries the state for assistive technology.
 *
 * `state` is the question state the mark produces ("later" | "review"), `icon` a Phosphor component.
 */
const MarkButton = ({ active, state, disabled, icon: Icon, onClick, children }) => (
  <button
    type="button"
    className="sxr-mark"
    data-state={state}
    data-on={active ? "true" : "false"}
    disabled={disabled}
    onClick={onClick}
    aria-pressed={active}
  >
    <Icon size={18} weight={active ? "fill" : "regular"} aria-hidden="true" />
    <span>{children}</span>
    {active ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : null}
  </button>
);

export default MarkButton;
