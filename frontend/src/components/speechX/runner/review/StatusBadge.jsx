import React from "react";
import { STATE_ICON, STATE_LABEL } from "../../shared";
import "./review.css";

/** A small pill naming a question's state: its tint, its icon and its word. */
const StatusBadge = ({ state }) => {
  const key = STATE_ICON[state] ? state : "open";
  const Icon = STATE_ICON[key];

  return (
    <span className="sxr-status sx-state" data-state={key}>
      <Icon size={14} weight="bold" aria-hidden="true" />
      {STATE_LABEL[key]}
    </span>
  );
};

export default StatusBadge;
