import React, { useEffect, useRef, useState } from "react";
import { TimerIcon } from "@phosphor-icons/react/dist/csr/Timer";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/csr/WarningCircle";
import "./runner.css";

const pad = (n) => String(n).padStart(2, "0");

/** Minutes left at which the remaining time is announced to assistive technology. */
const MILESTONES = [10, 5, 1];

/** 526000 ms -> "08:46", 3725000 ms -> "1:02:05" */
const clock = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
};

/**
 * Time left in the section: a spotlight pill with tabular numerals. For the last minute it turns
 * to the danger tint and the icon changes to a warning, so the change is not colour alone.
 *
 * The clock itself is not announced every second (the timer role is not a live region). A
 * separate polite status line speaks at 10, 5 and 1 minutes remaining and when time is up. A
 * milestone the section has already passed when it opens (a section that is only 8 minutes long,
 * or one that is resumed late) stays quiet.
 */
const TimerPill = ({ remainingMs }) => {
  const low = remainingMs !== null && remainingMs <= 60000;
  const [message, setMessage] = useState("");
  const announced = useRef(null);
  const finished = useRef(false);

  useEffect(() => {
    if (remainingMs === null) return;

    if (announced.current === null) {
      // First reading: milestones that are already well behind us are never spoken.
      announced.current = new Set(MILESTONES.filter((minutes) => remainingMs <= minutes * 60000 - 5000));
    }

    const due = MILESTONES.filter((minutes) => remainingMs <= minutes * 60000 && !announced.current.has(minutes));
    if (due.length > 0) {
      due.forEach((minutes) => announced.current.add(minutes));
      const minutes = Math.min(...due);
      setMessage(`${minutes} ${minutes === 1 ? "minute" : "minutes"} remaining.`);
    }

    if (remainingMs === 0 && !finished.current) {
      finished.current = true;
      setMessage("Time is up.");
    }
  }, [remainingMs]);

  const Icon = low ? WarningCircleIcon : TimerIcon;

  return (
    <>
      <div
        className="sxr-timer"
        role="timer"
        aria-label={low ? "Time remaining, under one minute" : "Time remaining"}
        data-low={low ? "true" : "false"}
      >
        <Icon size={20} weight={low ? "fill" : "regular"} aria-hidden="true" />
        <span className="sxr-timer__time">{remainingMs === null ? "--:--" : clock(remainingMs)}</span>
      </div>
      <p className="sx-sr" role="status" aria-live="polite">
        {message}
      </p>
    </>
  );
};

export default TimerPill;
