import React, { useEffect, useState } from "react";
import { ChatCircleTextIcon } from "@phosphor-icons/react/dist/csr/ChatCircleText";
import { Button, Card, EmptyState, Notice, Skeleton } from "../../ui";
import { Reveal } from "../shared";
import { adminApi, apiErrorMessage } from "../../../services/speechTestApi";
import RatingBreakdown from "./RatingBreakdown";
import CriteriaAverages from "./CriteriaAverages";
import CommentList from "./CommentList";

/** One titled column of the panel. */
const Column = ({ title, children }) => (
  <section className="sxl-col">
    <h3 className="sxl-col__title">{title}</h3>
    {children}
  </section>
);

/**
 * Staff view of the feedback students sent for one test: how many responded, the average rating
 * and its spread, the average for each rated part of the test, and the latest written suggestions.
 * Loads with adminApi.feedbackSummary; a failure shows a notice with Retry.
 */
const FeedbackSummaryPanel = ({ testId }) => {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [tries, setTries] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError("");
    adminApi
      .feedbackSummary(testId)
      .then((data) => !cancelled && setSummary(data.summary))
      .catch((err) => !cancelled && setError(apiErrorMessage(err, "Could not load feedback")));
    return () => {
      cancelled = true;
    };
  }, [testId, tries]);

  const description = summary
    ? `${summary.total} feedback${summary.total === 1 ? "" : "s"} received${summary.skipped > 0 ? ` \u00b7 ${summary.skipped} skipped` : ""}`
    : undefined;

  let content;
  if (error) {
    content = (
      <Notice
        tone="danger"
        title="Could not load feedback"
        action={
          <Button variant="ghost" size="sm" onClick={() => setTries((n) => n + 1)}>
            Retry
          </Button>
        }
      >
        {error}
      </Notice>
    );
  } else if (!summary) {
    content = (
      <div className="sxl-feedback__loading" role="status" aria-label="Loading feedback">
        <Skeleton height={140} radius="var(--ds-radius-lg)" />
        <Skeleton height={140} radius="var(--ds-radius-lg)" />
        <Skeleton height={140} radius="var(--ds-radius-lg)" />
      </div>
    );
  } else if (summary.total === 0) {
    content = (
      <EmptyState
        compact
        icon={<ChatCircleTextIcon size={28} aria-hidden="true" />}
        title="No feedback yet"
        text="Students are asked for it when they finish the test."
      />
    );
  } else {
    content = (
      <div className="sxl-feedback__grid">
        <Column title="Overall rating">
          <RatingBreakdown average={summary.averageRating} total={summary.total} distribution={summary.distribution} />
        </Column>
        <Column title="Rated parts of the test">
          <CriteriaAverages criteria={summary.criteria} />
        </Column>
        <Column title="Suggestions">
          <CommentList comments={summary.comments} />
        </Column>
      </div>
    );
  }

  return (
    <Reveal y={12} className="sxl-feedback">
      <Card title="Student feedback" description={description}>
        {content}
      </Card>
    </Reveal>
  );
};

export default FeedbackSummaryPanel;
