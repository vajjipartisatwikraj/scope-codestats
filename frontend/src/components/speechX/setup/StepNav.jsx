import React, { useId } from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { ArrowRightIcon } from "@phosphor-icons/react/dist/csr/ArrowRight";
import { Button } from "../../ui";

/**
 * The navigation row under a check step: Back on the left, the primary action on the right, and a
 * line that says why the action is locked while it is. (Replaces the old SetupButton pair; the
 * reason is always visible, not only from 600px.)
 *
 * Props
 *   onBack, backDisabled (false)
 *   nextLabel, onNext, nextDisabled (false), nextLoading (false), nextIcon (a node; an arrow by default)
 *   reason    the sentence shown while the action is locked; leave empty when it is not
 */
const StepNav = ({ onBack, backDisabled = false, nextLabel, onNext, nextDisabled = false, nextLoading = false, nextIcon, reason }) => {
  const reasonId = useId();
  const locked = nextDisabled || nextLoading;
  const shownReason = nextDisabled && reason ? reason : "";

  return (
    <div className="sxs-nav">
      <Button variant="secondary" onClick={onBack} disabled={backDisabled} startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />}>
        Back
      </Button>
      <div className="sxs-nav__next">
        {shownReason ? (
          <p className="sxs-reason" id={reasonId}>
            {shownReason}
          </p>
        ) : null}
        <Button
          variant="primary"
          onClick={onNext}
          disabled={locked}
          loading={nextLoading}
          endIcon={nextIcon === undefined ? <ArrowRightIcon size={18} weight="bold" aria-hidden="true" /> : nextIcon}
          aria-describedby={shownReason ? reasonId : undefined}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
};

export default StepNav;
