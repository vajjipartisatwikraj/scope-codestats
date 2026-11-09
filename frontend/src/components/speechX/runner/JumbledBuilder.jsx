import React, { useEffect, useRef, useState } from "react";
import { EraserIcon } from "@phosphor-icons/react/dist/csr/Eraser";
import { Button } from "../../ui";
import WordChip from "./WordChip";
import PromptText from "./PromptText";
import SaveStatusLine from "./answers/SaveStatusLine";
import "./answers/answers.css";

/**
 * Scrambled-word exercise. In `interactive` mode the student presses words into an answer line
 * (saved as text); otherwise the words are only shown and the student says the sentence aloud into
 * the recorder.
 *
 * Keyboard and screen readers: every word is a real button (Tab, Enter or Space). After a word is
 * placed or taken back, focus moves to the next sensible word instead of being lost, and a polite
 * status line says what changed and reads the sentence so far.
 */
const JumbledBuilder = ({ words, arrangement, interactive, disabled, status, onArrange }) => {
  const placed = new Set(arrangement);
  const bankRefs = useRef({});
  const answerRefs = useRef({});
  const pendingFocus = useRef(null);
  const clearRef = useRef(null);
  const [announcement, setAnnouncement] = useState("");

  const sentence = (order) => order.map((i) => words[i]).join(" ");
  const say = (verb, word, order) =>
    setAnnouncement(`${verb} ${word}. ${order.length > 0 ? `Your sentence: ${sentence(order)}.` : "Your sentence is empty."}`);

  // Put focus where the student will want it after the arrangement changed.
  useEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (!target) return;
    const node = target.zone === "bank" ? bankRefs.current[target.index] : answerRefs.current[target.position];
    if (node && !node.disabled) node.focus();
    else if (target.zone === "bank") clearRef.current?.focus();
  }, [arrangement]);

  const place = (wordIndex) => {
    const next = [...arrangement, wordIndex];
    // The next word still in the bank, after this one first, then from the start.
    const after = words.findIndex((_, j) => j > wordIndex && !placed.has(j));
    const before = words.findIndex((_, j) => j < wordIndex && !placed.has(j));
    const nextBank = after >= 0 ? after : before;
    pendingFocus.current = nextBank >= 0 ? { zone: "bank", index: nextBank } : { zone: "answer", position: next.length - 1 };
    say("Added", words[wordIndex], next);
    onArrange(next);
  };

  const remove = (position) => {
    const wordIndex = arrangement[position];
    const next = arrangement.filter((_, p) => p !== position);
    pendingFocus.current =
      next.length > 0 ? { zone: "answer", position: Math.min(position, next.length - 1) } : { zone: "bank", index: wordIndex };
    say("Removed", words[wordIndex], next);
    onArrange(next);
  };

  const clear = () => {
    pendingFocus.current = { zone: "bank", index: 0 };
    setAnnouncement("Your sentence is empty.");
    onArrange([]);
  };

  return (
    <div>
      <PromptText className="sxr-prompt--small">
        {interactive
          ? "Press the words in the correct order to build the sentence."
          : "Put these words in the correct order, then say the full sentence aloud."}
      </PromptText>

      <ul className="sxr-chips" aria-label="Scrambled words">
        {words.map((word, i) => (
          <li key={`${word}-${i}`}>
            <WordChip
              ref={(node) => {
                bankRefs.current[i] = node;
              }}
              word={word}
              plain={!interactive}
              disabled={placed.has(i) || disabled}
              onClick={() => place(i)}
            />
          </li>
        ))}
      </ul>

      {interactive && (
        <div className="sxr-answerline-wrap">
          <div className="sxr-answerline" role="group" aria-label="Your sentence" data-filled={arrangement.length > 0 ? "true" : "false"}>
            {arrangement.length === 0 ? (
              <p className="sxr-answerline__empty">Your sentence will appear here</p>
            ) : (
              arrangement.map((wordIndex, position) => (
                <WordChip
                  key={`${wordIndex}-${position}`}
                  ref={(node) => {
                    answerRefs.current[position] = node;
                  }}
                  word={words[wordIndex]}
                  filled
                  disabled={disabled}
                  title="Press to remove"
                  label={`${words[wordIndex]}, word ${position + 1}. Press to remove.`}
                  onClick={() => remove(position)}
                />
              ))
            )}
          </div>

          <div className="sxr-answerline__foot">
            <Button
              ref={clearRef}
              variant="ghost"
              size="sm"
              startIcon={<EraserIcon size={18} weight="regular" aria-hidden="true" />}
              onClick={clear}
              disabled={arrangement.length === 0 || disabled}
            >
              Clear
            </Button>
            <SaveStatusLine status={status} visible={arrangement.length > 0} />
          </div>
        </div>
      )}

      <p className="sx-sr" role="status" aria-live="polite">
        {announcement}
      </p>
    </div>
  );
};

export default JumbledBuilder;
