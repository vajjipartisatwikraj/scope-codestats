import React from 'react';
import { BuildingsIcon } from '@phosphor-icons/react/dist/csr/Buildings';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { FireIcon } from '@phosphor-icons/react/dist/csr/Fire';
import { MinusIcon } from '@phosphor-icons/react/dist/csr/Minus';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { Badge, formatNumber, pluralize } from '../ui';
import { AnimatedNumber, Gauge, PieChart, ScoreRing } from '../custom-components';
import { difficultyTotals, platformsOf } from './profileModel';

/** A change with a sign, an arrow and a word, never colour alone: "+120 this week" */
function Change({ value, suffix }) {
  if (!Number.isFinite(value) || value === 0) {
    return (
      <Badge icon={<MinusIcon size={14} weight="bold" aria-hidden="true" />}>
        No change{suffix ? ` ${suffix}` : ''}
      </Badge>
    );
  }
  const up = value > 0;
  const Icon = up ? CaretUpIcon : CaretDownIcon;
  return (
    <Badge tone={up ? 'success' : 'danger'} icon={<Icon size={14} weight="fill" aria-hidden="true" />}>
      <span className="ui-sr">{up ? 'Up ' : 'Down '}</span>
      {up ? '+' : '\u2212'}
      {formatNumber(Math.abs(value))}
      {suffix ? ` ${suffix}` : ''}
    </Badge>
  );
}

/** "Top 8%" from the share of students this one is ahead of; at least 1 */
const topShare = (percentile) => Math.max(1, Math.round(100 - (Number(percentile) || 0)));

/**
 * One of the four tiles: the label with a tonal icon, a body for the figure and its picture, and a
 * line of context at the foot. Tiles in a row share a height, so the foot always lines up.
 */
function Tile({ label, icon, children, foot }) {
  return (
    <div className="ui-stat pp-tile" data-tone="plain" data-size="l">
      <div className="ui-stat__head">
        <p className="ui-stat__label">{label}</p>
        <span className="ui-stat__icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      {children}
      {foot ? <div className="ui-stat__context">{foot}</div> : null}
    </div>
  );
}

/** A rank as a numeral beside a ring that shows how many of the others it is ahead of */
function RankTile({ label, icon, rank, of, ahead, foot, unit }) {
  return (
    <Tile label={label} icon={icon} foot={foot}>
      <div className="pp-tile__main">
        <div className="pp-tile__figure">
          <p className="ui-stat__value">
            <AnimatedNumber value={rank} prefix="#" />
          </p>
          <p className="pp-tile__sub">{of > 0 ? `of ${formatNumber(of)} ${unit}` : 'Ranked'}</p>
        </div>
        {of > 1 ? (
          <div className="pp-tile__visual">
            <ScoreRing value={ahead} size={96} caption="% ahead" label={`Ahead of ${ahead}% of ${unit}`} />
          </div>
        ) : null}
      </div>
    </Tile>
  );
}

const MIX = [
  { key: 'easy', label: 'Easy', color: 'var(--ds-series-green)' },
  { key: 'medium', label: 'Medium', color: 'var(--ds-series-amber)' },
  { key: 'hard', label: 'Hard', color: 'var(--ds-series-coral)' },
];

