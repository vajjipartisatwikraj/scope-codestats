import React, { useEffect, useState } from 'react';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
import { FlagCheckeredIcon } from '@phosphor-icons/react/dist/csr/FlagCheckered';
import { TrendUpIcon } from '@phosphor-icons/react/dist/csr/TrendUp';
import { Avatar, Consistency, ScoreChange } from './Cells';
import { formatNumber, ordinalParts, profilePath, signed } from './leaderboardFormat';
import { TABS, highlightsOf, valueOf } from './leaderboardModel';

/**
 * The blocks above the board, top to bottom:
 *
 *   Leaders      "Champions": the first three places of the list as it is filtered, three cards over
 *                a quiet backdrop (the word "Champions" and two large X marks). The winner is in the
 *                middle and raised, second place is on its left and third on its right. Each card has
 *                a soft banner with the place on it, a hexagonal picture, the figure of the list in a
 *                dark pill with the 7-day change, the name, three smaller figures and a link to the
 *                profile. On a phone the same three cards stay, smaller, with only the place, the
 *                picture, the score, the name and the class (the X backdrop is dropped too).
 *   Highlights   "Highlights": four small tiles that name the student who tops a measure
 *                (the biggest climb, the most problems, the best consistency, the most contests).
 *
 * The places stay numerals (an ordinal, "1st") with no medals and no decoration. The layout is in
 * leaderboard.css (.lb-top).
 */

// ---- Champions ---------------------------------------------------------------------------------------------

function Name({ row }) {
  const path = profilePath(row.email);
  const name = row.name || 'Unnamed student';
  return path ? (
    <a href={path} target="_blank" rel="noopener noreferrer">
      {name}
    </a>
  ) : (
    <>{name}</>
  );
}

const metaOf = (row) => [row.department, row.section ? `Section ${row.section}` : null].filter(Boolean).join(' \u00b7 ') || '\u2013';

const PLACE_NAMES = { 1: 'First', 2: 'Second', 3: 'Third' };

/**
 * A hexagon with softly rounded corners, in the units of the box it clips (so it fits any size).
 * The champions' pictures use it through clip-path: url(#lb-hex); the <svg> that defines it is
 * rendered once, inside the Champions section.
 */
const HEX_PATH =
  'M0.411,0.045 Q0.5,0 0.589,0.045 L0.911,0.205 Q1,0.25 1,0.35 L1,0.65 Q1,0.75 0.911,0.795 ' +
  'L0.589,0.955 Q0.5,1 0.411,0.955 L0.089,0.795 Q0,0.75 0,0.65 L0,0.35 Q0,0.25 0.089,0.205 Z';

/** One of the first three places */
function Champion({ tab, row, rank, index }) {
  const info = TABS.find((entry) => entry.key === tab);
  // The card in front is the winner of the list, even when students tie for first
  const place = index + 1;
  const ordinal = ordinalParts(rank);
  const path = profilePath(row.email);
  const otherLabel = tab === 'problems' ? 'Score' : 'Problems';
  const otherValue = tab === 'problems' ? row.totalScore : row.problemsSolved;

  return (
    <article className="lb-champ" data-place={place} aria-label={`${PLACE_NAMES[place]} in the list: ${row.name || 'Unnamed student'}`}>
      <span className="lb-champ__banner" aria-hidden="true" />

      <p className="lb-champ__ordinal" aria-hidden="true">
        {ordinal.number}
        <span className="lb-champ__suffix">{ordinal.suffix}</span>
      </p>

      <div className="lb-champ__top">
        <span className="lb-champ__hex">
          <Avatar name={row.name} picture={row.profilePicture} size={104} />
        </span>
        <div className="lb-champ__pills">
          <span className="lb-champ__score">
            {formatNumber(valueOf(row, tab))}
            <span className="lb-champ__unit">{info.unit}</span>
          </span>
          <ScoreChange change={row.scoreChange} />
        </div>
      </div>

      <div className="lb-champ__who">
        <p className="lb-champ__name">
          <Name row={row} />
        </p>
        <p className="lb-champ__meta">{metaOf(row)}</p>
      </div>

      <dl className="lb-champ__stats">
        <div>
          <dt>{otherLabel}</dt>
          <dd>{formatNumber(otherValue)}</dd>
        </div>
        <div>
          <dt>Contests</dt>
          <dd>{formatNumber(row.contests)}</dd>
        </div>
        <div>
          <dt>Consistency</dt>
          <dd>
            <Consistency index={row.consistencyIndex} />
          </dd>
        </div>
      </dl>

      {path && (
        <a className="lb-champ__profile" href={path} target="_blank" rel="noopener noreferrer">
          Profile
          <span className="lb-sr"> of {row.name || 'this student'}</span>
        </a>
      )}
    </article>
  );
}

