import React from 'react';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { formatNumber } from '../../../../ui';
import { ScoreRing } from '../../../../custom-components';

/**
 * One module in the list: its name and "3 of 12 solved", with a plain donut at the right showing how
 * much of it is done (no number in it: the figures are in the text). A finished module's donut is
 * full, in the success colour, with a check in the middle, so it is never told by colour alone; a
 * module without questions has no donut (there is nothing to measure).
 *
 * The open module is a solid accent row (white text, a white donut on a pressed-accent track) with
 * aria-current.
 *
 *   module    the module
 *   summary   { total, solved, percent, complete } (model/progress.moduleSummary)
 *   active    this is the open module
 *   onSelect  (moduleId) => void
 */
export default function ModuleRow({ module, summary, active, onSelect }) {
  const { total, solved, percent, complete } = summary;
  // On the solid accent row the donut is white; otherwise accent, or success once complete
  const tone = active ? 'var(--ds-on-accent)' : complete ? 'success' : 'accent';

  return (
    <li>
      <button type="button" className="cdm-row" data-active={active ? 'true' : 'false'} aria-current={active ? 'true' : undefined} onClick={() => onSelect(module._id)}>
        <span className="cdm-row__text">
          <span className="cdm-row__title">{module.title}</span>
          <span className="cdm-row__meta">{total > 0 ? `${formatNumber(solved)} of ${formatNumber(total)} solved` : 'No questions yet'}</span>
        </span>

        {total > 0 ? (
          <ScoreRing
            className="cdm-row__ring"
            size={36}
            thickness={3}
            value={percent}
            tone={tone}
            animate={false}
            label={complete ? 'Complete' : `${percent} percent solved`}
            center={complete ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : null}
          />
        ) : null}
      </button>
    </li>
  );
}
