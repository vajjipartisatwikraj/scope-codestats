import React from "react";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SquaresFourIcon } from "@phosphor-icons/react/dist/csr/SquaresFour";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { useTheme } from "../../../contexts/ThemeContext";
import { IconButton } from "../../ui";

/**
 * The navbar of the editor: the CodeStats mark and name at the left, and at the right the theme
 * switch and a dashboard button. It carries nothing about the resume itself. Back, the name, the
 * save state, Export and Save are in the page, in ActionBar.
 *
 *   onDashboard   goes to the dashboard (the editor asks first when there are unsaved edits)
 */
export default function TopBar({ onDashboard }) {
  const { themeName, toggleTheme } = useTheme();
  const toDaylight = themeName === "midnight";

  return (
    <header className="rbe-top">
      <span className="rbe-brand">
        <img className="rbe-brand__logo" src="/codestats-color.png" alt="" />
        <span className="rbe-brand__name">CodeStats</span>
      </span>

      <div className="rbe-top__end">
        <IconButton
          label={toDaylight ? "Switch to the light theme" : "Switch to the dark theme"}
          tone="plain"
          onClick={toggleTheme}
        >
          {toDaylight ? (
            <SunIcon size={20} weight="regular" aria-hidden="true" />
          ) : (
            <MoonIcon size={20} weight="regular" aria-hidden="true" />
          )}
        </IconButton>
        <IconButton label="Go to the dashboard" onClick={onDashboard}>
          <SquaresFourIcon size={20} weight="regular" aria-hidden="true" />
        </IconButton>
      </div>
    </header>
  );
}
