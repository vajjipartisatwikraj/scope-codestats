import React from "react";
import { Button, TextField } from "../../ui";
import { StarRating } from "../../custom-components";
import { Reveal } from "../shared";
import ScaleRow from "./ScaleRow";
import { COMMENT_LIMIT, CRITERIA, RATING_LABELS } from "./feedbackMeta";

/**
 * The right side of the feedback screen: stars, four 1-5 questions, a comment, and the two
 * buttons. While a request is under way the whole group is disabled (a disabled fieldset). The
 * Submit button says why it is disabled until an overall rating is chosen.
 */
const FeedbackForm = ({ form }) => {
  const nearLimit = form.comment.length > COMMENT_LIMIT - 150;

  return (
    <form
      className="sxf-form"
      onSubmit={(event) => {
        event.preventDefault();
        if (form.canSubmit) form.submit();
      }}
      noValidate
    >
      <fieldset className="sxf-fieldset" disabled={form.busy} aria-labelledby="sxf-form-title">
        <Reveal y={8} delay={0.1}>
          <h2 className="sxf-form__title" id="sxf-form-title">
            How was your test?
          </h2>
          <p className="sxf-form__lead">Your feedback helps us improve the experience.</p>
        </Reveal>

        <Reveal y={8} delay={0.2}>
          <StarRating value={form.rating} onChange={form.setRating} label="Overall rating" labels={RATING_LABELS.slice(1)} size={28} emptyWeight="fill" />
        </Reveal>

        <div className="sxf-scales">
          {CRITERIA.map((criterion, index) => (
            <Reveal key={criterion.key} y={8} delay={0.3 + index * 0.06}>
              <ScaleRow
                label={criterion.label}
                value={form.ratings[criterion.key] || 0}
                onChange={(value) => form.setCriterion(criterion.key, value)}
                disabled={form.busy}
              />
            </Reveal>
          ))}
        </div>

        <Reveal y={8} delay={0.6}>
          <TextField
            multiline
            rows={4}
            className="sxf-comment"
            aria-label="Suggestions (optional)"
            value={form.comment}
            onChange={(event) => form.setComment(event.target.value)}
            maxLength={COMMENT_LIMIT}
            placeholder="Please give your valuable suggestions to improve ourselves."
            hint={nearLimit ? `${form.comment.length} / ${COMMENT_LIMIT}` : undefined}
          />
        </Reveal>
      </fieldset>

      <Reveal y={8} delay={0.68} className="sxf-actions">
        {form.canSubmit ? null : <p className="sxf-why">Choose an overall rating to send your feedback.</p>}
        <div className="sxf-buttons">
          <Button onClick={form.skip} disabled={form.busy}>
            Skip
          </Button>
          <Button type="submit" variant="primary" loading={form.busy} disabled={!form.canSubmit}>
            Submit feedback
          </Button>
        </div>
      </Reveal>
    </form>
  );
};

export default FeedbackForm;
