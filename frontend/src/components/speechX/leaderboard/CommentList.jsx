import React from "react";
import { formatDateTime } from "../../ui";
import { StarRating } from "../../custom-components";
import { Reveal } from "../shared";

/** The latest written suggestions, newest first, scrolling inside a fixed height. */
const CommentList = ({ comments }) => {
  if (comments.length === 0) {
    return <p className="sxl-muted">No written suggestions yet.</p>;
  }

  return (
    <ul className="sxl-comments" aria-label="Written suggestions" tabIndex={0}>
      {comments.map((item, index) => (
        <Reveal as="li" key={item.id} y={6} duration={0.28} delay={Math.min(index, 8) * 0.04} className="sxl-comment">
          <div className="sxl-comment__head">
            <span className="sxl-comment__name">{item.name}</span>
            {item.rollNumber ? <span className="sxl-comment__roll">{item.rollNumber}</span> : null}
            <span className="sxl-comment__rating">
              <StarRating readOnly value={item.rating} size={14} label={`Rating by ${item.name}`} />
            </span>
          </div>
          <p className="sxl-comment__text">{item.comment}</p>
          <p className="sxl-comment__date">{formatDateTime(item.createdAt)}</p>
        </Reveal>
      ))}
    </ul>
  );
};

export default CommentList;
