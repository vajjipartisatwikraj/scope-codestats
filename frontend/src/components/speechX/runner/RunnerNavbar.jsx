import React from "react";
import { FocusHeader } from "../shared";
import TimerPill from "./TimerPill";
import "./runner.css";

/**
 * Fixed top bar of the question screen: the brand (plain text, not a link), where the student is in
 * the test with the section title, the time left, and the connection, theme and profile tools
 * that FocusHeader carries.
 *
 * The brand is not a link here, so the only ways out of a running section are the submit and
 * leave dialogs.
 */
const RunnerNavbar = ({ label, title, remainingMs }) => (
  <FocusHeader subtitle="VocalQ" locked compact>
    <div className="sxr-bar">
      <span className="sxr-bar__divider sx-hide-narrow" aria-hidden="true" />

      <div className="sxr-bar__title sx-hide-phone">
        <p className="sxr-bar__label">{label}</p>
        <p className="sxr-bar__name" title={title}>
          {title}
        </p>
      </div>

      <TimerPill remainingMs={remainingMs} />
    </div>
  </FocusHeader>
);

export default RunnerNavbar;
