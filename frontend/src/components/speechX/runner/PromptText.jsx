import React from "react";
import "./runner.css";

/**
 * The question line. It is the page's h1. App font at Body large, 72 characters wide at most
 * (design/screens.md section 11). The old Outfit prompt typeface is retired.
 */
const PromptText = ({ children, as: Heading = "h1", className }) => (
  <Heading className={className ? `sxr-prompt ${className}` : "sxr-prompt"}>{children}</Heading>
);

export default PromptText;
