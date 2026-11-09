import React, { useEffect, useState } from 'react';
import { LightningIcon } from '@phosphor-icons/react/dist/csr/Lightning';
import './shared.css';
import './BatteryIndicator.css';
import { cx } from './chartUtils';

/**
 * BatteryIndicator: the device's battery as a small battery symbol and a percentage, kept up to date as it charges and
 * drains. It reads the browser's Battery Status API, which Chrome, Edge and Opera have; where the browser has none
 * (Safari, Firefox) the component draws nothing instead of a made-up level.
 *
 * It never carries meaning by colour alone: the percentage is always printed, a bolt shows that it is charging, and the
 * whole thing is a polite live region ("Battery 18 percent, low"). Low (20% or less and not charging) turns it red.
 *
 * Props
 *   className, style   passed to the root element
 *
 * CSS variables: --bi-fill --bi-text
 */

/** { level (0..1), charging } for the device, or null when the browser cannot tell */
function useBattery() {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (typeof navigator === 'undefined' || typeof navigator.getBattery !== 'function') return undefined;
    let alive = true;
    let battery = null;
    const events = ['levelchange', 'chargingchange'];
    const update = () => {
      if (alive && battery) setState({ level: battery.level, charging: battery.charging });
    };
    navigator
      .getBattery()
      .then((found) => {
        if (!alive) return;
        battery = found;
        update();
        events.forEach((name) => battery.addEventListener(name, update));
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (battery) events.forEach((name) => battery.removeEventListener(name, update));
    };
  }, []);

  return state;
}

export default function BatteryIndicator({ className, style }) {
  const battery = useBattery();
  if (!battery) return null;

  const level = Math.min(1, Math.max(0, battery.level));
  const percent = Math.round(level * 100);
  const low = percent <= 20 && !battery.charging;
  const spoken = `Battery ${percent} percent${battery.charging ? ', charging' : low ? ', low' : ''}`;

  return (
    <span className={cx('cc bi', className)} style={style} data-low={low ? 'true' : 'false'} data-charging={battery.charging ? 'true' : 'false'} role="status" aria-label={spoken}>
      <svg className="bi__icon" viewBox="0 0 28 14" aria-hidden="true" focusable="false">
        <rect className="bi__body" x="0.75" y="0.75" width="23.5" height="12.5" rx="3.5" />
        <rect className="bi__fill" x="2.75" y="2.75" width={Math.max(1.5, 19.5 * level)} height="8.5" rx="1.75" />
        <path className="bi__cap" d="M26.5 4.75v4.5" />
      </svg>
      <span className="bi__text" aria-hidden="true">
        {percent}%
        {battery.charging ? <LightningIcon className="bi__bolt" size={12} weight="fill" /> : null}
      </span>
    </span>
  );
}