/** A large, quiet X behind the cards, one on each side, set in the type of the word "Champions" */
function BigX({ side }) {
  return (
    <span className="lb-champs__x" data-side={side} data-text="X" aria-hidden="true">
      X
    </span>
  );
}

/**
 * The first three places of the list as it is filtered (rows come sorted by the list's figure):
 * the winner in the middle and a little higher, second place on its left and third on its right,
 * over a quiet backdrop of the word "Champions" and two large letter Xs in the same type and colour. The backdrop is decoration
 * (aria-hidden); the heading for screen readers is the h2.
 */
export function Leaders({ tab, rows, ranks }) {
  // The entrance (leaderboard.css) plays when the section first appears; the attribute is dropped a
  // moment after its last step so a later change of students does not play it again
  const [intro, setIntro] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 4300);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="lb-champs" data-intro={intro ? 'true' : 'false'} aria-labelledby="lb-champs-title">
      <svg width="0" height="0" focusable="false" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="lb-hex" clipPathUnits="objectBoundingBox">
            <path d={HEX_PATH} />
          </clipPath>
        </defs>
      </svg>

      <h2 className="lb-sr" id="lb-champs-title">
        Champions
      </h2>
      {/* The stage sizes everything from the width of the section, not of the window */}
      <div className="lb-champs__stage">
        <BigX side="left" />
        <BigX side="right" />

        <span className="lb-champs__mark" data-text="Champions" aria-hidden="true">
          Champions
        </span>

        {rows.length === 0 ? (
          <p className="lb-champs__empty">Nobody matches the filters yet.</p>
        ) : (
          <div className="lb-champs__grid">
            {rows.slice(0, 3).map((row, index) => (
              <Champion key={row._id} tab={tab} row={row} rank={ranks.get(row._id)} index={index} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ---- Highlights ----------------------------------------------------------------------------------------------

const HIGHLIGHTS = [
  { key: 'climb', label: 'Biggest climb in 7 days', icon: TrendUpIcon, figure: (value) => signed(value) },
  { key: 'solved', label: 'Most problems solved', icon: CodeIcon, figure: (value) => formatNumber(value) },
  { key: 'steady', label: 'Most consistent', icon: FireIcon, figure: (value) => String(value), unit: 'of 5' },
  { key: 'contests', label: 'Most contests entered', icon: FlagCheckeredIcon, figure: (value) => formatNumber(value) },
];

export function Highlights({ rows }) {
  const found = highlightsOf(rows);
  const items = HIGHLIGHTS.filter((item) => found[item.key]);
  if (items.length === 0) return null;

  return (
    <section className="lb-highlights" aria-labelledby="lb-highlights-title">
      <h2 className="lb-section-title" id="lb-highlights-title">
        Highlights
      </h2>
      <ul className="lb-highlights__list">
        {items.map((item) => {
          const { row, value, ties } = found[item.key];
          const Icon = item.icon;
          return (
            <li key={item.key} className="lb-highlight">
              <span className="lb-highlight__who">
                <span className="lb-highlight__picture">
                  <Avatar name={row.name} picture={row.profilePicture} size={48} />
                  <span className="lb-highlight__badge">
                    <Icon size={12} weight="fill" aria-hidden="true" />
                  </span>
                </span>
                <span className="lb-highlight__text">
                  <span className="lb-highlight__label">
                    {item.label}
                    {ties > 0 ? ` \u00b7 ${ties} tied` : ''}
                  </span>
                  <span className="lb-highlight__name">
                    <Name row={row} />
                  </span>
                </span>
              </span>
              <span className="lb-highlight__figure">
                {item.figure(value)}
                {item.unit && <span className="lb-highlight__unit">{item.unit}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
