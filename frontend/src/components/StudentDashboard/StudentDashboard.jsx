import React, { useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import useMediaQuery from '../../hooks/useMediaQuery';
import { toTitleCase } from '../Navbar/formatters';
import './StudentDashboard.css';
import ActivityCard from './ActivityCard';
import ConsistencyCard from './ConsistencyCard';
import ExpandedPanel from './ExpandedPanel';
import OverallScoreCard from './OverallScoreCard';
import PlatformSolvedCard from './PlatformSolvedCard';
import RankCard from './RankCard';
import { longDate } from './formatters';
import useExpand from './useExpand';
import { useCodingProfiles, useHeatmap, useScores, useWeeklyActivity } from './useDashboardData';

/**
 * The student's home screen (route /dashboard).
 *
 * On a laptop or desktop (1000px wide and up) the whole screen fits the window with no
 * scrolling, which is the point of a home screen you glance at:
 *
 *   left   the greeting, the activity heatmap, and the
 *          problems solved on each platform. Their rows share the height that is left.
 *   right  three tiles (overall score, consistency, college rank). Each is a third of the
 *          height tall, --sd-rail (set in the stylesheet from the window height), and 1.2 times
 *          that wide.
 *
 * Three cards open up: the overall score tile, the college rank tile and the problems solved card.
 * Pressing one grows it to fill the whole dashboard while the other cards fade away, and the panel
 * shows every chart about that subject (see useExpand.js for the motion, ExpandedPanel.jsx and the
 * three views for what is inside). Escape or the back button returns to the dashboard.
 *
 * Below 1000px the cards stack and the page scrolls, numbers first. A panel replaces the stack.
 *
 * Every card gets its own { data, loading, error, reload } from useDashboardData, so one slow or
 * failing request only affects its own card. The charts come from ../custom-components.
 *
 * The old dashboard (platform linking, the Progress tab) still lives in deprecated/deprecated_Dashboard.jsx
 * and is reached through ?view=platforms and ?view=progress (see ConditionalDashboard.jsx).
 */

// The cards on the right read the last 30 days
const SCORE_DAYS = 30;

export default function StudentDashboard() {
  const { user } = useAuth();
  const userId = user?._id || user?.id || null;

  const scores = useScores(userId, SCORE_DAYS);
  const weekly = useWeeklyActivity(userId);
  const profiles = useCodingProfiles(userId);
  const heatmap = useHeatmap(userId);

  const rootRef = useRef(null);
  const morph = useMediaQuery('(min-width: 1000px)');
  const expand = useExpand({ rootRef, morph });

  return (
    <div className="sd" ref={rootRef} data-expand={expand.phase} data-view={expand.view || undefined}>
      <div className="sd-left">
        <header className="sd-header">
          <h1 className="sd-header__title">
            {user?.name ? `Welcome back, ${toTitleCase(user.name)}!` : 'Welcome back!'}
          </h1>
          <p className="sd-header__meta">{longDate()} · Your coding journey, unified</p>
        </header>

        <ActivityCard state={heatmap} />
        <PlatformSolvedCard state={profiles} onOpen={(card) => expand.open('problems', card)} />
      </div>

      <div className="sd-rail">
        <OverallScoreCard state={scores} onOpen={(card) => expand.open('scores', card)} />
        <ConsistencyCard weekly={weekly} heatmap={heatmap} />
        <RankCard state={scores} onOpen={(card) => expand.open('ranks', card)} />
      </div>

      {expand.view && (
        <ExpandedPanel
          view={expand.view}
          phase={expand.phase}
          panelRef={expand.panelRef}
          onClose={expand.close}
          userId={userId}
          profiles={profiles}
          heatmap={heatmap}
        />
      )}
    </div>
  );
}
