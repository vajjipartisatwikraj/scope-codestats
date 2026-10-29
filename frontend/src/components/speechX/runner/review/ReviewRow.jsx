import React from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Button } from "../../../ui";
import StatusBadge from "./StatusBadge";
import "./review.css";

/** One question: its number, its state, and a button that opens it. */
const ReviewRow = ({ number, state, disabled, onGoTo }) => (
  <tr className="sxr-row">
    <th scope="row" className="sxr-row__number">
      Question <span className="sxr-num">{number}</span>
    </th>
    <td className="sxr-row__status">
      <StatusBadge state={state} />
    </td>
    <td className="sxr-row__action">
      <Button
        size="sm"
        disabled={disabled}
        onClick={onGoTo}
        aria-label={`Go to question ${number}`}
        endIcon={<ArrowRightIcon size={16} weight="regular" aria-hidden="true" />}
      >
        Go to question
      </Button>
    </td>
  </tr>
);

export default ReviewRow;
