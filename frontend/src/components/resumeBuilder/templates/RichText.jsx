import React from "react";
import "./resumePaper.css";

// Matches **bold** and `code`, keeping the delimiters so we can tell them apart
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`)/g;

/**
 * Minimal inline formatter for resume text: **bold** and `code`.
 * Mirrors \textbf{} and \texttt{} from the LaTeX source without pulling in a markdown
 * dependency. Part of the paper document, so it keeps the paper's own styles (resumePaper.css).
 *
 *   text   the raw text with the marks
 */
export default function RichText({ text }) {
  const source = String(text ?? "");
  if (!source) return null;

  return (
    <>
      {source.split(TOKEN).map((part, index) => {
        if (!part) return null;

        // Same tests as resumeDocDefinition.js, so the preview and the PDF read the marks alike
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={index} className="rbp-bold">
              {part.slice(2, -2)}
            </strong>
          );
        }

        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code key={index} className="rbp-code">
              {part.slice(1, -1)}
            </code>
          );
        }

        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </>
  );
}
