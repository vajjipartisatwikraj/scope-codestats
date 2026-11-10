import React from 'react';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import { IconButton, Menu } from '../../ui';

/**
 * The small pieces the three views of the bank library share.
 */

export const LIBRARY_PATH = '/admin/bank-library';

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
