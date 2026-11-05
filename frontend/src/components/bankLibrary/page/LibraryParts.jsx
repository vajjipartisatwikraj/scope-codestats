import React from 'react';
import { Link } from 'react-router-dom';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { IconButton, Menu } from '../../ui';
import useStuck from '../../../hooks/useStuck';

/**
 * The small pieces the three views of the bank library share.
 */

export const LIBRARY_PATH = '/admin/bank-library';

// The fixed navbar covers the top 64px of the window (Navbar.css)
const NAVBAR_HEIGHT = 64;

/**
 * LibraryTop: the part of a page that stays in place while the list scrolls: where you are, the
 * heading with its actions, and the search and filters. It sticks right under the navbar and has a
 * hairline under it once the list has scrolled beneath it.
 *
 * It only works because App.jsx makes the shell exactly as tall as the window on this route, which
 * turns <main> into the scroller (the same trick as the cohort list, see cohorts.css).
 */
export function LibraryTop({ children }) {
  const [marker, stuck] = useStuck(NAVBAR_HEIGHT);
  return (
    <>
      <div ref={marker} className="bl-marker" aria-hidden="true" />
      <div className="bl-top" data-stuck={stuck ? 'true' : 'false'}>
        {children}
      </div>
    </>
  );
}

/**
 * Where you are: Bank library, then the bank, then the topic. Each step before the last is a link.
 *
 *   steps   [{ label, to }]; the last step has no `to` and is the current page
 */
export function Crumbs({ steps }) {
  return (
    <nav className="bl-crumbs" aria-label="Breadcrumb">
      <ol>
        {steps.map((step, index) => (
          <li key={step.label}>
            {step.to ? (
              <Link to={step.to}>{step.label}</Link>
            ) : (
              <span aria-current="page">{step.label}</span>
            )}
            {index < steps.length - 1 ? (
              <span className="bl-crumbs__sep" aria-hidden="true">
                /
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * RowMenu: the three-dot menu at the end of a row.
 *
 *   label   names the menu for assistive technology ("Actions for Arrays")
 *   items   as ui/Menu
 */
export function RowMenu({ label, items }) {
  return (
    <Menu
      label={label}
      align="end"
      fixed
      items={items}
      trigger={({ props }) => (
        <IconButton label={label} size="sm" tone="plain" {...props}>
          <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
        </IconButton>
      )}
    />
  );
}

/**
 * LibraryRow: one bank, topic or question in a list. The text is a button that opens it; badges and
 * the menu sit at the end and wrap under the text on a narrow screen.
 *
 *   title, description, meta   the name, one muted line, a caption
 *   badges      a node
 *   menu        a node (RowMenu)
 *   onOpen      pressing the text; omit for a row that does not open anything
 *   openLabel   the accessible name of that button
 */
export function LibraryRow({ title, description, meta, badges, menu, onOpen, openLabel }) {
  const text = (
    <>
      <span className="bl-row__title">{title}</span>
      {description ? <span className="bl-row__desc">{description}</span> : null}
      {meta ? <span className="bl-row__meta">{meta}</span> : null}
    </>
  );
  return (
    <li className="bl-row">
      {onOpen ? (
        <button type="button" className="bl-row__main" onClick={onOpen} aria-label={openLabel}>
          {text}
        </button>
      ) : (
        <div className="bl-row__main" data-static="true">
          {text}
        </div>
      )}
      <div className="bl-row__side">
        {badges}
        {menu}
      </div>
    </li>
  );
}
