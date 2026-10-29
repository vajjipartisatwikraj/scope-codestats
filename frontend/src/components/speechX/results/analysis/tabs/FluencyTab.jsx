import React from "react";
import { Reveal } from "../../../shared";
import SpeechTimeline from "../SpeechTimeline";
import MetricTile from "../MetricTile";

/** Delivery: the speech timeline and the measured pace, pause and clarity figures. */
const FluencyTab = ({ fluency }) => (
  <div className="sxe-tab">
    <div>
      <h4 className="sxe-tab__heading">
        {fluency.score !== null ? "Fluency score" : "Delivery"}
        {fluency.score !== null ? (
          <span className="sxe-tab__score">
            {fluency.score}
            <span className="sxe-muted"> / 100</span>
          </span>
        ) : null}
      </h4>
      <p className="sxe-tab__note">Based on acoustic analysis of pace, pauses and rhythm. {fluency.note}.</p>
    </div>

    <SpeechTimeline timeline={fluency.timeline} />

    <ul className="sxe-metrics">
      {fluency.tiles.map((tile, index) => (
        <li key={tile.key}>
          <Reveal y={10} duration={0.28} delay={0.12 + index * 0.04} className="sxe-slot">
            <MetricTile tile={tile} />
          </Reveal>
        </li>
      ))}
    </ul>
  </div>
);

export default FluencyTab;
