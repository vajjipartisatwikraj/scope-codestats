import React from "react";
import { RadarChart } from "../../../custom-components";
import { EmptyState } from "../../../ui";
import ResultCard from "../ResultCard";
import { STAGE } from "../resultsMeta";

/** "Strongest skill: Fluency (92). Weakest: Pace (60)." The main finding as a sentence. */
const findingOf = (axes, you) => {
  const ranked = [...axes].sort((a, b) => you[b.key] - you[a.key]);
  if (ranked.length === 1) return `${ranked[0].label}: ${you[ranked[0].key]} out of 100.`;
  const best = ranked[0];
  const worst = ranked[ranked.length - 1];
  return `Strongest skill: ${best.label} (${you[best.key]}). Weakest: ${worst.label} (${you[worst.key]}).`;
};

/**
 * The student's skills against the batch average. `skills` is
 * { axes: [{ key, label }], you: {key: 0..100}, batch: {key: 0..100} | null }.
 * With three or more skills: the custom RadarChart (the web fades in, then the shapes grow out
 * from the centre), centred in its card. With fewer there is no shape to draw, so the skills are
 * listed with their scores. There are no bars.
 */
const SkillRadar = ({ skills }) => {
  const axes = skills.axes.filter((axis) => typeof skills.you[axis.key] === "number");
  const batch = skills.batch;
  const radarAxes = axes.map((axis) => ({
    key: axis.key,
    label: axis.label,
    value: skills.you[axis.key],
    max: 100,
    compare: batch && typeof batch[axis.key] === "number" ? batch[axis.key] : undefined,
  }));

  return (
    <ResultCard title="Skill profile" caption={batch ? "You vs batch" : "Your skills"} stage={STAGE.skills}>
      {axes.length === 0 ? (
        <EmptyState compact title="No skill data for this section" text="Skill scores appear here when the section has been scored on them." />
      ) : axes.length >= 3 ? (
        <div className="sxe-profile">
          <RadarChart
            axes={radarAxes}
            seriesLabel="You"
            compareLabel="Batch average"
            size={460}
            aspect={1.9}
            labelSize={11}
            title="Skill profile"
            summary={findingOf(axes, skills.you)}
            emptyMessage="No skill data for this section"
          />
        </div>
      ) : (
        <dl className="sxe-skill-list">
          {axes.map((axis) => (
            <div key={axis.key} className="sxe-skill-list__row">
              <dt>{axis.label}</dt>
              <dd>
                {skills.you[axis.key]}
                <span className="sxe-muted"> / 100</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </ResultCard>
  );
};

export default SkillRadar;
