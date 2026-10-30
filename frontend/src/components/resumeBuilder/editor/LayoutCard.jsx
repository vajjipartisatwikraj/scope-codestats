import React from "react";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { Button, Card, IconButton } from "../../ui";

// How many steps each control can move either way. Matches backend/resumeTemplates/engine.js.
const LIMIT = 4;
const STEPS = Array.from({ length: LIMIT * 2 + 1 }, (_, index) => index - LIMIT);

const CONTROLS = [
  {
    key: "font",
    label: "Text size",
    hint: "Every font size on the resume together.",
    less: "Make all text smaller",
    more: "Make all text larger",
  },
  {
    key: "gap",
    label: "Gaps",
    hint: "The space between sections, entries and lines.",
    less: "Reduce the gaps",
    more: "Increase the gaps",
  },
  {
    key: "pad",
    label: "Padding",
    hint: "The margin around the page and inside the header.",
    less: "Reduce the padding",
    more: "Increase the padding",
  },
];

/** A level in words, never as a number */
function describeLevel(level) {
  if (level === 0) return "As designed";
  if (level === -LIMIT) return "Smallest";
  if (level === LIMIT) return "Largest";
  return level < 0 ? "Reduced" : "Increased";
}

/**
 * The global layout of the whole resume: text size, gaps and padding. Each is a pair of buttons that
 * step it down or up, with a row of dots that shows where it stands (the middle dot is the template as
 * designed). There is no setting for one section or one line, and no numbers.
 *
 *   layout      { font, gap, pad }, whole steps from -4 to 4
 *   onChange(key, change)   change is -1 or 1
 *   onReset()
 */
export default function LayoutCard({ layout, onChange, onReset }) {
  const current = { font: 0, gap: 0, pad: 0, ...(layout || {}) };
  const changed = CONTROLS.some((control) => current[control.key] !== 0);

  return (
    <Card
      as="section"
      className="rbe-document"
      title="Layout"
      description="Make everything bigger or smaller, tighter or looser, for the whole resume."
      id="rbe-section-layout"
    >
      <div className="rbe-layout">
        {CONTROLS.map((control) => {
          const level = current[control.key];
          const words = describeLevel(level);
          return (
            <div key={control.key} className="rbe-layout__row" role="group" aria-label={control.label}>
              <div className="rbe-layout__text">
                <span className="rbe-layout__label">{control.label}</span>
                <span className="rbe-layout__hint">{control.hint}</span>
              </div>

              <div className="rbe-layout__controls">
                <IconButton label={control.less} size="sm" disabled={level <= -LIMIT} onClick={() => onChange(control.key, -1)}>
                  <MinusIcon size={18} weight="bold" aria-hidden="true" />
                </IconButton>

                <div className="rbe-pips" role="img" aria-label={`${control.label}: ${words}`}>
                  {STEPS.map((step) => (
                    <span
                      key={step}
                      className="rbe-pip"
                      data-here={step === level ? "true" : "false"}
                      data-home={step === 0 ? "true" : "false"}
                    />
                  ))}
                </div>

                <IconButton label={control.more} size="sm" disabled={level >= LIMIT} onClick={() => onChange(control.key, 1)}>
                  <PlusIcon size={18} weight="bold" aria-hidden="true" />
                </IconButton>
              </div>

              <span className="rbe-layout__state" aria-hidden="true">
                {words}
              </span>
            </div>
          );
        })}
      </div>

      <Button className="rbe-document__import" disabled={!changed} onClick={onReset}>
        Reset layout
      </Button>
    </Card>
  );
}
