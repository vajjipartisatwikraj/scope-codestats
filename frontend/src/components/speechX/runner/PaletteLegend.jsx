import React from "react";
import { StateLegend } from "../shared";
import useMediaQuery from "../../../hooks/useMediaQuery";
import "./runner.css";

const STATES = ["current", "answered", "open", "later", "review"];

/**
 * Key for the question palette: each state's dot, icon and word. On a phone the palette is a short
 * block on top of the question, so the key folds into a native disclosure there.
 */
const PaletteLegend = () => {
  const roomy = useMediaQuery("(min-width: 900px)");
  const legend = <StateLegend states={STATES} label="Question states" className="sxr-legend" />;

  if (roomy) return legend;

  return (
    <details className="sxr-key">
      <summary className="sxr-key__summary">What the marks mean</summary>
      {legend}
    </details>
  );
};

export default PaletteLegend;
