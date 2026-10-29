import React from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { DotsThreeVerticalIcon } from "@phosphor-icons/react/dist/csr/DotsThreeVertical";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { StarIcon } from "@phosphor-icons/react/dist/csr/Star";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { TrophyIcon } from "@phosphor-icons/react/dist/csr/Trophy";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { Badge, Button, Card, IconButton, Menu, formatDateTime, formatNumber } from "../../ui";
import { ExamStatusBadge, SECTION_TYPE_META } from "../shared";

/**
 * One test in the admin's grid: its status, name and schedule, headline numbers, the types of its
 * sections, and the actions. Less frequent actions (publish, duplicate, download, delete) live in
 * the menu.
 *
 * Props: test (a row of adminApi.list()), busy (an action is running: nothing can be pressed),
 * onEdit, onResults, onStudents, onTogglePublish, onDuplicate, onExport, onDelete (each called with
 * the test).
 */
const AdminTestCard = ({
  test,
  busy = false,
  onEdit,
  onResults,
  onStudents,
  onTogglePublish,
  onDuplicate,
  onExport,
  onDelete,
}) => {
  const takingNow = test.attemptCount > test.completedCount ? test.attemptCount - test.completedCount : 0;
  const hasFeedback = test.feedbackCount > 0;
  const types = [...new Set((test.sections || []).map((s) => s.type))];

  const menuItems = [
    {
      key: "publish",
      label: test.isPublished ? "Unpublish" : "Publish to students",
      hint: test.isPublished ? "Hide it from students" : "Show it to eligible students",
      icon: test.isPublished ? <EyeSlashIcon size={20} aria-hidden="true" /> : <PaperPlaneTiltIcon size={20} aria-hidden="true" />,
      onSelect: () => onTogglePublish(test),
    },
    { key: "duplicate", label: "Duplicate", icon: <CopyIcon size={20} aria-hidden="true" />, onSelect: () => onDuplicate(test) },
    { key: "export", label: "Download JSON", icon: <DownloadSimpleIcon size={20} aria-hidden="true" />, onSelect: () => onExport(test) },
    { key: "delete", label: "Delete", tone: "danger", icon: <TrashIcon size={20} aria-hidden="true" />, onSelect: () => onDelete(test) },
  ];

  return (
    <Card as="article" className="sxa-test">
      <header className="sxa-test__head">
        <div className="sxa-test__badges">
          {test.isPublished ? (
            <>
              <Badge icon={<CheckCircleIcon size={14} weight="bold" aria-hidden="true" />}>Published</Badge>
              <ExamStatusBadge status={test.state} />
            </>
          ) : (
            <Badge icon={<PencilSimpleIcon size={14} weight="bold" aria-hidden="true" />}>Draft</Badge>
          )}
        </div>
        <h2 className="sxa-test__title">{test.title}</h2>
        {test.description ? <p className="sxa-test__desc">{test.description}</p> : null}
        <p className="sxa-test__when">
          <CalendarBlankIcon size={16} aria-hidden="true" />
          <span>
            {formatDateTime(test.startTime)} to {formatDateTime(test.endTime)}
          </span>
        </p>
      </header>

      <dl className="sxa-figures" data-cols="4">
        <div className="sxa-figure">
          <dt>Sections</dt>
          <dd>{formatNumber(test.sectionCount)}</dd>
        </div>
        <div className="sxa-figure">
          <dt>Questions</dt>
          <dd>{formatNumber(test.questionCount)}</dd>
        </div>
        <div className="sxa-figure">
          <dt>Students</dt>
          <dd>{formatNumber(test.eligibleCount)}</dd>
        </div>
        <div className="sxa-figure">
          <dt>Completed</dt>
          <dd>{formatNumber(test.completedCount)}</dd>
        </div>
      </dl>

      {takingNow > 0 || hasFeedback ? (
        <p className="sxa-test__live">
          {takingNow > 0 ? <span>{formatNumber(takingNow)} taking it now</span> : null}
          {hasFeedback ? (
            <span className="sxa-test__feedback">
              <StarIcon size={14} weight="fill" aria-hidden="true" />
              {formatNumber(test.feedbackCount)} feedback
              {test.feedbackAverage != null ? ` (average ${test.feedbackAverage})` : ""}
            </span>
          ) : null}
        </p>
      ) : null}

      {types.length > 0 ? (
        <ul className="sxa-test__types" aria-label="Section types">
          {types.map((type) => (
            <li key={type} className="sxa-type-chip">
              <span className="sxa-type-chip__dot" style={{ backgroundColor: SECTION_TYPE_META[type].color }} aria-hidden="true" />
              {SECTION_TYPE_META[type].label}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="sxa-test__actions">
        <Button size="sm" disabled={busy} startIcon={<PencilSimpleIcon size={16} aria-hidden="true" />} onClick={() => onEdit(test)}>
          Edit
        </Button>
        <Button size="sm" disabled={busy} startIcon={<UsersThreeIcon size={16} aria-hidden="true" />} onClick={() => onStudents(test)}>
          Students
        </Button>
        <IconButton label={`Results of ${test.title}`} size="sm" disabled={busy} onClick={() => onResults(test)}>
          <TrophyIcon size={18} aria-hidden="true" />
        </IconButton>
        <div className="sxa-test__more">
          <Menu
            label={`More actions for ${test.title}`}
            align="end"
            fixed
            items={menuItems}
            trigger={({ props }) => (
              <IconButton label={`More actions for ${test.title}`} size="sm" tone="plain" disabled={busy} {...props}>
                <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
              </IconButton>
            )}
          />
        </div>
      </footer>
    </Card>
  );
};

export default AdminTestCard;
