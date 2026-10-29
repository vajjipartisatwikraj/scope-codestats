import React, { useEffect } from "react";
import { Button } from "../../ui";
import { AnimatedCheck } from "../../custom-components";
import { Reveal } from "../shared";

const AUTO_CLOSE_MS = 2600;

/** Shown in place of the form once feedback is sent. Leaves on its own after a moment. */
const ThankYou = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, AUTO_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="sxf-thanks" role="status">
      <AnimatedCheck size={56} label="" />
      <Reveal y={8} delay={0.3}>
        <h2 className="sxf-thanks__title">Thank you</h2>
        <p className="sxf-thanks__text">Your feedback has been sent. It helps us improve the test.</p>
        <Button variant="primary" onClick={onDone}>
          Back to the test
        </Button>
      </Reveal>
    </div>
  );
};

export default ThankYou;
