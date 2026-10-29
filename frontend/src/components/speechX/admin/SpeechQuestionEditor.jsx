import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { Button, IconButton, Notice, SelectField, TextField } from "../../ui";
import FillBlankFields from "./FillBlankFields";
import McqOptionsEditor from "./McqOptionsEditor";
import { ACCENTS, GENDERS, cancelSpeech, findVoice, isSpeechSupported, speak } from "../../../utils/browserSpeech";

const PLACEHOLDERS = {
  READING: "A sentence the student reads aloud, e.g. The weather is beautiful today.",
  REPEAT: "The sentence the student will hear, e.g. I would like a glass of water.",
  JUMBLED: "The correct sentence. Students see its words scrambled, e.g. The cat sat on the mat.",
  QUESTION_ANSWER: "The question, e.g. What do you usually do on weekends?",
  STORYTELLING: "The topic, e.g. Tell a story about a memorable holiday.",
  FILL_BLANKS: "The sentence, with the gap marked by underscores, e.g. He ______ (watch) a film right now.",
  MCQ: "The question, e.g. Where will the meeting be held?",
  EMAIL_WRITING: "The situation, e.g. Write an email to your HR requesting two days of leave next week.",
};

const LABELS = {
  READING: "Sentence to read aloud",
  REPEAT: "Sentence to be spoken to the student",
  JUMBLED: "Correct sentence",
  QUESTION_ANSWER: "Question",
  STORYTELLING: "Story topic",
  FILL_BLANKS: "Sentence with a blank",
  MCQ: "Question",
  EMAIL_WRITING: "Email task",
};

const LONG_TYPES = ["QUESTION_ANSWER", "STORYTELLING", "EMAIL_WRITING"];

/**
 * Editor for a single question. Which fields appear depends on the section type:
 *   REPEAT         sentence and accent. The student's browser speaks it; nothing is stored.
 *   JUMBLED        sentence and how the student answers (on screen or by speaking)
 *   FILL_BLANKS    sentence with a gap, the correct answer and other accepted answers
 *   MCQ            question and its 2 to 6 options, one or two of them correct
 *   others         just the text
 *
 * Props: index, type, question, locked, onChange(patch), onRemove, idPrefix (the id of the text
 * field is `${idPrefix}-text`, so the editor can focus it), error (a sentence for the text field).
 */
const SpeechQuestionEditor = ({ index, type, question, locked, onChange, onRemove, idPrefix, error }) => {
  const [playing, setPlaying] = useState(false);
  const [match, setMatch] = useState(null);

  // Stop any preview when the editor goes away.
  useEffect(() => () => cancelSpeech(), []);

  // Show which voice this device would use, so the teacher knows what to expect.
  useEffect(() => {
    if (type !== "REPEAT" || !isSpeechSupported()) return undefined;
    let cancelled = false;
    findVoice(question.accent, question.gender).then((result) => {
      if (!cancelled) setMatch(result);
    });
    return () => {
      cancelled = true;
    };
  }, [type, question.accent, question.gender]);

  const preview = async () => {
    const text = question.text.trim();
    if (!text) {
      toast.error("Enter the sentence first");
      return;
    }
    setPlaying(true);
    try {
      await speak(text, { accent: question.accent, gender: question.gender });
    } catch (failure) {
      toast.error(failure.message || "Could not play the sentence");
    } finally {
      setPlaying(false);
    }
  };

  return (
    <div className="sxa-question">
      <div className="sxa-question__head">
        <h4 className="sxa-question__title">Question {index + 1}</h4>
        {!locked ? (
          <IconButton label={`Remove question ${index + 1}`} size="sm" tone="danger" onClick={onRemove}>
            <TrashIcon size={18} aria-hidden="true" />
          </IconButton>
        ) : null}
      </div>

      <TextField
        id={`${idPrefix}-text`}
        label={LABELS[type]}
        placeholder={PLACEHOLDERS[type]}
        value={question.text}
        onChange={(event) => onChange({ text: event.target.value })}
        multiline
        rows={LONG_TYPES.includes(type) ? 3 : 2}
        disabled={locked}
        maxLength={1000}
        error={error}
      />

      {type === "REPEAT" ? (
        <div className="sxa-q-fields">
          <div className="sxa-q-row">
            <SelectField
              id={`${idPrefix}-voice`}
              label="Voice"
              value={question.gender}
              disabled={locked}
              onChange={(event) => onChange({ gender: event.target.value })}
              options={GENDERS.map((gender) => ({ value: gender.id, label: gender.label }))}
            />
            <SelectField
              id={`${idPrefix}-accent`}
              label="Accent"
              value={question.accent}
              disabled={locked}
              onChange={(event) => onChange({ accent: event.target.value })}
              options={ACCENTS.map((accent) => ({ value: accent.id, label: accent.label }))}
            />
            <Button
              className="sxa-q-row__action"
              startIcon={<SpeakerHighIcon size={18} aria-hidden="true" />}
              onClick={preview}
              disabled={playing || !question.text.trim() || !isSpeechSupported()}
            >
              {playing ? "Playing…" : "Preview"}
            </Button>
          </div>

          <Notice tone="info">
            The student&apos;s browser reads this sentence aloud and the text stays hidden. Voices come from the
            student&apos;s device, so the closest match is used.
            {match?.voice ? (
              <>
                {" "}
                On this device: <strong>{match.voice.name}</strong>
                {!match.genderMatched && ` (no ${question.gender} voice found, pitch is adjusted instead)`}.
              </>
            ) : null}
          </Notice>
        </div>
      ) : null}

      {type === "FILL_BLANKS" ? (
        <FillBlankFields question={question} locked={locked} onChange={onChange} idPrefix={idPrefix} />
      ) : null}

      {type === "MCQ" ? (
        <McqOptionsEditor
          options={question.options || []}
          locked={locked}
          idPrefix={idPrefix}
          onChange={(options) => onChange({ options })}
        />
      ) : null}

      {type === "EMAIL_WRITING" ? (
        <div className="sxa-q-fields">
          <Notice tone="info">
            Students type the email in a text box (up to 5000 characters). It is rated on relevance, structure, tone,
            grammar, vocabulary, coherence and completeness.
          </Notice>
        </div>
      ) : null}

      {type === "JUMBLED" ? (
        <fieldset className="sxa-radios">
          <legend className="sxa-radios__legend">How does the student answer?</legend>
          <div className="sxa-radios__group">
            {[
              { value: "ui", label: "Arrange words on screen" },
              { value: "audio", label: "Speak the sentence (audio)" },
            ].map((choice) => (
              <label key={choice.value} className="sxa-radio">
                <input
                  type="radio"
                  className="sxa-radio__input"
                  name={`${idPrefix}-mode`}
                  value={choice.value}
                  checked={question.jumbledMode === choice.value}
                  disabled={locked}
                  onChange={(event) => onChange({ jumbledMode: event.target.value })}
                />
                <span className="sxa-radio__dot" aria-hidden="true" />
                <span className="sxa-radio__label">{choice.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
};

export default SpeechQuestionEditor;
