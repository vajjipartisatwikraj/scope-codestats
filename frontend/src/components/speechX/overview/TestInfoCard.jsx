import React from "react";
import { MicrophoneIcon } from "@phosphor-icons/react/dist/csr/Microphone";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { formatDateTime } from "../../ui";
import { ExamStatusBadge, InfoLine, SpeechCard } from "../shared";
import ProgressPanel from "./ProgressPanel";

/**
 * The side column of the section list: a card with the test's name, description, window and the
 * student's exam status, and below it the progress and finish controls. With a `note` and no
 * progress (the student has no attempt) the note replaces the controls.
 *
 * Props: test, status (an exam status), note, and the ProgressPanel props.
 */
const TestInfoCard = ({ test, status, note, ...progress }) => (
  <div className="sxv-side">
    <SpeechCard
      compact
      icon={MicrophoneIcon}
      label="Communication test"
      title={test.title}
      description={test.description}
      badge={<ExamStatusBadge status={status} />}
    >
      <div className="sxv-info">
        <InfoLine icon={CalendarBlankIcon} label="Starts" value={formatDateTime(test.startTime)} />
        <InfoLine icon={FlagIcon} label="Ends" value={formatDateTime(test.endTime)} />
      </div>
      {note ? <p className="sxv-note">{note}</p> : null}
    </SpeechCard>
    {note ? null : <ProgressPanel {...progress} />}
  </div>
);

export default TestInfoCard;
