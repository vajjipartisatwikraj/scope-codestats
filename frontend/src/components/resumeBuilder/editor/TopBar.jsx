import brand from '../../../brand';
import BrandLogo from '../../custom-components/BrandLogo';
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
        <BrandLogo
          height={32}
          fallback={
            <>
              <img className="rbe-brand__logo" src={brand.platform.logo} alt="" />
              <span className="rbe-brand__name">{brand.names.platform}</span>
            </>
          }
        />
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
