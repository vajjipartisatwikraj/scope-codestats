import React, { useId } from "react";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Button, Checkbox } from "../../ui";

/**
 * "I have read this" checkbox paired with the button that moves on. The button stays disabled
 * until the box is ticked and `disabled` is false, and a line beside it says why.
 *
 * Props: checked, onChange(checked), label, actionLabel, onAction, disabled (false), loading (false),
 * disabledReason (shown while `disabled`, for example "This test is not open yet").
 */
const AcknowledgeBar = ({ checked, onChange, label, actionLabel, onAction, disabled = false, loading = false, disabledReason }) => {
  const hintId = useId();
  const blocked = disabled || !checked || loading;
  const reason = disabled ? disabledReason : !checked ? "Tick the box to continue." : "";

  return (
    <div className="sxs-ack">
      <Checkbox label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <div className="sxs-ack__action">
        {blocked && reason ? (
          <p className="sxs-reason" id={hintId}>
            {reason}
          </p>
        ) : null}
        <Button
          variant="primary"
          size="sm"
          onClick={onAction}
          disabled={blocked}
          loading={loading}
          endIcon={<ArrowRightIcon size={18} weight="bold" aria-hidden="true" />}
          aria-describedby={blocked && reason ? hintId : undefined}
        >
          {actionLabel}
        </Button>
      </div>
    </div>
  );
};

export default AcknowledgeBar;
