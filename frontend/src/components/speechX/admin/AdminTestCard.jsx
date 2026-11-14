import React from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CopyIcon } from "@phosphor-icons/react/dist/csr/Copy";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/csr/DownloadSimple";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/csr/EyeSlash";
import { ChartLineUpIcon } from "@phosphor-icons/react/dist/csr/ChartLineUp";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneTilt";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { UsersThreeIcon } from "@phosphor-icons/react/dist/csr/UsersThree";
import { AdminListCard, Badge, Button, formatDateTime, formatNumber, pluralize } from "../../ui";
import { ExamStatusBadge } from "../shared";

/**
 * One test in the admin's grid, as the kit's AdminListCard (the same card as user groups and
 * mentorships). It shows only what a teacher decides on:
 *
 *   badge    one word for where the test is: Draft, or Upcoming, Live or Ended once published
 *   figure   how many students have finished it, out of how many were given it
 *   facts    the schedule, and the size of the test
 *   foot     Edit for a draft; Results and Progress (the mentors' view of how their students are doing)
 *            for a published test
 *
 * Everything else is in the three-dot menu: Edit (once published), Students, Feedback (once
 * published), Publish or Unpublish, Duplicate, Download JSON and Delete.
 *
 * Props: test (a row of adminApi.list()), busy (an action is running: nothing can be pressed),
 * onEdit, onResults, onProgress, onFeedback, onStudents, onTogglePublish, onDuplicate, onExport,
 * onDelete (each called with the test).
 */
const AdminTestCard = ({ test, busy = false, onEdit, onResults, onProgress, onFeedback, onStudents, onTogglePublish, onDuplicate, onExport, onDelete }) => {
  const published = test.isPublished;
  const given = test.eligibleCount || 0;

  const menuItems = [
    // A draft has Edit in its foot, so the menu only repeats it once the test is published
    ...(published ? [{ key: "edit", label: "Edit", icon: <PencilSimpleIcon size={20} aria-hidden="true" />, onSelect: () => onEdit(test) }] : []),
    { key: "students", label: "Students", hint: "Who can take it", icon: <UsersThreeIcon size={20} aria-hidden="true" />, onSelect: () => onStudents(test) },
    ...(published ? [{ key: "feedback", label: "Feedback", hint: "What students said", icon: <ChatCircleTextIcon size={20} aria-hidden="true" />, onSelect: () => onFeedback(test) }] : []),
    {
      key: "publish",
      label: published ? "Unpublish" : "Publish to students",
      hint: published ? "Hide it from students" : "Show it to eligible students",
      icon: published ? <EyeSlashIcon size={20} aria-hidden="true" /> : <PaperPlaneTiltIcon size={20} aria-hidden="true" />,
      onSelect: () => onTogglePublish(test),
    },
    { key: "duplicate", label: "Duplicate", icon: <CopyIcon size={20} aria-hidden="true" />, onSelect: () => onDuplicate(test) },
    { key: "export", label: "Download JSON", icon: <DownloadSimpleIcon size={20} aria-hidden="true" />, onSelect: () => onExport(test) },
    { key: "delete", label: "Delete", tone: "danger", icon: <TrashIcon size={20} aria-hidden="true" />, onSelect: () => onDelete(test) },
  ];

  const facts = [
    {
      key: "when",
      icon: <CalendarBlankIcon size={16} aria-hidden="true" />,
      text: `${formatDateTime(test.startTime)} to ${formatDateTime(test.endTime)}`,
    },
    {
      key: "size",
      icon: <ListChecksIcon size={16} aria-hidden="true" />,
      text: `${pluralize(test.sectionCount || 0, "section")} \u00b7 ${pluralize(test.questionCount || 0, "question")}`,
    },
  ];

  const action = published ? (
    <>
      <Button size="sm" disabled={busy} aria-label={`Results of ${test.title}`} onClick={() => onResults(test)}>
        Results
      </Button>
      <Button size="sm" disabled={busy} endIcon={<ArrowRightIcon size={16} weight="bold" aria-hidden="true" />} startIcon={<ChartLineUpIcon size={16} aria-hidden="true" />} aria-label={`Progress of ${test.title}`} onClick={() => onProgress(test)}>
        Progress
      </Button>
    </>
  ) : (
    <Button size="sm" disabled={busy} startIcon={<PencilSimpleIcon size={16} aria-hidden="true" />} aria-label={`Edit ${test.title}`} onClick={() => onEdit(test)}>
      Edit
    </Button>
  );

  return (
    <AdminListCard
      badge={published ? <ExamStatusBadge status={test.state} /> : <Badge>Draft</Badge>}
      menuLabel={`Actions for ${test.title}`}
      menuItems={menuItems}
      menuDisabled={busy}
      title={test.title}
      description={test.description}
      figure={
        given > 0
          ? { value: formatNumber(test.completedCount || 0), unit: `of ${pluralize(given, "student")} finished` }
          : { value: "0", unit: "students added yet" }
      }
      facts={facts}
      action={action}
    />
  );
};

export default AdminTestCard;
