import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { Badge } from "../../ui";
import { FocusHeader } from "../shared";

/**
 * Top bar of the results page (the shared FocusHeader): brand on the left; in the middle the
 * page title with a "Result ready" badge; on the right the connection indicator, theme switch and
 * the signed-in user's profile (built into the header). Going back is done from the button in
 * the details band below.
 */
const ResultsNavbar = ({ title }) => (
  <FocusHeader subtitle="Speech Judge">
    <p className="sxe-nav__title sx-hide-phone">{title} results</p>
    <Badge tone="success" icon={<CheckCircleIcon size={14} weight="bold" aria-hidden="true" />}>
      Result ready
    </Badge>
  </FocusHeader>
);

export default ResultsNavbar;
