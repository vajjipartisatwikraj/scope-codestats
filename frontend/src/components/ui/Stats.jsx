import React from 'react';
import { formatNumber } from './format';

/**
 * StatTile (DESIGN.md, Cards and tiles, "Stat tile"): a label in Body small, a numeral, and one
 * line of context. A figure without context is not a stat, so `context` is the line to fill:
 * a change Badge, "of 125 students", "Updated 5 min ago". No sparkline.
 *
 *   label     what the figure counts ("Problems solved")
 *   value     the figure: a number (formatted with Indian digit grouping) or a string ("82%")
 *   context   a node: one line under the figure
 *   tone      'plain' (surface, the default) | 'spotlight' (the inverted tile) | 'accent' (the accent
 *             tile). At most one spotlight or accent tile per screen: that is the caller's job.
 *   size      'l' (Numeral L, 2.5rem; the default, steps down to Numeral M below 600px) |
 *             'm' (Numeral M, 1.75rem; for a row of five or six, or a tile inside a card)
 *   icon      a node (Phosphor icon, 20px) shown at the right of the label in a tonal circle
 *   as        the element ('div' by default)
 *   className added to the tile
 *
 * Numerals are tabular, so figures that are compared line up. Lay tiles out with StatGrid.
 */
export function StatTile({ label, value, context, tone = 'plain', size = 'l', icon, as: Component = 'div', className }) {
  const shown = typeof value === 'number' ? formatNumber(value) : value;
  return (
    <Component className={className ? `ui-stat ${className}` : 'ui-stat'} data-tone={tone} data-size={size}>
      <div className="ui-stat__head">
        <p className="ui-stat__label">{label}</p>
        {icon ? (
          <span className="ui-stat__icon" aria-hidden="true">
            {icon}
          </span>
        ) : null}
      </div>
      <p className="ui-stat__value">{shown}</p>
      {context ? <div className="ui-stat__context">{context}</div> : null}
    </Component>
  );
}

/**
 * StatGrid: the row of StatTiles. Two tiles per row below 1200px, four per row from 1200px; the
 * gap is the page gap. It is the component form of the `.ui-stats` class, so plain markup can use
 * the class directly.
 *
 *   columns   4 (the default) | 3: how many per row from 1200px
 *   label     optional accessible name: the grid becomes a labelled group
 *   children  the tiles
 */
export function StatGrid({ columns = 4, label, className, children }) {
  return (
    <div className={className ? `ui-stats ${className}` : 'ui-stats'} data-cols={columns === 3 ? '3' : '4'} role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  );
}

export default StatTile;
