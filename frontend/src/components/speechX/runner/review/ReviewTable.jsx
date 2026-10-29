import React from "react";
import ReviewRow from "./ReviewRow";
import "./review.css";

/**
 * Every question of the section with its state, as a real table. The header stays put and only
 * the rows scroll when there are more than fit on screen (the scrolling region can be focused, so
 * the keyboard can scroll it). Below 600px each row becomes a two-line block.
 *
 * `items` is [{ id, state }] in question order.
 */
const ReviewTable = ({ items, disabled, onGoTo }) => (
  <div className="sxr-table" role="region" aria-label="Questions" tabIndex={0}>
    <table>
      <caption className="sx-sr">Each question and its state</caption>
      <thead>
        <tr>
          <th scope="col">Question</th>
          <th scope="col">Status</th>
          <th scope="col" className="sxr-table__action">
            Action
          </th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, i) => (
          <ReviewRow key={item.id} number={i + 1} state={item.state} disabled={disabled} onGoTo={() => onGoTo(i)} />
        ))}
      </tbody>
    </table>
  </div>
);

export default ReviewTable;
