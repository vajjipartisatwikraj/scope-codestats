import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Box, Typography } from "@mui/material";
import { useAuth } from "../../../contexts/AuthContext";
import { getAcademicYearConfig, getDisplayNameForGraduation } from "../../../utils/academicYearConfig";
import useSurface from "./useSurface";

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

/**
 * The signed-in user's avatar, name and class, matching the main navbar, behind
 * a thin divider. Opens the profile page when pressed, unless `interactive` is
 * false (during a test), when it is only shown. The text is hidden on small
 * screens, leaving just the avatar.
 */
const ProfileBadge = ({ interactive = true }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const { border, muted, isDark } = useSurface();
  const [config, setConfig] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (token) {
      getAcademicYearConfig(token)
        .then((value) => !cancelled && setConfig(value))
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!user) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box aria-hidden sx={{ width: "1px", height: 26, bgcolor: border }} />
      <Box
        // Not clickable during a test: it would take the student out of a running section.
        {...(interactive
          ? { component: "button", type: "button", onClick: () => navigate("/profile?setup=true"), "aria-label": "Open your profile" }
          : {})}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          p: 0.5,
          pr: { xs: 0.5, md: 1.25 },
          font: "inherit",
          color: "inherit",
          textAlign: "left",
          bgcolor: "transparent",
          border: "none",
          borderRadius: "10px",
          cursor: interactive ? "pointer" : "default",
          transition: "background-color 0.2s",
          ...(interactive && {
            "&:hover": { bgcolor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)" },
            "&:focus-visible": { outline: "2px solid #0585E0", outlineOffset: 2 },
          }),
        }}
      >
        <Avatar
          alt={user.name || "User"}
          src={user.profilePicture}
          sx={{ width: 36, height: 36, border: `2px solid ${border}` }}
        />
        <Box sx={{ display: { xs: "none", md: "block" } }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", lineHeight: 1.2 }}>{titleCase(user.name)}</Typography>
          <Typography sx={{ color: muted, fontSize: "0.75rem", lineHeight: 1.3 }}>{roleLine(user, config)}</Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default ProfileBadge;
