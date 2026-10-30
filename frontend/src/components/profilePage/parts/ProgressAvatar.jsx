import React from 'react';
import { Avatar } from '../../ui';
import { AnimatedNumber, Gauge } from '../../custom-components';

/**
 * The student's picture inside a ring that fills as the profile gets complete (the custom Gauge as a
 * closed arc: it sweeps in when the page opens and glides when the percentage changes), with the percentage in a small pill under it that counts up. The ring sits on a disc of the card's
 * own colour, so it reads the same over the blue band and over the card. The ring, the pill and the
 * spoken value all say the same thing, so it never depends on colour alone.
 *
 *   name, src   as Avatar
 *   percent     0 to 100
 *   size (124)  the diameter of the ring in px
 */
export default function ProgressAvatar({ name, src, percent, size = 124 }) {
  const stroke = Math.max(5, Math.round(size * 0.05));
  const gap = 6;
  const picture = size - (stroke + gap) * 2;
  const complete = percent >= 100;

  return (
    <div className="pf-ring" style={{ '--pf-ring': `${size}px` }}>
      <Gauge
        variant="arc"
        sweep={360}
        rotation={180}
        size={size}
        thickness={Math.round(((stroke * 200) / size) * 10) / 10}
        min={0}
        max={100}
        value={percent}
        glide
        label="Profile completion"
        valueDescription={`${percent} percent complete`}
        colors={{ fill: complete ? 'var(--ds-success)' : 'var(--ds-accent)', track: 'var(--ds-high)' }}
        style={{ width: size }}
      >
        <Avatar name={name} src={src} size={picture} />
      </Gauge>
      <span className="pf-ring__pill" data-complete={complete ? 'true' : 'false'}>
        <AnimatedNumber value={percent} duration={1200} delay={300} suffix="%" /><span className="ui-sr"> complete</span>
      </span>
    </div>
  );
}
