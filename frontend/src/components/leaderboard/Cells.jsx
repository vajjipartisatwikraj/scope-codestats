import React, { useState } from 'react';
import { ArrowDownIcon } from '@phosphor-icons/react/dist/csr/ArrowDown';
import { ArrowUpIcon } from '@phosphor-icons/react/dist/csr/ArrowUp';
import { MinusIcon } from '@phosphor-icons/react/dist/csr/Minus';
import Hint from './Hint';
import { initialsOf, profileImageUrl, signed } from './leaderboardFormat';
import { consistencyHint } from './leaderboardModel';

/**
 * The small pieces a row is made of, shared by the table, the phone list, the sheet and the bar:
 * the picture of a student, the rank, the consistency pips and the change in score.
 */

const TONES = ['blue', 'teal', 'amber', 'violet', 'coral', 'green', 'sky'];

/** A picture, or the initials on a tone of the data series when there is none (or it will not load) */
export function Avatar({ name, picture, size = 40 }) {
  const [failed, setFailed] = useState(false);
  const url = profileImageUrl(picture);

  let hash = 0;
  String(name || '').split('').forEach((letter) => {
    hash = (hash * 31 + letter.charCodeAt(0)) % 997;
  });
  const tone = TONES[hash % TONES.length];

  return (
    <span className="lb-avatar" style={{ '--lb-size': `${size}px`, '--lb-tone': `var(--ds-series-${tone})` }} aria-hidden="true">
      {url && !failed ? (
        <img src={url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <span className="lb-avatar__initials">{initialsOf(name)}</span>
      )}
    </span>
  );
}

/**
 * The rank. The first three are numerals in tonal circles (accent-soft, raised, high), with no
 * medals; everyone else is a plain numeral. `circle` makes every rank a circle of the same size so a
 * column of them lines up.
 */
export function RankMark({ rank }) {
  const place = typeof rank === 'number' && rank >= 1 && rank <= 3 ? rank : 0;
  return (
    <span className="lb-rank" data-place={place || undefined}>
      <span className="lb-sr">Rank </span>
      {typeof rank === 'number' ? rank : '\u2013'}
    </span>
  );
}

/** Five pips, as many filled as the consistency index (0 to 5), and the number beside them */
export function Consistency({ index = 0 }) {
  const level = Math.max(0, Math.min(5, Math.round(index || 0)));
  return (
    <Hint text={consistencyHint(level)}>
      <span className="lb-pips" role="img" aria-label={`Consistency ${level} out of 5. ${consistencyHint(level)}.`}>
        <span className="lb-pips__row" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((pip) => (
            <span key={pip} className="lb-pip" data-on={pip <= level ? 'true' : 'false'} />
          ))}
        </span>
        <span className="lb-pips__number" aria-hidden="true">
          {level}
        </span>
      </span>
    </Hint>
  );
}

/** The change in total score over the last 7 days: an arrow, a sign and a number, never colour alone */
export function ScoreChange({ change = 0, compact = false }) {
  const value = Math.round((Number(change) || 0) * 100) / 100;
  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  return (
    <Hint text={trend === 'flat' ? 'No change in the last 7 days' : `Score change over the last 7 days: ${signed(value)}`}>
      <span className="lb-change" data-trend={trend} data-compact={compact ? 'true' : 'false'}>
        {trend === 'up' && <ArrowUpIcon size={12} weight="bold" aria-hidden="true" />}
        {trend === 'down' && <ArrowDownIcon size={12} weight="bold" aria-hidden="true" />}
        {trend === 'flat' && <MinusIcon size={12} weight="bold" aria-hidden="true" />}
        <span>{trend === 'flat' ? '0' : signed(value)}</span>
        <span className="lb-sr"> points in the last 7 days</span>
      </span>
    </Hint>
  );
}

/** "You" next to the signed-in student's name */
export function YouBadge() {
  return <span className="lb-you">You</span>;
}

