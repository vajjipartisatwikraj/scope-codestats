import React, { useId } from 'react';
import './ExpandedPanel.css';
import { PhaseContext } from './ExpandedParts';
import ProblemsView from './ProblemsView';
import RanksView from './RanksView';
import ScoresView from './ScoresView';

/**
 * The panel a card opens into. It fills the whole dashboard, takes the tone of the card it came
 * from (the dark ink of the score and rank tiles, the plain surface of the problems card) and
 * shows the view for that card. The motion that opens and closes it is in useExpand.js; the
 * fading of the cards around it is in StudentDashboard.css.
 *
 * Props
 *   view       'scores' | 'ranks' | 'problems'
 *   phase      'opening' | 'open' | 'closing' (from useExpand)
 *   panelRef   the ref useExpand animates
 *   onClose    goes back to the dashboard
 *   userId     the signed-in student
 *   profiles, heatmap   the dashboard's own requests, shared with the problems view
 */
const TONES = {
  scores: 'ink',
  ranks: 'ink',
  problems: 'surface',
};

export default function ExpandedPanel({ view, phase, panelRef, onClose, userId, profiles, heatmap }) {
  const titleId = useId();
  const tone = TONES[view] || 'surface';

  return (
    <section
      ref={panelRef}
      className={`sd-panel sd-panel--${tone}`}
      data-phase={phase}
      data-view={view}
      data-theme={tone === 'ink' ? 'midnight' : undefined}
      aria-labelledby={titleId}
    >
      <div className="sd-panel__inner">
        <PhaseContext.Provider value={phase}>
          {view === 'scores' && <ScoresView userId={userId} titleId={titleId} onClose={onClose} />}
          {view === 'ranks' && <RanksView userId={userId} titleId={titleId} onClose={onClose} />}
          {view === 'problems' && (
            <ProblemsView userId={userId} titleId={titleId} onClose={onClose} profiles={profiles} heatmap={heatmap} />
          )}
        </PhaseContext.Provider>
      </div>
    </section>
  );
}
