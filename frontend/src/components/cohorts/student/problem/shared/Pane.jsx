import React from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { IconButton } from '../../../../ui';
import './pane.css';

/**
 * Pane: one panel of the problem screen (design/screens.md section 9): a flat surface with an 18px
 * radius, a 48px header over a hairline, and a body. The header has a lead (a title, tabs or a
 * select) at the left and actions at the right.
 *
 *   lead        the node at the left of the header
 *   actions     the node at the right of the header
 *   folded      only the header shows. The body stays mounted (hidden), so an editor keeps its state.
 *   label       the accessible name of the pane
 *   flush       the body has no padding or scrolling of its own (it holds an editor or a split)
 *   children    the body
 *   ...rest     passed to the section (ref, data-*, className)
 */
const Pane = React.forwardRef(function Pane({ lead, actions, folded = false, label, flush = false, className, children, ...rest }, ref) {
  return (
    <section ref={ref} className={className ? `ps-pane ${className}` : 'ps-pane'} aria-label={label} data-folded={folded ? 'true' : 'false'} {...rest}>
      <header className="ps-pane__header">
        <div className="ps-pane__lead">{lead}</div>
        {actions ? <div className="ps-pane__actions">{actions}</div> : null}
      </header>
      <div className="ps-pane__body" data-flush={flush ? 'true' : 'false'} hidden={folded}>
        {children}
      </div>
    </section>
  );
});

export default Pane;

/**
 * FoldButton: the chevron at the end of a pane's header that folds the pane to its header (or, for
 * a side pane, to a narrow strip). The chevron turns over when the pane is folded.
 *
 *   folded      the pane is folded now
 *   onToggle    folds or unfolds
 *   name        what folds, in the label ("test cases", "description")
 *   axis        'y' for a pane that folds up and down, 'x' for one that folds to the left
 */
export function FoldButton({ folded, onToggle, name, axis = 'y' }) {
  const Icon = axis === 'x' ? CaretLeftIcon : CaretDownIcon;
  return (
    <IconButton label={`${folded ? 'Unfold' : 'Fold'} ${name}`} size="sm" tone="plain" onClick={onToggle} aria-expanded={!folded}>
      <span className="ps-fold" data-folded={folded ? 'true' : 'false'} data-axis={axis}>
        <Icon size={20} weight="regular" aria-hidden="true" />
      </span>
    </IconButton>
  );
}
