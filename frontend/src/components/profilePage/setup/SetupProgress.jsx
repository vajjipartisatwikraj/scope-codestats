import React from 'react';
import { Card } from '../../ui';
import { ScoreRing } from '../../custom-components';
import { encouragement, leftText } from '../completion';

/**
 * How complete the profile is while the student fills in the setup: a ring with the percentage and
 * one line on what is left. It moves as they type.
 *
 *   completion   from completionOf()
 */
export default function SetupProgress({ completion }) {
  return (
    <Card as="section" className="pf-card pf-progress" aria-label="Profile completion">
      <ScoreRing value={completion.percent} size={112} caption="% done" label="Profile completion" tone={completion.percent >= 100 ? 'success' : 'accent'} />
      <div>
        <p className="pf-progress__title">{encouragement(completion.percent)}</p>
        <p className="pf-muted">{leftText(completion.next)}</p>
      </div>
    </Card>
  );
}
