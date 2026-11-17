import React from "react";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { Badge, Button, Disclosure, IconButton, TextField, pluralize } from "../../ui";
import { SECTION_TYPE_META, TonalMark } from "../shared";
import SpeechQuestionEditor from "./SpeechQuestionEditor";
import { SECTION_TYPE_ICON } from "./typeIcons";

/**
 * One section of the editor, an accordion item. The header (number, name, facts, actions) is always
 * visible; opening it shows the settings and the questions.
 *
 * Props: index, total, section, open, onToggle, onChange(patch), onMove(direction),
 * onRemove, onQuestionChange(questionKey, patch), onAddQuestion, onRemoveQuestion(questionKey),
 * errors ({ limit: sentence, text: sentence, blank: Set of question keys that need text }).
 */
const SectionEditorCard = ({
  index,
  total,
  section,
  open,
  onToggle,
  onChange,
  onMove,
  onRemove,
  onQuestionChange,
  onAddQuestion,
  onRemoveQuestion,
  errors = {},
}) => {
  const meta = SECTION_TYPE_META[section.type];
  const count = section.questions.length;
  const prefix = `sxa-s-${section.key}`;
  const hasErrors = Boolean(errors.limit || errors.text);
  const name = section.title || meta.label;

  return (
    <Disclosure
      className="sxa-section"
      level={3}
      open={open}
      onToggle={onToggle}
      title={
        <span className="sxa-section__title">
          <TonalMark icon={SECTION_TYPE_ICON[section.type]} hue={meta.hue} size={32} />
          <span className="sxa-section__name">
            <span className="sxa-section__index" aria-hidden="true">
              {index + 1}.
            </span>
            <span className="ui-sr">Section {index + 1}: </span>
            {name}
          </span>
        </span>
      }
      description={`${meta.label} · ${section.timeLimitMinutes || "–"} min · ${pluralize(count, "question")}`}
      badge={
        hasErrors ? (
          <Badge tone="danger" icon={<WarningCircleIcon size={14} weight="fill" aria-hidden="true" />}>
            Needs attention
          </Badge>
        ) : null
      }
      actions={
        <>
          <IconButton label={`Move section ${index + 1} up`} size="sm" tone="plain" onClick={() => onMove(-1)} disabled={index === 0}>
            <ArrowUpIcon size={18} aria-hidden="true" />
          </IconButton>
          <IconButton label={`Move section ${index + 1} down`} size="sm" tone="plain" onClick={() => onMove(1)} disabled={index === total - 1}>
            <ArrowDownIcon size={18} aria-hidden="true" />
          </IconButton>
          <IconButton label={`Delete section ${index + 1}`} size="sm" tone="danger" onClick={onRemove}>
            <TrashIcon size={18} aria-hidden="true" />
          </IconButton>
        </>
      }
    >
      <div className="ui-form-grid">
        <TextField
          id={`${prefix}-title`}
          label="Section title"
          value={section.title}
          onChange={(event) => onChange({ title: event.target.value })}
          maxLength={120}
        />
        <TextField
          id={`${prefix}-limit`}
          type="number"
          inputMode="numeric"
          label="Time limit (minutes)"
          value={section.timeLimitMinutes}
          onChange={(event) => onChange({ timeLimitMinutes: event.target.value })}
          min={1}
          max={120}
          hint="Runs only while the student is in this section"
          error={errors.limit}
        />
        <TextField
          id={`${prefix}-instructions`}
          className="ui-form-grid__wide"
          label="Section instructions (optional)"
          value={section.instructions}
          onChange={(event) => onChange({ instructions: event.target.value })}
          placeholder={meta.hint}
          maxLength={1000}
        />
      </div>

      {count > 0 ? (
        <ol className="sxa-questions">
          {section.questions.map((question, qIndex) => (
            <li key={question.key} className="sxa-questions__item">
              <SpeechQuestionEditor
                index={qIndex}
                type={section.type}
                question={question}
                idPrefix={`sxa-q-${question.key}`}
                error={errors.blank && errors.blank.has(question.key) ? "This question needs text" : undefined}
                onChange={(patch) => onQuestionChange(question.key, patch)}
                onRemove={() => onRemoveQuestion(question.key)}
              />
            </li>
          ))}
        </ol>
      ) : null}

      <div className="sxa-section__add">
        <Button startIcon={<PlusIcon size={18} weight="bold" aria-hidden="true" />} onClick={onAddQuestion}>
          Add question
        </Button>
      </div>
    </Disclosure>
  );
};

export default SectionEditorCard;
