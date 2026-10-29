import React, { useEffect, useState } from "react";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { IconButton } from "../../ui";
import { clampFontSize, getFontSizeBounds } from "../../../utils/resume";

/**
 * The text size of one field on the paper: a stepper with a number you can also type.
 * The size is clamped to the template's bounds (clampFontSize); typing is committed on Enter or
 * when the box loses focus, so a half-typed "1" on the way to "13" does not jump to the minimum.
 *
 *   template    the template (for the bounds)
 *   label       the field's name, for the accessible group name
 *   value       the current size in px
 *   onChange(size)
 */
export default function FontSizeControl({ template, label, value, onChange }) {
  const { minFontSize, maxFontSize } = getFontSizeBounds(template);
  const [text, setText] = useState(String(value));
  const [typing, setTyping] = useState(false);

  // Follow the value when it changes elsewhere (a step, an import, a new template)
  useEffect(() => {
    if (!typing) setText(String(value));
  }, [value, typing]);

  const step = (delta) => onChange(clampFontSize(template, value + delta));

  const commit = () => {
    setTyping(false);
    const next = clampFontSize(template, text);
    setText(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="rbe-size" role="group" aria-label={`Text size of ${label}`}>
      <span className="rbe-size__caption" aria-hidden="true">
        Text size
      </span>
      <IconButton
        label="Decrease text size"
        size="sm"
        tone="plain"
        disabled={value <= minFontSize}
        onClick={() => step(-1)}
      >
        <MinusIcon size={16} weight="bold" aria-hidden="true" />
      </IconButton>
      <label className="rbe-size__box">
        <input
          type="text"
          inputMode="numeric"
          className="rbe-size__input"
          value={text}
          aria-label={`Size in pixels, ${minFontSize} to ${maxFontSize}`}
          onFocus={() => setTyping(true)}
          onChange={(event) => setText(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
            }
          }}
        />
        <span className="rbe-size__unit" aria-hidden="true">
          px
        </span>
      </label>
      <IconButton
        label="Increase text size"
        size="sm"
        tone="plain"
        disabled={value >= maxFontSize}
        onClick={() => step(1)}
      >
        <PlusIcon size={16} weight="bold" aria-hidden="true" />
      </IconButton>
    </div>
  );
}
