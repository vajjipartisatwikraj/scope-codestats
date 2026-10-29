import React from "react";
import { PageHeader } from "../../ui";
import TonalMark from "./TonalMark";
import "./speechX.css";

/**
 * SpeechPageHero: the title block at the top of the student test list and the admin list pages.
 * It is the ui PageHeader (the page's single h1, an optional description, actions at the right)
 * with an optional decorative mark beside it. The blue banner of the old PageHero is gone.
 * Put it inside a ui <Page>.
 *
 * Props (the old PageHero had title, icon, description, actions)
 *   title         the h1 text
 *   description   one muted line
 *   actions       a node at the right: the buttons, the primary one last
 *   icon          a Phosphor icon component (icon={MicrophoneIcon}) shown in a TonalMark before the title.
 *                 The old prop was an element placed after the title; an element still works and is
 *                 shown inside the mark.
 *   hue ('accent')  the mark's hue, see TonalMark
 *   count         optional number beside the title ("12 tests"), as PageHeader
 *   size ('display')  'display' (students) | 'headline' (staff, compact)
 *
 * Example:  <SpeechPageHero title="Speech tests" icon={MicrophoneIcon} description="..." actions={<Button variant="primary">...</Button>} />
 */
const SpeechPageHero = ({ title, icon, description, actions, hue = "accent", count, size = "display" }) => (
  <div className="sx-hero">
    {icon ? <TonalMark icon={icon} hue={hue} size={size === "display" ? 56 : 44} /> : null}
    <div className="sx-hero__main">
      <PageHeader title={title} count={count} description={description} actions={actions} size={size} />
    </div>
  </div>
);

export default SpeechPageHero;
