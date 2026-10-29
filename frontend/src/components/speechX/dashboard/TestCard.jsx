import React from "react";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { FlagIcon } from "@phosphor-icons/react/dist/csr/Flag";
import { formatDateTime } from "../../ui";
import { ExamStatusBadge, examStatusOf } from "../shared";

/**
 * One test in the student's list: a flat container with the name, the time window and the status.
 * The whole container is a button; pressing it opens the details drawer (TestDetails).
 *
 * Props
 *   test, state ('upcoming' | 'live' | 'ended')
 *   onOpen
 */
const TestCard = ({ test, state, onOpen }) => (
  <button type="button" className="sxd-item" onClick={onOpen} aria-haspopup="dialog">
    <span className="sxd-item__main">
      <span className="sxd-item__title">{test.title}</span>
      <span className="sxd-item__times">
        <span className="sxd-item__time">
          <CalendarBlankIcon size={16} aria-hidden="true" />
          <span className="sx-sr">Starts </span>
          {formatDateTime(test.startTime)}
        </span>
        <span className="sxd-item__time">
          <FlagIcon size={16} aria-hidden="true" />
          <span className="sx-sr">Ends </span>
          {formatDateTime(test.endTime)}
        </span>
      </span>
    </span>
    <span className="sxd-item__end">
      <ExamStatusBadge status={examStatusOf(state, test.attempt)} />
      <CaretRightIcon size={16} weight="bold" aria-hidden="true" />
    </span>
  </button>
);

export default TestCard;
