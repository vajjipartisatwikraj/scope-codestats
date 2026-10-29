import React from "react";
import { Badge, StatTile, formatNumber } from "../../../ui";
import { FEEDBACK_TONES } from "../resultsMeta";

/**
 * One delivery measurement as a ui StatTile (size m, on a raised fill inside the open question):
 * its label, its value with the unit, the target as context and a verdict badge with an icon
 * and the server's word ("Good", "Needs work").
 *
 *   tile   { key, label, value, unit, ideal, tone: "good" | "warn", badge }
 */
const MetricTile = ({ tile }) => {
  const meta = FEEDBACK_TONES[tile.tone] || FEEDBACK_TONES.warn;
  const Icon = meta.icon;
  const value = typeof tile.value === "number" ? formatNumber(tile.value) : tile.value;
  return (
    <StatTile
      className="sxe-metric"
      size="m"
      label={tile.label}
      value={
        <>
          {value}
          {tile.unit ? <span className="sxe-metric__unit">{tile.unit}</span> : null}
        </>
      }
      context={
        <>
          {tile.ideal ? <span className="sxe-metric__ideal">{tile.ideal}</span> : null}
          <Badge tone={meta.badge} icon={<Icon size={14} weight="bold" aria-hidden="true" />}>
            {tile.badge}
          </Badge>
        </>
      }
    />
  );
};

export default MetricTile;
