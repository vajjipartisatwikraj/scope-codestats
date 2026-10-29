import React from "react";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { Button } from "../../../ui";

/** The way back from the details band to the test overview (the section list). */
const RibbonBackButton = ({ onClick, label = "Back to sections" }) => (
  <Button variant="secondary" size="sm" onClick={onClick} startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />}>
    {label}
  </Button>
);

export default RibbonBackButton;