/** The college rank, the department rank, the problems solved and the consistency dial */
export function StatTiles({ profile }) {
  const rank = profile.rankingInfo || {};
  const platforms = platformsOf(profile.codingProfiles);
  const levels = difficultyTotals(platforms);
  const slices = MIX.map((part) => ({ ...part, value: levels[part.key] }));
  const hasLevels = slices.some((slice) => slice.value > 0);
  const consistency = Math.min(5, Math.max(0, Number(profile.consistencyIndex) || 0));
  const hasOverall = typeof rank.overallRank === 'number';
  const hasDepartment = typeof rank.departmentRank === 'number';
  const overallAhead = hasOverall && rank.totalUsers > 1 ? Math.round(((rank.totalUsers - rank.overallRank) / (rank.totalUsers - 1)) * 100) : 0;
  const departmentAhead =
    hasDepartment && rank.departmentUsers > 1 ? Math.round(((rank.departmentUsers - rank.departmentRank) / (rank.departmentUsers - 1)) * 100) : 0;

  return (
    <div className="pp-tiles">
      {hasOverall ? (
        <RankTile
          label="College rank"
          icon={<TrophyIcon size={20} weight="regular" />}
          rank={rank.overallRank}
          of={rank.totalUsers}
          ahead={overallAhead}
          unit="students"
          foot={
            <>
              {rank.percentile > 0 ? <Badge tone="info">Top {topShare(rank.percentile)}%</Badge> : null}
              {rank.rankChange ? <Change value={rank.rankChange} suffix={Math.abs(rank.rankChange) === 1 ? 'place' : 'places'} /> : null}
              {!rank.percentile && !rank.rankChange ? <span>Among all ranked students</span> : null}
            </>
          }
        />
      ) : (
        <Tile label="College rank" icon={<TrophyIcon size={20} weight="regular" />} foot={<span>Appears after the next ranking run</span>}>
          <p className="ui-stat__value">Not ranked</p>
        </Tile>
      )}

      {hasDepartment ? (
        <RankTile
          label="Department rank"
          icon={<BuildingsIcon size={20} weight="regular" />}
          rank={rank.departmentRank}
          of={rank.departmentUsers}
          ahead={departmentAhead}
          unit={`in ${profile.department || 'the department'}`}
          foot={
            <>
              {profile.department ? <Badge tone="info">{profile.department}</Badge> : null}
              {rank.departmentRankChange ? <Change value={rank.departmentRankChange} suffix={Math.abs(rank.departmentRankChange) === 1 ? 'place' : 'places'} /> : null}
            </>
          }
        />
      ) : null}

      <Tile
        label="Problems solved"
        icon={<CodeIcon size={20} weight="regular" />}
        foot={<span>{platforms.length > 0 ? `Across ${pluralize(platforms.length, 'platform')}` : 'No platform linked yet'}</span>}
      >
        <div className="pp-tile__main">
          <div className="pp-tile__figure">
            <p className="ui-stat__value">
              <AnimatedNumber value={profile.totalProblemsSolved || 0} />
            </p>
            {hasLevels ? (
              <ul className="pp-mix" aria-label="Problems by difficulty">
                {slices.map((slice) => (
                  <li key={slice.key}>
                    <span className="pp-mix__dot" style={{ backgroundColor: slice.color }} aria-hidden="true" />
                    {slice.label} <strong>{formatNumber(slice.value)}</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {hasLevels ? (
            <div className="pp-tile__visual">
            <PieChart
              className="pp-tile__donut"
              data={slices}
              getKey={(slice) => slice.key}
              getLabel={(slice) => slice.label}
              getValue={(slice) => slice.value}
              getColor={(slice) => slice.color}
              legend="none"
              size={96}
              donut={0.62}
              title="Problems solved by difficulty"
            >
              {() => null}
            </PieChart>
            </div>
          ) : null}
        </div>
      </Tile>

      <Tile label="Consistency" icon={<FireIcon size={20} weight="regular" />} foot={<span>Active days in the last week</span>}>
        <div className="pp-dial__gauge">
          <Gauge
            value={consistency}
            min={0}
            max={5}
            ticks={30}
            tickLength={20}
            tickWidth={4.6}
            size={136}
            label="Consistency index"
            valueDescription={`${consistency} out of 5, from how many of the last 7 days had activity`}
            colors={{ fill: 'var(--ds-accent)', track: 'var(--ds-high)', text: 'var(--ds-text)' }}
          >
            {({ text }) => (
              <>
                <span className="pp-dial__value">{text}</span>
                <span className="pp-dial__unit">out of 5</span>
              </>
            )}
          </Gauge>
        </div>
      </Tile>
    </div>
  );
}
