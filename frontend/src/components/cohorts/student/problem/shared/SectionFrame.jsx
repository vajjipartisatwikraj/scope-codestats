import React from 'react';
import Pane from './Pane';

/**
 * SectionFrame: the frame of Editorial, Submissions, Report and Notes. On a desktop it is a Pane (a
 * surface with a header). On a phone these sections open inside the statement's pane, and a pane
 * must not hold a pane, so `embedded` draws the lead (the title, tabs or back button) as a plain row
 * above the content.
 *
 *   label      the accessible name
 *   lead       the title, tabs or back button
 *   embedded   inside another pane: no surface of its own
 */
export default function SectionFrame({ label, lead, embedded = false, children }) {
  if (!embedded) {
    return (
      <Pane className="ps-section" label={label} lead={lead}>
        {children}
      </Pane>
    );
  }
  return (
    <section className="ps-embedded" aria-label={label}>
      <div className="ps-embedded__lead">{lead}</div>
      {children}
    </section>
  );
}
