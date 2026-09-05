import React, { useMemo } from "react";
import { Box, Chip, Typography } from "@mui/material";
import { WorkspacePremium as RecognizedIcon } from "@mui/icons-material";

export const GOLD = "#C9A227";
export const GOLD_SOFT = "rgba(201, 162, 39, 0.12)";
export const GOLD_BORDER = "rgba(201, 162, 39, 0.45)";

const MAX_SUGGESTIONS = 5;

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Suggestion list shown under the certificate name field.
 *
 * Selecting an entry fills the name, issuer and issuer domain in one click and
 * makes the certificate recognised (the server confirms this by matching the
 * same catalogue).
 */
const CertificationSuggestions = ({ catalog, query, darkMode, logoToken, onSelect }) => {
  const mutedColor = darkMode ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";

  const { matches, exactMatch } = useMemo(() => {
    const needle = normalize(query);
    const list = Array.isArray(catalog) ? catalog : [];

    // Already matched? Show the badge instead of a list of options
    const exact = needle
      ? list.find((entry) => {
          const name = normalize(entry.name);
          const code = normalize(entry.code);
          return needle.includes(name) || (code && needle.includes(code));
        })
      : null;

    if (!needle) {
      return { matches: list.slice(0, MAX_SUGGESTIONS), exactMatch: null };
    }

    const scored = list.filter(
      (entry) =>
        normalize(entry.name).includes(needle) ||
        normalize(entry.issuer).includes(needle) ||
        (entry.code && normalize(entry.code).includes(needle)),
    );

    return { matches: scored.slice(0, MAX_SUGGESTIONS), exactMatch: exact };
  }, [catalog, query]);

  if (exactMatch) {
    return (
      <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <Chip
          size="small"
          icon={<RecognizedIcon sx={{ fontSize: 16, color: `${GOLD} !important` }} />}
          label="Recognized"
          sx={{
            bgcolor: GOLD_SOFT,
            color: GOLD,
            border: `1px solid ${GOLD_BORDER}`,
            fontWeight: 600,
          }}
        />
        <Typography variant="caption" sx={{ color: mutedColor }}>
          Recognized certificates appear in gold on your profile.
        </Typography>
      </Box>
    );
  }

  if (matches.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      <Typography
        variant="caption"
        sx={{ display: "block", mb: 0.75, color: mutedColor }}
      >
        {query?.trim() ? "Matching recognized certificates" : "Popular recognized certificates"}
      </Typography>

      <Box
        sx={{
          borderRadius: "12px",
          border: `1px solid ${darkMode ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          overflow: "hidden",
        }}
      >
        {matches.map((entry, index) => (
          <Box
            key={`${entry.name}-${index}`}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(entry)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(entry);
              }
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 1.5,
              py: 1,
              cursor: "pointer",
              borderTop:
                index === 0
                  ? "none"
                  : `1px solid ${darkMode ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
              transition: "background-color 0.15s ease",
              "&:hover": { bgcolor: GOLD_SOFT },
            }}
          >
            <Box
              component="img"
              src={`https://img.logo.dev/${entry.domain}?token=${logoToken}`}
              alt={entry.issuer}
              onError={(e) => {
                e.target.style.visibility = "hidden";
              }}
              sx={{ width: 22, height: 22, objectFit: "contain", flexShrink: 0 }}
            />

            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: darkMode ? "#fff" : "#000",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {entry.name}
              </Typography>
              <Typography variant="caption" sx={{ color: mutedColor }}>
                {entry.issuer}
                {entry.code ? ` · ${entry.code}` : ""}
              </Typography>
            </Box>

            <RecognizedIcon sx={{ fontSize: 18, color: GOLD, flexShrink: 0 }} />
          </Box>
        ))}
      </Box>

      <Typography variant="caption" sx={{ display: "block", mt: 0.75, color: mutedColor }}>
        Note: recognized certificates appear in gold on your profile.
      </Typography>
    </Box>
  );
};

export default CertificationSuggestions;
