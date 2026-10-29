import React, { useRef, useState } from "react";

const STEPS = [1, 2, 3, 4, 5];

/**
 * One question with a 1 to 5 scale: a label, the chosen number in words ("4 of 5"), and five
 * segments. Choosing a number fills every segment up to it (left to right, in a quick ripple);
 * the chosen segment also carries a ring and the number, so the answer is not colour alone. The
 * chosen number can be pressed again to clear it. A radio group: Tab enters it, the arrow keys
 * move the choice, Home and End jump to the ends. Every segment is a 44px target.
 *
 * Props: label, value (0 or null for none), onChange(value | null), disabled
 */
const ScaleRow = ({ label, value, onChange, disabled = false }) => {
  const [hover, setHover] = useState(0);
  const groupRef = useRef(null);
  const chosen = value || 0;
  const shown = hover || chosen;
  const stop = chosen || 1;

  const focusStep = (step) => {
    const node = groupRef.current?.querySelector(`[data-step="${step}"]`);
    if (node) node.focus();
  };

  const onKeyDown = (event, step) => {
    let next = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = Math.min(5, step + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = Math.max(1, step - 1);
    else if (event.key === "Home") next = 1;
    else if (event.key === "End") next = 5;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    focusStep(next);
  };

  return (
    <div className="sxf-scale" ref={groupRef} role="radiogroup" aria-label={label} onMouseLeave={() => setHover(0)}>
      <p className="sxf-scale__label" aria-hidden="true">
        {label}
        <span className="sxf-scale__value">{chosen ? `${chosen} of 5` : "Not rated"}</span>
      </p>

      <div className="sxf-scale__steps">
        {STEPS.map((step) => (
          <button
            key={step}
            type="button"
            role="radio"
            className="sxf-step"
            aria-checked={chosen === step}
            aria-label={`${label}: ${step} out of 5`}
            data-step={step}
            data-on={step <= shown ? "true" : "false"}
            data-chosen={chosen === step ? "true" : "false"}
            style={{ "--sxf-i": step }}
            tabIndex={step === stop ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(chosen === step ? null : step)}
            onMouseEnter={() => setHover(step)}
            onFocus={() => setHover(step)}
            onBlur={() => setHover(0)}
            onKeyDown={(event) => onKeyDown(event, step)}
          >
            {step}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ScaleRow;
