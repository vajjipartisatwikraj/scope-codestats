import { createTheme } from "@mui/material";
import { FONT_FAMILY, themeForMode } from "./tokens";

/**
 * The Material UI theme for screens that have not been migrated yet.
 *
 * Only colours and the font come from the design tokens. Shapes, borders and shadows keep the
 * values the old theme had, so no screen changes layout until it moves to the new components.
 * Delete this file when the last Material UI screen is gone.
 */

// Legacy card and paper shadows, kept as they were.
const LEGACY_SHADOW = {
  dark: "0 4px 12px rgba(0, 0, 0, 0.2)",
  light: "0 0 0 1px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.05)",
};

const heading = (fontWeight) => ({ fontFamily: FONT_FAMILY, fontWeight, textShadow: "none" });

export default function createAppTheme(mode) {
  const t = themeForMode(mode);
  const isDark = t.mode === "dark";
  const shadow = isDark ? LEGACY_SHADOW.dark : LEGACY_SHADOW.light;

  return createTheme({
    typography: {
      fontFamily: FONT_FAMILY,
      h1: heading(700),
      h2: heading(700),
      h3: heading(600),
      h4: heading(600),
      h5: heading(500),
      h6: heading(500),
      button: { textTransform: "none" },
    },
    shape: {
      borderRadius: 4,
    },
    palette: {
      mode: t.mode,
      primary: {
        main: t.accent,
        dark: t.accentHover,
        contrastText: t.onAccent,
      },
      secondary: {
        main: t.raised,
        light: t.surface,
        dark: t.high,
        contrastText: t.text,
      },
      background: {
        default: t.canvas,
        paper: t.surface,
        card: t.surface,
      },
      text: {
        primary: t.text,
        secondary: t.muted,
        disabled: t.subtle,
      },
      divider: t.line,
    },
    components: {
      // Consistent card styling
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface,
            backgroundImage: "none",
            borderRadius: isDark ? 12 : 8,
            border: `1px solid ${t.line}`,
            boxShadow: shadow,
          },
        },
      },
      // Consistent paper styling
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: t.surface,
            backgroundImage: "none",
            ...(isDark ? {} : { borderRadius: 4 }),
            border: `1px solid ${t.line}`,
            boxShadow: shadow,
          },
        },
      },
      // Consistent CardContent padding
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 16,
            "&:last-child": {
              paddingBottom: 16,
            },
          },
        },
      },
      // The app bar draws its own background
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: "transparent",
            backgroundImage: "none",
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            fontFamily: FONT_FAMILY,
            textTransform: "none",
            borderRadius: "4px",
          },
          ...(isDark
            ? {}
            : {
                containedPrimary: {
                  backgroundColor: t.accent,
                  "&:hover": {
                    backgroundColor: t.accentHover,
                  },
                },
                outlinedPrimary: {
                  borderColor: t.accentText,
                  color: t.accentText,
                  "&:hover": {
                    backgroundColor: t.accentSoft,
                    borderColor: t.accentPress,
                  },
                },
              }),
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontFamily: FONT_FAMILY,
          },
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            fontFamily: FONT_FAMILY,
          },
        },
      },
      // No shadows, blur or filters on text
      MuiTypography: {
        styleOverrides: {
          root: {
            textShadow: "none",
            backgroundImage: "none",
            filter: "none",
            color: t.text,
          },
        },
      },
    },
  });
}
