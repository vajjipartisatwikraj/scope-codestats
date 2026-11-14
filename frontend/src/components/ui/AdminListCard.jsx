import React, { Children } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { DotsThreeVerticalIcon } from '@phosphor-icons/react/dist/csr/DotsThreeVertical';
import Button, { IconButton } from './Button';
import { Skeleton } from './Feedback';
import { Card } from './Layout';
import { Menu } from './Menu';
import './adminListCard.css';

/**
 * AdminListCard (DESIGN.md, "Admin list content"; design/screens.md section 16): one item of an admin
 * list as a card. A status badge at the top left and the three-dot menu at the top right, the title,
 * up to two lines of description, the figure that matters in a numeral style, a few one-line facts with
 * a small icon, and a foot with the Manage button that opens the item's own page.
 *
 *   badge             a node, usually a Badge: the state in a word
 *   menuLabel         the accessible name of the menu ("Actions for CRT")
 *   menuItems         the items of the Menu (Edit, Delete ...)
 *   menuDisabled      true while an action runs: the menu cannot be opened
 *   title, description
 *   emptyDescription  what to show when there is no description ("No description")
 *   figure            { value, unit }: the number that leads ("120", "roll numbers")
 *   facts             [{ key, icon, text }]
 *   manageTo          the path of the item's page (the foot's Manage button)
 *   manageLabel       the accessible name of the button ("Manage CRT")
 *   action            a node for the foot instead of the Manage button, for an item with no page of its own
 */
export default function AdminListCard({ badge, menuLabel, menuItems, menuDisabled = false, title, description, emptyDescription = 'No description', figure, facts = [], manageTo, manageLabel, action }) {
  return (
    <Card as="article" className="alc">
      <div className="alc-top">
        {badge || <span />}
        <Menu
          className="alc-menu"
          label={menuLabel}
          align="end"
          fixed
          trigger={({ props }) => (
            <IconButton {...props} label={menuLabel} size="sm" tone="plain" disabled={menuDisabled}>
              <DotsThreeVerticalIcon size={20} weight="bold" aria-hidden="true" />
            </IconButton>
          )}
          items={menuItems}
        />
      </div>

      <h3 className="alc-title">{title}</h3>
      <p className="alc-description" data-empty={description ? 'false' : 'true'}>
        {description || emptyDescription}
      </p>

      <p className="alc-figure">
        <span className="alc-number">{figure.value}</span>
        <span className="alc-unit">{figure.unit}</span>
      </p>

      <ul className="alc-facts">
        {facts.map((fact) => (
          <li key={fact.key}>
            {fact.icon}
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>

      <div className="alc-foot">
        {action || (
          <Button as={Link} to={manageTo} size="sm" variant="secondary" endIcon={<ArrowRightIcon size={16} weight="bold" aria-hidden="true" />} aria-label={manageLabel}>
            Manage
          </Button>
        )}
      </div>
    </Card>
  );
}

/** A card-shaped placeholder while the items load */
export function AdminListCardSkeleton() {
  return (
    <Card as="div" className="alc" aria-hidden="true">
      <Skeleton width={96} height={24} radius="var(--ds-radius-pill)" />
      <Skeleton width="60%" height={22} />
      <Skeleton width="85%" height={16} />
      <Skeleton width="40%" height={36} />
      <Skeleton width="70%" height={16} />
      <Skeleton width={96} height={36} radius="var(--ds-radius-pill)" />
    </Card>
  );
}

/**
 * AdminCardGrid: the grid the cards sit in (1 column below 600px, 2 from 600px, 3 from 1000px, 4 from
 * 1360px). Every child is one card in its own list item, and the cards of a row share one height.
 *
 *   label     the accessible name of the list
 */
export function AdminCardGrid({ label, children }) {
  return (
    <ul className="ui-grid alc-grid" aria-label={label}>
      {Children.map(children, (child) => (
        <li className="alc-grid__item">{child}</li>
      ))}
    </ul>
  );
}
