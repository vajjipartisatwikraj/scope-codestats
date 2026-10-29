import React, { useId, useState } from 'react';
import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown';

/**
 * Disclosure (DESIGN.md, Cards and tiles; design/screens.md section 19): one accordion item. The
 * header is a real button with aria-expanded and aria-controls, the chevron turns over in 220ms,
 * and the content opens by animating grid-template-rows from 0fr to 1fr, so the content keeps its
 * natural height and nothing is measured in JavaScript. Closed content is visibility: hidden, so
 * it leaves the tab order and the accessibility tree. Reduced motion makes it instant.
 *
 *   title         the header text (a short name; the header is a heading, h3 by default)
 *   description   one muted line under the title
 *   badge         a node beside the title (a Badge or a count)
 *   actions       a node at the right of the header, outside the button (buttons must not nest)
 *   defaultOpen   the starting state when uncontrolled
 *   open          controlled state; pair it with onToggle
 *   onToggle      called with the next state (true when it opens)
 *   variant       'card' (surface, 24px radius; the default, for a stack of items on the canvas) |
 *                 'raised' (raised fill, 18px radius; for an item inside a Card) |
 *                 'plain' (no fill, a hairline below; for a list inside a Card)
 *   level         the heading level of the header, 2 to 6 (default 3)
 *   className     added to the wrapper
 *   children      the content
 *
 * Several Disclosures in a column make an accordion: keep each one's state yourself (controlled)
 * if only one may be open.
 */
export function Disclosure({ title, description, badge, actions, defaultOpen = false, open: openProp, onToggle, variant = 'card', level = 3, className, children }) {
  const [inner, setInner] = useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? Boolean(openProp) : inner;
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-panel`;
  const Heading = `h${Math.min(6, Math.max(2, level))}`;

  const toggle = () => {
    const next = !open;
    if (!controlled) setInner(next);
    if (onToggle) onToggle(next);
  };

  return (
    <section className={className ? `ui-disclosure ${className}` : 'ui-disclosure'} data-variant={variant} data-open={open ? 'true' : 'false'}>
      <div className="ui-disclosure__bar">
        <Heading className="ui-disclosure__heading">
          <button type="button" id={triggerId} className="ui-disclosure__trigger" aria-expanded={open} aria-controls={panelId} onClick={toggle}>
            <span className="ui-disclosure__text">
              <span className="ui-disclosure__title-row">
                <span className="ui-disclosure__title">{title}</span>
                {badge ? <span className="ui-disclosure__badge">{badge}</span> : null}
              </span>
              {description ? <span className="ui-disclosure__description">{description}</span> : null}
            </span>
            <span className="ui-disclosure__chevron" aria-hidden="true">
              <CaretDownIcon size={20} weight="regular" />
            </span>
          </button>
        </Heading>
        {actions ? <div className="ui-disclosure__actions">{actions}</div> : null}
      </div>
      <div id={panelId} className="ui-disclosure__panel" role="region" aria-labelledby={triggerId}>
        <div className="ui-disclosure__clip">
          <div className="ui-disclosure__content">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default Disclosure;
