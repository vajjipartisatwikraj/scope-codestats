import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { Avatar, IconButton } from "../../ui";
import { SignalBars } from "../../custom-components";
import { useAuth } from "../../../contexts/AuthContext";
import { useAcademicYear } from "../../../contexts/AcademicYearContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { getDisplayNameForGraduation } from "../../../utils/academicYearConfig";
import useOnlineStatus from "./useOnlineStatus";
import "./speechX.css";

const titleCase = (text) =>
  String(text || "User")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

/** "Admin", "Teacher", or "II Year, CSE-E" for a student, as the main navbar shows it. */
const roleLine = (user, config) => {
  if (user?.userType === "admin") return "Admin";
  if (user?.userType === "teacher") return "Teacher";
  const year = user?.graduatingYear ? getDisplayNameForGraduation(user.graduatingYear, config) : "II Year";
  return `${year}, ${user?.department || "CSE"}-${user?.section || "E"}`;
};

/** The connection indicator: four bars and the word Online or Offline (a polite live region). */
function ConnectionStatus() {
  const online = useOnlineStatus();
  return (
    <span className="sx-conn" data-online={online ? "true" : "false"} role="status">
      <SignalBars level={online ? 4 : 1} tone={online ? "good" : "danger"} label="Connection" statusText={online ? "Online" : "Offline"} />
      <span className="sx-conn__text">{online ? "Online" : "Offline"}</span>
    </span>
  );
}

/** Switches between Midnight and Daylight. The icon shows the theme you are in, as the main navbar does. */
function ThemeButton() {
  const { mode, toggleTheme } = useTheme();
  const dark = mode === "dark";
  return (
    <IconButton label={dark ? "Switch to light theme" : "Switch to dark theme"} onClick={toggleTheme}>
      {dark ? <MoonIcon size={20} aria-hidden="true" /> : <SunIcon size={20} aria-hidden="true" />}
    </IconButton>
  );
}

/** The signed-in user's avatar, name and class, as the main navbar shows them. */
function ProfileBadge({ interactive }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { config } = useAcademicYear();
  if (!user) return null;

  const name = titleCase(user.name);
  const body = (
    <>
      <Avatar name={user.name || "User"} src={user.profilePicture} size={36} />
      <span className="sx-profile__text">
        <span className="sx-profile__name">{name}</span>
        <span className="sx-profile__role">{roleLine(user, config)}</span>
      </span>
    </>
  );

  // Not pressable during a test: it would take the student out of a running section.
  return interactive ? (
    <button type="button" className="sx-profile" data-interactive="true" onClick={() => navigate("/profile?setup=true")} aria-label={`Open your profile, ${name}`}>
      {body}
    </button>
  ) : (
    <div className="sx-profile" data-interactive="false">
      {body}
    </div>
  );
}

/**
 * FocusHeader: the fixed 72px top bar of every speech focus screen (replaces SetupHeader,
 * HeaderTools and ProfileBadge). The app navbar and sidebar are hidden on these screens, so this is
 * the only chrome. It is a `header` landmark; a spacer of the same height keeps the page from
 * sliding underneath it.
 *
 * Left: the platform mark (/codestats-color.png, the blue mark on a transparent background, which reads on
 * both Midnight and Daylight) with the "CodeStats" wordmark and an optional subtitle. Middle: the
 * `children` slot, right-aligned, for step indicators, progress and timers. Right: the built-in
 * tools: connection (SignalBars and "Online"/"Offline"), the theme toggle and the profile badge.
 * Under 600px the connection word hides and only icons and the avatar remain; under 480px the
 * wordmark hides too (the words stay for screen readers).
 *
 * Props
 *   subtitle          a muted line under the wordmark ("Speech Judge")
 *   to ('/speech-tests')  where the brand links
 *   locked (false)    the brand is plain text, not a link, and the profile is not pressable, so
 *                     neither can be used to walk away from a running section
 *   backLabel ('Back to speech tests')  the accessible name of the brand link
 *   children          the middle slot. It is a flex row: give a child `flex: 1` to fill it
 *   tools (true)      false hides the built-in tools (then put your own in children)
 *   profileInteractive  whether the profile opens /profile; default `!locked`
 *   compact (false)   always show only icons and the avatar (a crowded runner bar)
 *   className         added to the header
 *
 * Example:  <FocusHeader subtitle="Speech Judge"><Stepper .../></FocusHeader>
 */
const FocusHeader = ({ subtitle, to = "/speech-tests", locked = false, backLabel = "Back to speech tests", children, tools = true, profileInteractive, compact = false, className }) => {
  const brandContent = (
    <>
      <img className="sx-brand__logo" src="/codestats-color.png" alt="" />
      <span className="sx-brand__text">
        <span className="sx-brand__name">CodeStats</span>
        {subtitle ? <span className="sx-brand__subtitle">{subtitle}</span> : null}
      </span>
    </>
  );

  return (
    <>
      <div className="sx-header-spacer" aria-hidden="true" />
      <header className={className ? `sx-header ${className}` : "sx-header"} data-compact={compact ? "true" : undefined}>
        <div className="sx-header__inner">
          {locked ? (
            <span className="sx-brand">{brandContent}</span>
          ) : (
            <Link to={to} className="sx-brand" aria-label={backLabel}>
              {brandContent}
            </Link>
          )}

          {children ? <div className="sx-header__slot">{children}</div> : null}

          {tools ? (
            <div className="sx-header__tools">
              <ConnectionStatus />
              <ThemeButton />
              <span className="sx-header__divider" aria-hidden="true" />
              <ProfileBadge interactive={profileInteractive ?? !locked} />
            </div>
          ) : null}
        </div>
      </header>
    </>
  );
};

export default FocusHeader;
