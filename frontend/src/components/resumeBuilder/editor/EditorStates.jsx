import React from "react";
import { Button, Card, Skeleton } from "../../ui";

/**
 * The editor while it loads: the real layout in skeletons (design/screens.md section 18), cards on
 * the left and a sheet on the right, so nothing jumps when the resume arrives.
 *
 *   wide   two panes (from 1200px); otherwise a single column
 */
export function EditorSkeleton({ wide }) {
  return (
    <div className="rbe-body" data-wide={wide ? "true" : "false"} role="status" aria-label="Loading the resume">
      <div className="rbe-edit">
        <div className="rbe-edit__stack" aria-hidden="true">
          <Card className="rbe-skel-card">
            <Skeleton width="30%" height={20} />
            <Skeleton height={44} radius="var(--ds-radius-md)" />
            <Skeleton height={44} radius="var(--ds-radius-md)" />
          </Card>
          {[0, 1, 2, 3].map((index) => (
            <Card key={index} className="rbe-skel-card">
              <Skeleton width={index % 2 ? "24%" : "36%"} height={20} />
            </Card>
          ))}
        </div>
      </div>
      {wide ? (
        <div className="rbe-preview" aria-hidden="true">
          <div className="rbe-preview__scroll">
            <Skeleton className="rbe-skel-sheet" height="auto" radius="0" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The editor when the resume cannot be shown: one centred card with what happened and what to do.
 *
 *   error      { missing, unavailable }; missing means the resume was deleted or is not theirs,
 *              unavailable that its template is not in the catalogue
 *   onRetry    try loading again
 *   onBack     go to the list
 */
export function EditorError({ error, onRetry, onBack }) {
  const missing = Boolean(error && error.missing);
  const unavailable = Boolean(error && error.unavailable);

  let title = "Could not load this resume";
  let text = "Check your connection and try again. Nothing was changed.";
  if (missing) {
    title = "This resume no longer exists";
    text = "It may have been deleted from another tab or another device. Your other resumes are safe.";
  } else if (unavailable) {
    title = "This template is unavailable";
    text = "The template this resume uses is not offered any more. Try again in a moment.";
  }

  return (
    <div className="rbe-center">
      <Card className="rbe-error">
        <h2 className="rbe-error__title">{title}</h2>
        <p className="rbe-error__text">{text}</p>
        <div className="rbe-error__actions">
          <Button variant="primary" onClick={onRetry}>
            Retry
          </Button>
          <Button onClick={onBack}>Back to my resumes</Button>
        </div>
      </Card>
    </div>
  );
}
