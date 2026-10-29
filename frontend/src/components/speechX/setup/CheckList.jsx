import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";
import { CircleDashedIcon } from "@phosphor-icons/react/dist/csr/CircleDashed";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { WrenchIcon } from "@phosphor-icons/react/dist/csr/Wrench";
import { Badge } from "../../ui";
import { SegmentedProgress, LevelMeter } from "../../custom-components";
import { SEGMENT_STATE, SEGMENT_WORDS } from "./audioChecks";

/** Icon, badge tone and level of emphasis for each status. Every status has a word as well (the badge). */
const STATUS = {
  idle: { Icon: CircleDashedIcon, tone: "neutral", weight: "regular" },
  active: { Icon: SpinnerGapIcon, tone: "info", weight: "bold" },
  pass: { Icon: CheckCircleIcon, tone: "success", weight: "fill" },
  skip: { Icon: MinusCircleIcon, tone: "neutral", weight: "fill" },
  warn: { Icon: WarningCircleIcon, tone: "warning", weight: "fill" },
  fail: { Icon: XCircleIcon, tone: "danger", weight: "fill" },
};

/**
 * The checklist of the audio step (design/screens.md section 11): each check is a row with a status
 * icon, its name and one line, a badge with a word, and, when something is wrong, a "How to fix"
 * explanation. A SegmentedProgress on top shows how many checks have passed.
 *
 * Props
 *   checks   from buildChecks() in audioChecks.js
 *   level    0..1, the live input level (drives the meter of the "input level" row)
 *   peak     0..1, the loudest level of the last recording
 *   recording  whether the microphone is recording now (the meter follows `level`; afterwards it rests at `peak`)
 */
const CheckList = ({ checks, level, peak, recording }) => {
  const passed = checks.filter((check) => check.status === "pass" || check.status === "skip").length;

  return (
    <div className="sxs-checks">
      <div className="sxs-checks__summary">
        <p className="sxs-checks__count">
          <span className="sxs-checks__figure">{passed}</span> of {checks.length} checks passed
        </p>
        <SegmentedProgress
          label="Checks"
          animate={false}
          stateLabels={SEGMENT_WORDS}
          segments={checks.map((check) => ({ key: check.key, state: SEGMENT_STATE[check.status], label: check.title }))}
        />
      </div>

      <ul className="sxs-checks__list">
        {checks.map((check) => {
          const { Icon, tone, weight } = STATUS[check.status];
          const showMeter = check.key === "level" && (recording || check.status === "pass" || check.status === "warn");
          return (
            <li key={check.key} className="sxs-check" data-status={check.status}>
              <span className="sxs-check__icon" aria-hidden="true">
                <Icon size={22} weight={weight} data-spin={check.status === "active" ? "true" : undefined} />
              </span>

              <div className="sxs-check__main">
                <p className="sxs-check__title">{check.title}</p>
                <p className="sxs-check__detail">{check.detail}</p>
                {showMeter ? (
                  <LevelMeter
                    className="sxs-check__meter"
                    level={recording ? level : peak}
                    bars={14}
                    height={24}
                    label={recording ? "Input level" : "Loudest input level"}
                    valueText={recording ? undefined : check.status === "pass" ? "Good level" : "Very quiet"}
                  />
                ) : null}
              </div>

              <Badge tone={tone} className="sxs-check__badge">
                {check.label}
              </Badge>

              {check.fix ? (
                <div className="sxs-fix">
                  <p className="sxs-fix__title">
                    <WrenchIcon size={16} weight="bold" aria-hidden="true" />
                    {check.fix.title}
                  </p>
                  {check.fix.issues?.length > 0 ? (
                    <ul className="sxs-fix__issues">
                      {check.fix.issues.map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                    </ul>
                  ) : null}
                  <ol className="sxs-fix__steps">
                    {check.fix.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CheckList;
