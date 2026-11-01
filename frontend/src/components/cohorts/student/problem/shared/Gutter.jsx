import React from 'react';
import './gutter.css';

/**
 * Gutter: the 8px bar between two panes. It can be dragged with a pointer or moved with the arrow
 * keys, Home and End (it is a separator for assistive technology). Spread the `gutterProps` of
 * useSplit onto it.
 *
 *   axis         'x' for panes side by side, 'y' for panes stacked
 *   gutterProps  from useSplit
 *   onDoubleClick  optional: a quick way to fold the first pane
 */
export default function Gutter({ axis, gutterProps, onDoubleClick }) {
  return (
    <div className="ps-gutter" data-axis={axis} onDoubleClick={onDoubleClick} {...gutterProps}>
      <span className="ps-gutter__handle" />
    </div>
  );
}
