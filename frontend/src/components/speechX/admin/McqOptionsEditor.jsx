import React from "react";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { Button, Checkbox, IconButton, TextField } from "../../ui";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;
const MAX_CORRECT = 2;

let optionSeed = 0;
const newOption = () => {
  optionSeed += 1;
  return { key: `o${Date.now()}-${optionSeed}`, text: "", isCorrect: false };
};

/**
 * Options of a multiple-choice question: 2 to 6 of them, one or two marked
 * correct. `options` is [{ key, _id?, text, isCorrect }].
 *
 * Props: options, locked, onChange(options), idPrefix.
 */
const McqOptionsEditor = ({ options, locked, onChange, idPrefix }) => {
  const correctCount = options.filter((o) => o.isCorrect).length;

  const update = (key, patch) => onChange(options.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const remove = (key) => onChange(options.filter((o) => o.key !== key));

  return (
    <fieldset className="sxa-options">
      <legend className="sxa-options__legend">Options (tick the correct ones: one or two)</legend>

      <ul className="sxa-options__list">
        {options.map((option, i) => {
          // A third correct answer cannot be ticked.
          const blocked = !option.isCorrect && correctCount >= MAX_CORRECT;
          return (
            <li key={option.key} className="sxa-options__row">
              <Checkbox
                label="Correct"
                checked={option.isCorrect}
                disabled={locked || blocked}
                onChange={(event) => update(option.key, { isCorrect: event.target.checked })}
                aria-label={`Option ${i + 1} is correct`}
              />
              <TextField
                id={`${idPrefix}-option-${i}`}
                className="sxa-options__text"
                aria-label={`Option ${i + 1} text`}
                value={option.text}
                disabled={locked}
                placeholder={`Option ${i + 1}`}
                onChange={(event) => update(option.key, { text: event.target.value })}
                maxLength={300}
              />
              {!locked ? (
                <IconButton
                  label={`Remove option ${i + 1}`}
                  size="sm"
                  tone="plain"
                  disabled={options.length <= MIN_OPTIONS}
                  onClick={() => remove(option.key)}
                >
                  <XIcon size={18} weight="bold" aria-hidden="true" />
                </IconButton>
              ) : null}
            </li>
          );
        })}
      </ul>

      {!locked && options.length < MAX_OPTIONS ? (
        <Button
          size="sm"
          variant="ghost"
          className="sxa-options__add"
          startIcon={<PlusIcon size={16} weight="bold" aria-hidden="true" />}
          onClick={() => onChange([...options, newOption()])}
        >
          Add option
        </Button>
      ) : null}

      <p className="sxa-options__note" data-warn={correctCount === 0 ? "true" : "false"} aria-live="polite">
        {correctCount === 0 ? <WarningCircleIcon size={16} weight="fill" aria-hidden="true" /> : null}
        <span>
          {correctCount === 0
            ? "Mark at least one correct option."
            : correctCount === 2
            ? `Two correct options: students choose two. Choosing only one earns half marks. At most ${MAX_CORRECT} options can be correct.`
            : "One correct option: students choose one."}
          {!locked ? ` A question has ${MIN_OPTIONS} to ${MAX_OPTIONS} options.` : ""}
        </span>
      </p>
    </fieldset>
  );
};

export default McqOptionsEditor;
