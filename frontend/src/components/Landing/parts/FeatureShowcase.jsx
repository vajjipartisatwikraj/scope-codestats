import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import brand from '../../../brand';
import CohortsDemo from './CohortsDemo';
import PlatformsDemo from './PlatformsDemo';
import { HeatmapPicture, RankPicture } from './AnimatedPictures';
import ResumeDemo from './ResumeDemo';
import CoursesDemo from './CoursesDemo';
import VocalQDemo from './VocalQDemo';
import IntervionDemo from './IntervionDemo';
import ProgressDemo from './ProgressDemo';
import PortfolioDemo from './PortfolioDemo';
import './FeatureShowcase.css';

/**
 * What CodeStats offers, one tile each, with a small animated picture of the product in place of an icon.
 *
 * The pictures are drawn from plain markup so they stay sharp at every width and weigh nothing. The two big
 * ones are films with several steps (CohortsDemo, PlatformsDemo, PortfolioDemo); the rest are short animations that play when
 * they scroll into view (AnimatedPictures). Each picture is aria-hidden: the tile's title and sentence carry
 * the meaning. All figures in them are sample data, and the section says so under the grid.
 *
 * Order, top to bottom: cohorts and platforms; then rank, consistency, and analytics and progress; then VocalQ
 * (communication tests) and the wider Intervion (AI interviews); then courses and opportunities (one tile), the
 * public portfolio and the resume builder.
 *
 * Layout: one column on a phone, a six-column grid from 768px, twelve columns from 1024px
 * (data-md / data-lg on a tile are its column spans). Colours are in FeatureShowcase.css.
 */

// ─── The tiles ──────────────────────────────────────────────────────────────

const TILES = [
  {
    key: 'cohorts',
    md: '6',
    lg: '7',
    title: 'Cohorts that grade as you code',
    copy: 'Modules of real coding questions in a built-in editor. Run your code and see every test case pass or fail at once.',
    picture: <CohortsDemo />,
  },
  {
    key: 'platforms',
    md: '6',
    lg: '5',
    title: 'Every platform, one profile',
    copy: 'LeetCode, Codeforces, CodeChef, HackerRank and GitHub in a single record, refreshed every night.',
    picture: <PlatformsDemo />,
  },
  {
    key: 'rank',
    md: '3',
    lg: '4',
    tone: 'accent',
    title: 'One score. A real rank.',
    copy: 'Your combined score, ranked against other students by department and batch.',
    picture: <RankPicture />,
  },
  {
    key: 'consistency',
    md: '3',
    lg: '4',
    title: 'Consistency you can see',
    copy: 'A daily heatmap and a weekly index from 0 to 5 show how steadily you practise.',
    picture: <HeatmapPicture />,
  },
  {
    key: 'progress',
    md: '6',
    lg: '4',
    title: 'Analytics and progress',
    copy: 'Bar, pie and line charts of your scores, problems solved and ratings show how far you have come.',
    picture: <ProgressDemo />,
  },
  {
    key: 'vocalq',
    md: '6',
    lg: '5',
    title: 'VocalQ',
    copy: 'Communication tests: speak, read, repeat and write. Recorded answers are scored automatically.',
    picture: <VocalQDemo />,
  },
  {
    key: 'intervion',
    md: '6',
    lg: '7',
    title: 'Intervion',
    badge: 'Coming soon',
    copy: 'AI interviews you can talk to. Answer out loud, hear the follow-up and get feedback on every answer.',
    picture: <IntervionDemo />,
  },
  {
    key: 'courses',
    md: '6',
    lg: '4',
    title: 'Courses and opportunities',
    copy: 'Enrol in courses and apply to internships and jobs from your college, all in one place.',
    picture: <CoursesDemo />,
  },  {
    key: 'portfolio',
    md: '3',
    lg: '4',
    title: 'A public portfolio, ready to share',
    copy: 'One link that shows your rank, heatmap and linked platforms to recruiters and mentors.',
    picture: <PortfolioDemo />,
  },
  {
    key: 'resume',
    md: '3',
    lg: '4',
    title: 'Resume builder',
    copy: 'Turn your profile and projects into a clean resume, ready to download.',
    picture: <ResumeDemo />,
  },];


const REVEAL = (reduced, index = 0) => ({
  initial: reduced ? false : { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '0px 0px -8% 0px' },
  transition: { duration: 0.7, delay: (index % 3) * 0.08, ease: [0.16, 1, 0.3, 1] },
});

function Tile({ tile, index, reduced }) {
  return (
    <motion.li className="fx-tile" data-key={tile.key} data-md={tile.md} data-lg={tile.lg} data-tone={tile.tone} {...REVEAL(reduced, index)}>
      <div>
        <h3 className="fx-title">{tile.title}</h3>
        {tile.badge ? <span className="fx-soon">{tile.badge}</span> : null}
        <p className="fx-copy">{tile.copy}</p>
      </div>
      {tile.picture}
    </motion.li>
  );
}

export default function FeatureShowcase() {
  const reduced = useReducedMotion();

  return (
    <section className="lp-sec lp-pad fx bg-black" aria-labelledby="fx-heading">
      <div className="mx-auto max-w-6xl">
        <div className="fx-head">
          <h2 id="fx-heading" className="lp-h2 font-display">
            Everything you need to get job-ready, <span className="italic text-white/70">in one place.</span>
          </h2>
          <p className="fx-lead">Practise, get assessed, build your profile and watch your progress. This is what {brand.codeStats.name} gives you.</p>
        </div>

        <ul className="fx-grid">
          {TILES.map((tile, index) => (
            <Tile key={tile.key} tile={tile} index={index} reduced={reduced} />
          ))}
        </ul>

        <p className="fx-note">The screens above use sample data.</p>
      </div>
    </section>
  );
}
