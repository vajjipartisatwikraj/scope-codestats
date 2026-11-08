import React, { useEffect, useId, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import './RocketLaunch.css';

/**
 * RocketLaunch: a rocket lifts off from the foot of whatever it is placed in, with a real cloud of smoke.
 * It fills its parent (the parent needs `position: relative` or another positioned box) and never takes
 * a click, so it can sit over anything: a card, a whole screen, a result panel.
 *
 *   - the rocket is a shaded SVG, sized from the height of the space (or by `rocketHeight`), centred by
 *     default, and shakes on the pad before it climbs
 *   - the smoke is a particle simulation on a canvas: a bank of cloud rolls out sideways and billows up
 *     around the base at ignition, and the exhaust leaves a column hanging behind the rocket as it
 *     climbs. Each cloud is a soft, lit sprite, so it has volume, and clouds near the engine glow orange
 *   - a launch is one play: it ends when the smoke has thinned out, and says so
 *
 * Props
 *   play (false)          true starts a launch; false stops it and clears the space. To launch again,
 *                         set it to false and then to true.
 *   x (0.5)               where the rocket stands across the width: 0 is the left edge, 1 the right
 *   rocketHeight          height of the rocket in px. The default is 46% of the space, between 120 and 320
 *   holdMs (900)          how long the engine runs on the pad before it lifts
 *   climbMs (2200)        how long it takes to clear the top of the space
 *   smoke (1)             how much smoke: 0.5 is a light puff, 1.5 buries the screen
 *   smokeColor            [r, g, b] of the smoke (default a pale grey-white)
 *   onPhase(name)         'ignite' (engine lit) | 'liftoff' | 'thin' (the smoke is mostly gone: show the
 *                         result now) | 'clear' (nothing is left)
 *   onDone()              called once, together with 'clear'
 *   className, style      passed to the root element
 *
 * With reduced motion nothing is drawn: 'thin', 'clear' and onDone are reported at once.
 *
 * CSS variables: --rl-accent (the nose and fins; default --ds-accent) and --rl-hull, --rl-steel,
 * --rl-glass; the derived light and dark shades follow the accent.
 */

// ─── The rocket's drawing, in its own units (the flame is part of the picture) ───────────────

const VB_W = 120;
const VB_H = 400;
const BODY_H = 262; // the nozzle ends here; the flame hangs below it
const NOZZLE_X = 60;

function RocketSvg({ uid }) {
  const id = (name) => `${uid}-${name}`;
  const ref = (name) => `url(#${id(name)})`;
  return (
    <svg className="rl-svg" viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" height="100%" focusable="false" overflow="visible">
      <defs>
        <linearGradient id={id('hull')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#aeb6d0" />
          <stop offset="0.2" stopColor="#e6eaf6" />
          <stop offset="0.4" stopColor="#ffffff" />
          <stop offset="0.65" stopColor="#dde2f1" />
          <stop offset="0.88" stopColor="#a1aac6" />
          <stop offset="1" stopColor="#7e88a8" />
        </linearGradient>
        <linearGradient id={id('nose')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--rl-accent-dark)' }} />
          <stop offset="0.28" style={{ stopColor: 'var(--rl-accent)' }} />
          <stop offset="0.44" style={{ stopColor: 'var(--rl-accent-light)' }} />
          <stop offset="0.72" style={{ stopColor: 'var(--rl-accent)' }} />
          <stop offset="1" style={{ stopColor: 'var(--rl-accent-dark)' }} />
        </linearGradient>
        <linearGradient id={id('finL')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--rl-accent-dark)' }} />
          <stop offset="1" style={{ stopColor: 'var(--rl-accent-light)' }} />
        </linearGradient>
        <linearGradient id={id('finR')} x1="1" y1="0" x2="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--rl-accent-dark)' }} />
          <stop offset="1" style={{ stopColor: 'var(--rl-accent-light)' }} />
        </linearGradient>
        <linearGradient id={id('steel')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#23283d" />
          <stop offset="0.42" stopColor="#8993b1" />
          <stop offset="0.6" stopColor="#4a5270" />
          <stop offset="1" stopColor="#1c2033" />
        </linearGradient>
        <linearGradient id={id('ring')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f9ff" />
          <stop offset="1" stopColor="#6e7898" />
        </linearGradient>
        <radialGradient id={id('glass')} cx="0.34" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#c9efff" />
          <stop offset="0.42" stopColor="#3f94e6" />
          <stop offset="1" stopColor="#0b2c63" />
        </radialGradient>
        <radialGradient id={id('bell')} cx="0.5" cy="0.9" r="0.7">
          <stop offset="0" stopColor="#ffd9a0" />
          <stop offset="0.5" stopColor="#ff9a3c" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ff6a2a" stopOpacity="0" />
        </radialGradient>

        <linearGradient id={id('fireOuter')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff8a2a" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#ff4d1f" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ff3b1f" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('fireMid')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36a" />
          <stop offset="0.5" stopColor="#ff9a3c" stopOpacity="0.92" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('fireCore')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.5" stopColor="#fff0b8" stopOpacity="0.92" />
          <stop offset="1" stopColor="#ffe08a" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('fireGlow')} cx="0.5" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#ff9a3c" stopOpacity="0.6" />
          <stop offset="1" stopColor="#ff7a2a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* The flame, drawn first so the rocket sits over its root. --rl-fire is how lit it is (0 to 1.3). */}
      <g className="rl-fire" style={{ transformOrigin: `${NOZZLE_X}px ${BODY_H}px` }}>
        <ellipse cx="60" cy="316" rx="52" ry="86" fill={ref('fireGlow')} />
        <g className="rl-flicker rl-flicker--a">
          <path d="M43 258 C38 296 47 346 60 398 C73 346 82 296 77 258 Z" fill={ref('fireOuter')} />
        </g>
        <g className="rl-flicker rl-flicker--b">
          <path d="M48 258 C46 290 52 326 60 366 C68 326 74 290 72 258 Z" fill={ref('fireMid')} />
        </g>
        <g className="rl-flicker rl-flicker--c">
          <path d="M53 258 C52 278 55 300 60 326 C65 300 68 278 67 258 Z" fill={ref('fireCore')} />
        </g>
        <ellipse cx="60" cy="292" rx="6.5" ry="5" fill="#ffffff" opacity="0.55" />
        <ellipse cx="60" cy="314" rx="5" ry="4" fill="#ffffff" opacity="0.4" />
        <ellipse cx="60" cy="334" rx="3.6" ry="3" fill="#ffffff" opacity="0.28" />
      </g>

      {/* Fins (behind the hull) */}
      <path d="M38 148 L13 212 L13 234 L38 214 Z" fill={ref('finL')} />
      <path d="M13 212 L38 150" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="1" fill="none" />
      <path d="M82 148 L107 212 L107 234 L82 214 Z" fill={ref('finR')} />
      <path d="M107 212 L82 150" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="1" fill="none" />

      {/* Engine section and bell */}
      <path d="M42 210 H78 L74 238 H46 Z" fill={ref('steel')} />
      <path d="M46 238 H74 L82 262 H38 Z" fill={ref('steel')} />
      <path d="M46 238 H74 L82 262 H38 Z" fill={ref('bell')} />
      <path d="M38 262 H82" stroke="#0d1020" strokeWidth="1.4" />

      {/* Hull */}
      <path d="M38 76 H82 V212 H38 Z" fill={ref('hull')} />
      {/* Nose */}
      <path d="M60 2 C71 22 82 50 82 78 L38 78 C38 50 49 22 60 2 Z" fill={ref('nose')} />
      <path d="M60 2 C66 14 71 26 74 38" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Seams and bands */}
      <path d="M38 78 H82" stroke="#0d1020" strokeOpacity="0.28" strokeWidth="1" />
      <rect x="38" y="104" width="44" height="7" fill={ref('nose')} />
      <rect x="38" y="190" width="44" height="7" fill={ref('nose')} />
      <path d="M38 152 H82" stroke="#0d1020" strokeOpacity="0.16" strokeWidth="1" />
      <path d="M38 212 H82" stroke="#0d1020" strokeOpacity="0.3" strokeWidth="1.2" />
      <path d="M76 82 V208" stroke="#ffffff" strokeOpacity="0.0" />
      {/* Porthole */}
      <circle cx="60" cy="130" r="13.5" fill={ref('ring')} />
      <circle cx="60" cy="130" r="10.5" fill={ref('glass')} />
      <ellipse cx="55.5" cy="125.5" rx="4.6" ry="3" fill="#ffffff" opacity="0.7" transform="rotate(-28 55.5 125.5)" />
      {/* Panel rivets */}
      {[92, 168, 176].map((y) => (
        <g key={y} fill="#0d1020" fillOpacity="0.22">
          <circle cx="43" cy={y} r="0.9" />
          <circle cx="77" cy={y} r="0.9" />
        </g>
      ))}
    </svg>
  );
}

// ─── Smoke: soft lit cloud sprites, built once ──────────────────────────────────────────────

const SPRITE = 192;
const spriteCache = new Map();

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Six cloud shapes: many overlapping soft lobes, lit from above and shaded underneath, soft at the edge */
function buildSprites(rgb) {
  const key = rgb.join(',');
  if (spriteCache.has(key)) return spriteCache.get(key);

  const sprites = [];
  for (let n = 0; n < 6; n += 1) {
    const rnd = mulberry32(4100 + n * 97);
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE;
    canvas.height = SPRITE;
    const g = canvas.getContext('2d');

    const lobes = 16 + Math.floor(rnd() * 8);
    for (let i = 0; i < lobes; i += 1) {
      const angle = rnd() * Math.PI * 2;
      const distance = Math.pow(rnd(), 0.75) * SPRITE * 0.27;
      const cx = SPRITE / 2 + Math.cos(angle) * distance;
      const cy = SPRITE / 2 + Math.sin(angle) * distance * 0.85;
      const radius = SPRITE * (0.1 + rnd() * 0.17);
      const fill = g.createRadialGradient(cx, cy, 0, cx, cy, radius);
      fill.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.6)`);
      fill.addColorStop(0.5, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.3)`);
      fill.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
      g.fillStyle = fill;
      g.beginPath();
      g.arc(cx, cy, radius, 0, Math.PI * 2);
      g.fill();
    }

    // Volume: light from above, shadow underneath
    g.globalCompositeOperation = 'source-atop';
    const shade = g.createLinearGradient(SPRITE * 0.15, 0, SPRITE * 0.55, SPRITE);
    shade.addColorStop(0, 'rgba(255,255,255,0.42)');
    shade.addColorStop(0.5, 'rgba(255,255,255,0)');
    shade.addColorStop(1, 'rgba(46,54,82,0.6)');
    g.fillStyle = shade;
    g.fillRect(0, 0, SPRITE, SPRITE);

    // Nothing reaches the edge of the sprite, so no square ever shows
    g.globalCompositeOperation = 'destination-in';
    const edge = g.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
    edge.addColorStop(0, 'rgba(0,0,0,1)');
    edge.addColorStop(0.6, 'rgba(0,0,0,1)');
    edge.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = edge;
    g.fillRect(0, 0, SPRITE, SPRITE);

    sprites.push(canvas);
  }

  // The orange light of the engine on young smoke
  const glow = document.createElement('canvas');
  glow.width = 96;
  glow.height = 96;
  const gg = glow.getContext('2d');
  const warm = gg.createRadialGradient(48, 48, 0, 48, 48, 48);
  warm.addColorStop(0, 'rgba(255,190,100,0.95)');
  warm.addColorStop(0.45, 'rgba(255,130,50,0.45)');
  warm.addColorStop(1, 'rgba(255,100,30,0)');
  gg.fillStyle = warm;
  gg.fillRect(0, 0, 96, 96);

  const built = { sprites, glow };
  spriteCache.set(key, built);
  return built;
}

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const smooth = (t) => t * t * (3 - 2 * t);
const MAX_PARTICLES = 460;

// ─── The component ──────────────────────────────────────────────────────────────────────────

export default function RocketLaunch({
  play = false,
  x = 0.5,
  rocketHeight,
  holdMs = 900,
  climbMs = 2200,
  smoke = 1,
  smokeColor = [228, 233, 245],
  onPhase,
  onDone,
  className,
  style,
}) {
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const rootRef = useRef(null);
  const backRef = useRef(null);
  const frontRef = useRef(null);
  const rocketRef = useRef(null);
  const fireRef = useRef(null);

  // The latest props, read by the running launch without restarting it
  const live = useRef({});
  live.current = { x, rocketHeight, holdMs, climbMs, smoke, smokeColor, onPhase, onDone };

  useEffect(() => {
    const root = rootRef.current;
    const rocket = rocketRef.current;
    const fireEl = fireRef.current;
    const backCanvas = backRef.current;
    const frontCanvas = frontRef.current;
    const back = backCanvas.getContext('2d');
    const front = frontCanvas.getContext('2d');

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      const box = root.getBoundingClientRect();
      W = box.width || 600;
      H = box.height || 440;
      [backCanvas, frontCanvas].forEach((canvas) => {
        canvas.width = Math.max(1, Math.round(W * dpr));
        canvas.height = Math.max(1, Math.round(H * dpr));
      });
    };
    const clearAll = () => {
      [back, front].forEach((ctx, i) => {
        const canvas = i === 0 ? backCanvas : frontCanvas;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    };
    const hide = () => {
      rocket.style.visibility = 'hidden';
      clearAll();
    };

    if (!play) {
      hide();
      return undefined;
    }

    const say = (name) => {
      const current = live.current;
      if (current.onPhase) current.onPhase(name);
    };

    if (reduced) {
      const timer = window.setTimeout(() => {
        say('thin');
        say('clear');
        if (live.current.onDone) live.current.onDone();
      }, 0);
      return () => window.clearTimeout(timer);
    }

    resize();
    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(root);

    const cfg = live.current;
    const u = H / 440; // one unit scales every size and speed with the height of the space
    const R = cfg.rocketHeight || clamp(H * 0.46, 120, 320);
    const k = R / BODY_H;
    const amount = clamp(cfg.smoke, 0.2, 2);
    const { sprites, glow } = buildSprites(cfg.smokeColor);

    rocket.style.width = `${VB_W * k}px`;
    rocket.style.height = `${VB_H * k}px`;
    rocket.style.transformOrigin = `${NOZZLE_X * k}px ${(BODY_H / 2) * k}px`;

    const hold = cfg.holdMs;
    const climb = cfg.climbMs;
    const baseY = H * 0.86; // the nozzle on the pad
    const groundY = baseY + 8 * u;
    const flameDepth = (VB_H - BODY_H) * k;
    const travel = baseY + flameDepth + 14; // until even the flame has left the top
    const cx = () => W * live.current.x;

    let particles = [];
    let raf = 0;
    let last = 0;
    let t = 0;
    let emitGround = 0;
    let emitTrail = 0;
    let burstDone = false;
    let lifted = false;
    let ignited = false;
    let exited = false;
    let thin = false;
    let cleared = false;
    let peak = 0;
    let prevLift = 0;

    const spawn = (extra) => {
      if (particles.length >= MAX_PARTICLES) particles.shift();
      particles.push({
        age: 0,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.6,
        sprite: sprites[(Math.random() * sprites.length) | 0],
        ...extra,
      });
    };

    // The cloud at the pad: rolls out sideways, rises, and some of it passes in front of the rocket
    const spawnGround = (n) => {
      for (let i = 0; i < n; i += 1) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const spread = Math.pow(Math.random(), 0.6);
        const climbing = Math.random() > 0.68;
        spawn({
          layer: Math.random() < 0.42 ? 1 : 0,
          x: cx() + side * spread * W * 0.07,
          y: groundY - Math.random() * 10 * u,
          vx: side * (40 + Math.random() * 230) * u * (0.45 + spread),
          vy: -(8 + Math.random() * (climbing ? 210 : 60)) * u,
          drag: 1.15,
          buoy: -34 * u,
          size0: (46 + Math.random() * 64) * u * Math.sqrt(amount),
          grow: (70 + Math.random() * 80) * u,
          life: 2.2 + Math.random() * 1.2,
          a0: 0.5 + Math.random() * 0.3,
        });
      }
    };

    // The column the exhaust leaves behind: puffs placed where the nozzle was, left hanging in the air
    const spawnTrail = (n, nozzleY, dx) => {
      for (let i = 0; i < n; i += 1) {
        spawn({
          layer: 0,
          x: cx() + dx + (Math.random() - 0.5) * 12 * k,
          y: nozzleY + (4 + Math.random() * 22) * k,
          vx: (Math.random() - 0.5) * 44 * u,
          vy: (10 + Math.random() * 70) * u,
          drag: 1.6,
          buoy: -10 * u,
          size0: (20 + Math.random() * 18) * u + R * 0.05,
          grow: (40 + Math.random() * 60) * u * Math.sqrt(amount),
          life: 1.7 + Math.random() * 0.9,
          a0: 0.45 + Math.random() * 0.25,
        });
      }
    };

    const drawLayer = (ctx, layer) => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W * dpr, H * dpr);
      const alive = particles.filter((p) => p.layer === layer);

      // The light of the engine on young smoke, under the smoke itself
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < alive.length; i += 1) {
        const p = alive[i];
        if (p.age >= 0.6) continue;
        const s = p.size * 0.95;
        ctx.globalAlpha = p.alpha * (1 - p.age / 0.6) * 0.6;
        ctx.setTransform(dpr, 0, 0, dpr, dpr * p.x, dpr * p.y);
        ctx.drawImage(glow, -s / 2, -s / 2, s, s);
      }
      ctx.globalCompositeOperation = 'source-over';

      for (let i = 0; i < alive.length; i += 1) {
        const p = alive[i];
        const cos = Math.cos(p.rot) * dpr;
        const sin = Math.sin(p.rot) * dpr;
        ctx.globalAlpha = p.alpha;
        ctx.setTransform(cos, sin, -sin, cos, dpr * p.x, dpr * p.y);
        ctx.drawImage(p.sprite, -p.size / 2, -p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now) => {
      if (!last) last = now;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt * 1000;

      // — The rocket —
      const s = clamp((t - hold) / climb, 0, 1);
      const lift = travel * Math.pow(s, 2.3);
      const speed = dt > 0 ? (lift - prevLift) / dt : 0;
      prevLift = lift;
      const nozzleY = baseY - lift;
      const rumble = (t < hold ? Math.min(1, t / 350) : Math.max(0, 1 - (t - hold) / 800)) * 0.9 * u;
      const dx = (Math.sin(t * 0.09) + Math.sin(t * 0.23)) * rumble + Math.sin(t * 0.004) * 1.4 * u * s;
      const tilt = Math.sin(t * 0.003) * 0.7 * s;

      if (!exited && nozzleY < -flameDepth) {
        exited = true;
        rocket.style.visibility = 'hidden';
      }
      if (!exited) {
        rocket.style.visibility = 'visible';
        rocket.style.transform = `translate3d(${cx() - NOZZLE_X * k + dx}px, ${nozzleY - BODY_H * k}px, 0) rotate(${tilt}deg)`;
        const burn = clamp(t / 550, 0, 1) * (1 + 0.28 * s);
        fireEl.style.setProperty('--rl-fire', burn.toFixed(3));
      }

      if (!ignited) {
        ignited = true;
        say('ignite');
      }
      if (!lifted && t >= hold) {
        lifted = true;
        say('liftoff');
      }

      // — Smoke: the cloud at the pad, and the column behind the climbing rocket —
      if (!burstDone && t > hold * 0.15) {
        burstDone = true;
        spawnGround(Math.round(26 * amount));
      }
      if (t > hold * 0.15 && t < hold + 1300) {
        emitGround += dt * 95 * amount;
        const n = Math.floor(emitGround);
        emitGround -= n;
        if (n) spawnGround(n);
      }
      if (!exited && s > 0) {
        emitTrail += dt * (60 + Math.min(110, speed / 14)) * amount;
        const n = Math.floor(emitTrail);
        emitTrail -= n;
        if (n) spawnTrail(n, nozzleY, dx);
      }

      // — Move and age every cloud —
      let coverage = 0;
      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const p = particles[i];
        p.age += dt;
        if (p.age >= p.life) {
          particles.splice(i, 1);
          continue;
        }
        p.vx *= Math.exp(-p.drag * dt);
        p.vy = (p.vy + p.buoy * dt) * Math.exp(-0.55 * dt);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        p.size = p.size0 + (p.grow * (1 - Math.exp(-p.age * 1.1))) / 1.1;
        p.alpha = p.a0 * smooth(clamp(p.age / 0.14, 0, 1)) * Math.pow(1 - p.age / p.life, 1.5);
        coverage += p.alpha * p.size * p.size * 0.7;
      }
      coverage /= Math.max(1, W * H);
      peak = Math.max(peak, coverage);

      // — Draw: behind the rocket, then (for part of the cloud) in front of it —
      const engineGlow = exited ? 0 : clamp(t / 550, 0, 1) * 0.34;
      drawLayer(back, 0);
      if (engineGlow > 0) {
        back.globalCompositeOperation = 'lighter';
        back.globalAlpha = engineGlow;
        back.setTransform(dpr, 0, 0, dpr, dpr * (cx() + dx), dpr * (nozzleY + 20 * u));
        const gr = H * 0.55;
        back.drawImage(glow, -gr, -gr, gr * 2, gr * 2);
        back.globalCompositeOperation = 'source-over';
        back.globalAlpha = 1;
      }
      drawLayer(front, 1);

      // — The end: when the smoke has gone —
      if (exited) {
        if (!thin && peak > 0 && coverage < peak * 0.4) {
          thin = true;
          say('thin');
        }
        if (!cleared && (particles.length === 0 || coverage < peak * 0.06)) {
          cleared = true;
          if (!thin) say('thin');
          say('clear');
          if (live.current.onDone) live.current.onDone();
          hide();
          return;
        }
      }
      if (t > hold + climb + 9000) {
        // Safety: never run for ever
        cleared = true;
        say('clear');
        if (live.current.onDone) live.current.onDone();
        hide();
        return;
      }
      raf = window.requestAnimationFrame(frame);
    };

    raf = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      hide();
    };
  }, [play, reduced]);

  return (
    <div ref={rootRef} className={className ? `rl ${className}` : 'rl'} style={style} aria-hidden="true">
      <canvas ref={backRef} className="rl-canvas rl-canvas--back" />
      <div ref={rocketRef} className="rl-rocket">
        <div ref={fireRef} className="rl-rocket__art">
          <RocketSvg uid={uid} />
        </div>
      </div>
      <canvas ref={frontRef} className="rl-canvas rl-canvas--front" />
    </div>
  );
}
