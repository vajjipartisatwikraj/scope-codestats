import React from "react";
import { ProgressBar, StarRating } from "../../custom-components";

const AMBER = "var(--ds-series-amber)";

/** The average overall rating (a numeral and read-only stars), and how many students gave each star count. */
const RatingBreakdown = ({ average, total, distribution }) => (
  <div className="sxl-rating">
    <div className="sxl-rating__average">
      <p className="sxl-rating__figure">{average ?? "\u2013"}</p>
      <StarRating readOnly value={average || 0} size={18} label="Average rating" />
      <p className="sxl-rating__count">
        {total} response{total === 1 ? "" : "s"}
      </p>
    </div>

    <ul className="sxl-rating__bars" aria-label="Students per star rating">
      {[5, 4, 3, 2, 1].map((stars) => (
        <li key={stars} className="sxl-rating__row">
          <span className="sxl-rating__stars">
            <span className="ui-sr">{stars} star{stars === 1 ? "" : "s"}: </span>
            <span aria-hidden="true">{stars}</span>
          </span>
          <ProgressBar
            value={distribution[stars - 1]}
            max={Math.max(total, 1)}
            label={`${stars} star${stars === 1 ? "" : "s"}`}
            hideLabel
            valueLabel={null}
            size="sm"
            tone={AMBER}
          />
          <span className="sxl-rating__n">{distribution[stars - 1]}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default RatingBreakdown;
