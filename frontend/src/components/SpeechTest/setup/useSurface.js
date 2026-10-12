import { useTheme } from "@mui/material";

/**
 * Surface colours shared by the test setup screens, derived from the active
 * theme so every card, bar and divider matches the rest of the platform.
 */
const useSurface = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  return {
    isDark,
    card: isDark ? "#0A0A0A" : "#ffffff",
    cardRaised: isDark ? "#0A0A0A" : "#ffffff",
    border: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
    divider: isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(0, 0, 0, 0.06)",
    muted: isDark ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
    accent: "#0585E0",
    accentSoft: isDark ? "rgba(5, 133, 224, 0.16)" : "rgba(5, 133, 224, 0.1)",
  };
};

export default useSurface;
