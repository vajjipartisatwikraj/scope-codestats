import React from "react";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";

/**
 * The big round action of the audio and speaker checks (design/screens.md section 11): a 72px
 * circle that records or plays. Accent at rest. While `active` it shows `activeIcon` and two soft
 * rings spread outwards (none under reduced motion), and turns danger when `activeTone` is
 * 'danger' (recording, with a square stop icon). `busy` swaps the icon for a spinner and locks it.
 * Disabled is the high fill with a subtle icon.
 *
 * Props
 *   icon, activeIcon   Phosphor icon components (activeIcon defaults to icon)
 *   active (false)     the action is running
 *   activeTone ('danger')   'danger' | 'accent': the colour while active
 *   busy (false)       working, cannot be pressed
 *   disabled (false)
 *   label              the accessible name (also the tooltip through the title)
 *   onClick
 *   size (72)          px
 */
const RecordButton = ({ icon: Icon, activeIcon, active = false, activeTone = "danger", busy = false, disabled = false, label, onClick, size = 72 }) => {
  const ActiveIcon = activeIcon || Icon;
  const iconSize = Math.round(size * 0.42);
  const tone = active ? activeTone : "accent";

  return (
    <span className="sxs-record" style={{ "--sxs-record-size": `${size}px` }} data-active={active ? "true" : "false"} data-tone={tone}>
      {active ? (
        <>
          <span className="sxs-record__ring" aria-hidden="true" />
          <span className="sxs-record__ring sxs-record__ring--late" aria-hidden="true" />
        </>
      ) : null}
      <button type="button" className="sxs-record__button" onClick={onClick} disabled={disabled || busy} aria-label={label} title={label} aria-busy={busy || undefined}>
        {busy ? (
          <SpinnerGapIcon size={iconSize} weight="bold" aria-hidden="true" data-spin="true" />
        ) : active ? (
          <ActiveIcon size={iconSize} weight="fill" aria-hidden="true" />
        ) : (
          <Icon size={iconSize} weight="fill" aria-hidden="true" />
        )}
      </button>
    </span>
  );
};

export default RecordButton;
