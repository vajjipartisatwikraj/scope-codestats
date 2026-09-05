import React from "react";
import { Box } from "@mui/material";

// Matches **bold** and `code`, keeping the delimiters so we can tell them apart
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/**
 * Minimal inline formatter for resume text: **bold** and `code`.
 * Mirrors \textbf{} and \texttt{} from the LaTeX source without pulling in a
 * markdown dependency.
 */
const RichText = ({ text }) => {
  const source = String(text ?? "");
  if (!source) return null;

  return (
    <>
      {source.split(TOKEN).map((part, index) => {
        if (!part) return null;

        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <Box component="strong" key={index} sx={{ fontWeight: 700 }}>
              {part.slice(2, -2)}
            </Box>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <Box
              component="code"
              key={index}
              sx={{ fontFamily: "'Courier New', monospace", fontSize: "0.94em" }}
            >
              {part.slice(1, -1)}
            </Box>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
};

export default RichText;
