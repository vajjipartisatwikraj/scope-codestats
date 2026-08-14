/**
 * Shared MUI `sx` rules for rendering MathML inside question descriptions,
 * editorials and other HTML content blocks.
 *
 * Question HTML may contain MathML (`<math>`, `<mfrac>`, `<msup>`, `<msub>`,
 * `<mrow>`, `<mi>`, `<mn>`, `<mo>`). Browsers with MathML Core support render
 * these natively, but they inherit no styling from the surrounding block, so
 * these rules keep formulas readable, correctly aligned and theme aware.
 *
 * @param {boolean} darkMode Whether the dark theme is active.
 * @returns {object} `sx` fragment to spread into an HTML content container.
 */
export const mathContentStyles = (darkMode) => ({
  "& math": {
    fontFamily:
      '"Latin Modern Math", "STIX Two Math", "Cambria Math", "Times New Roman", serif',
    fontSize: "1.08em",
    color: darkMode ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.88)",
    maxWidth: "100%",
    overflowX: "auto",
    overflowY: "hidden",
  },
  '& math[display="inline"]': {
    verticalAlign: "-0.15em",
    margin: "0 2px",
  },
  '& math[display="block"]': {
    display: "block",
    margin: "14px auto",
    textAlign: "center",
    fontSize: "1.15em",
  },
  // Keep fraction bars and scripts legible against both themes.
  "& mfrac": {
    padding: "0 1px",
  },
  "& msup, & msub, & msubsup": {
    fontSize: "1em",
  },
  "& mo": {
    padding: "0 1px",
  },
  // MathML must not inherit the inline-code chip styling used elsewhere.
  "& math mi, & math mn, & math mo": {
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    padding: 0,
  },
});

export default mathContentStyles;
