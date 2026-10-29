import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { Badge, Button, Card, formatDateTime, formatNumber } from "../../ui";
import { formatDuration } from "../shared";

/**
 * The editor's summary: the test's headline numbers (sections, questions, total time), its
 * schedule, and the actions that need a saved test (students, download).
 *
 * Props: form, isNew, eligibleCount, onStudents, onExport,
 * title ("Test summary"), headingAs (default "h2").
 */
const EditorSummaryCard = ({ form, isNew, eligibleCount, onStudents, onExport, title = "Test summary" }) => {
  const questions = form.sections.reduce((sum, s) => sum + s.questions.length, 0);
  const minutes = form.sections.reduce((sum, s) => sum + (Number(s.timeLimitMinutes) || 0), 0);

  const status = isNew ? (
    <Badge tone="info" icon={<PencilSimpleIcon size={14} weight="bold" aria-hidden="true" />}>
      New test
    </Badge>
  ) : form.isPublished ? (
    <Badge tone="success" icon={<CheckCircleIcon size={14} weight="bold" aria-hidden="true" />}>
      Published
    </Badge>
  ) : (
    <Badge icon={<PencilSimpleIcon size={14} weight="bold" aria-hidden="true" />}>Draft</Badge>
  );

  return (
    <Card className="sxa-summary" title={title} description={form.title.trim() || "Untitled test"} actions={status}>
      <dl className="sxa-figures">
        <div className="sxa-figure">
          <dt>Sections</dt>
          <dd>{formatNumber(form.sections.length)}</dd>
        </div>
        <div className="sxa-figure">
          <dt>Questions</dt>
          <dd>{formatNumber(questions)}</dd>
        </div>
        <div className="sxa-figure">
          <dt>Total time</dt>
          <dd>{formatDuration(minutes)}</dd>
        </div>
      </dl>

      <hr className="sx-divider" />

      <dl className="sxa-facts">
        <div className="sxa-fact">
          <dt>Opens</dt>
          <dd>{form.startTime ? formatDateTime(form.startTime) : "Not set"}</dd>
        </div>
        <div className="sxa-fact">
          <dt>Closes</dt>
          <dd>{form.endTime ? formatDateTime(form.endTime) : "Not set"}</dd>
        </div>
      </dl>

      <hr className="sx-divider" />

      {isNew ? (
        <p className="sxa-summary__note">Save the test first. Then you can choose which students can take it.</p>
      ) : (
        <div className="sxa-summary__actions">
          <Button startIcon={<UsersThreeIcon size={18} aria-hidden="true" />} onClick={onStudents}>
            Students ({formatNumber(eligibleCount)})
          </Button>
          <Button startIcon={<DownloadSimpleIcon size={18} aria-hidden="true" />} onClick={onExport}>
            Download JSON
          </Button>
        </div>
      )}
    </Card>
  );
};

export default EditorSummaryCard;
