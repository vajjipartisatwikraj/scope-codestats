// Minimal safe DOM builder: strings are always inserted as text (never parsed as HTML),
// so transcripts / justifications coming from the backend cannot inject markup.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset' && typeof v === 'object') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : String(c));
  }
  return el;
}

export const fmt = (n, d = 2) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(d) : '–');
export const pct = (n) => (typeof n === 'number' ? `${(n * 100).toFixed(0)}%` : '–');
export const scoreBand = (s) => (s == null ? 'na' : s >= 0.75 ? 'good' : s >= 0.5 ? 'mid' : 'low');
