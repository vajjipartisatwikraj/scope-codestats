import React from "react";
import { PlayIcon } from "@phosphor-icons/react/dist/csr/Play";
import { SpeakerHighIcon } from "@phosphor-icons/react/dist/csr/SpeakerHigh";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";
import { Notice } from "../../ui";
import { SpeechCard } from "../shared";
import RecordButton from "./RecordButton";
import StepHead from "./StepHead";
import StepNav from "./StepNav";
import useSpeakerCheck, { SPEAKER_PHRASE } from "./useSpeakerCheck";

/**
 * Step 2 of the pre-test flow: the student plays a short sentence and confirms they can hear it.
 * A browser that cannot speak shows a notice and never blocks the exam.
 *
 * Props: onBack, onContinue
 */
const SpeakerCheckStep = ({ onBack, onContinue }) => {
  const { supported, playing, played, heard, error, canContinue, play, confirm } = useSpeakerCheck();

  const caption = playing ? "Playing\u2026" : "";

  return (
    <div className="sxs-narrow">
      <SpeechCard className="sxs-stepcard" aria-labelledby="sxs-speaker-title">
        <StepHead
          id="sxs-speaker-title"
          icon={SpeakerHighIcon}
          title="Test your speaker"
          description="Play the sound and raise your volume until you can hear it clearly."
        />

        {supported ? (
          <>
            <div className="sxs-center">
              <RecordButton
                icon={PlayIcon}
                activeIcon={SpeakerHighIcon}
                active={playing}
                activeTone="accent"
                disabled={playing}
                label="Play test sound"
                onClick={play}
              />
              <p className="sxs-caption" role="status">
                {caption}
              </p>
              <p className="sxs-quote">
                You should hear: &ldquo;{SPEAKER_PHRASE}&rdquo;
              </p>
            </div>

            {error ? (
              <Notice tone="danger" title="The sound did not play">
                {error}
              </Notice>
            ) : null}

            {played && !playing ? (
              <div className="sxs-question" role="group" aria-labelledby="sxs-heard-title">
                <p className="sxs-question__title" id="sxs-heard-title">
                  Could you hear it clearly?
                </p>
                <div className="sxs-question__answers">
                  <button type="button" className="sxs-answer" aria-pressed={heard === true} data-selected={heard === true ? "true" : "false"} onClick={() => confirm(true)}>
                    <CheckIcon size={18} weight="bold" aria-hidden="true" />
                    {heard === true ? "Heard it" : "Yes, I heard it"}
                  </button>
                  <button type="button" className="sxs-answer" aria-pressed={heard === false} data-selected={heard === false ? "true" : "false"} data-tone="negative" onClick={() => confirm(false)}>
                    <XIcon size={18} weight="bold" aria-hidden="true" />
                    No, I could not
                  </button>
                </div>
              </div>
            ) : null}

            {heard === false ? (
              <Notice tone="warning" title="Let's fix the sound">
                Turn up your device volume, make sure it is not muted and that the right speakers or headphones are selected, then play the sound again.
              </Notice>
            ) : null}
          </>
        ) : (
          <Notice tone="warning" title="This browser cannot play the test sound">
            Please make sure your volume is up, or switch to a recent version of Chrome or Edge. You can continue.
          </Notice>
        )}
      </SpeechCard>

      <StepNav onBack={onBack} nextLabel="Continue" onNext={onContinue} nextDisabled={!canContinue} />
    </div>
  );
};

export default SpeakerCheckStep;
