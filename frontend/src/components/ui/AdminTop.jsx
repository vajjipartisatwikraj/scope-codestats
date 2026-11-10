import React from 'react';
import { Link } from 'react-router-dom';
import useStuck from '../../hooks/useStuck';
import { PageHeader } from './Layout';

// The fixed navbar covers the top 64px of the window (Navbar.css)
const NAVBAR_HEIGHT = 64;

/**
 * AdminTop: the fixed top of every admin screen (DESIGN.md, Layout, "The admin top"; design/screens.md
 * section 16). Two rows that stay in place while the list under them scrolls:
 *
 *   1. the heading: title with a count beside it, a one-line tagline under it, and the primary
 *      action (Create ...) at the right;
 *   2. one line of controls: the search at the left, the filter dropdowns (or tabs) at the right,
 *      with the space between them.
 *
 * A screen fills the slots and adds nothing of its own, so every admin screen has the same top.
 *
 *   crumbs        optional path above the heading, instead of a back button, on a screen opened from a
 *                 list: [{ label, to }] with the last one (the current page) having no `to`. It reads
 *                 "/ User groups / Virtusa list": every step before the last is a link.
 *   title         the h1
 *   count         optional text beside the title ("13 cohorts")
 *   description   the tagline (hidden below 600px to give the list the height)
 *   actions       the primary action; a Button
 *   search        a SearchField (left of the controls row; 420px at most)
 *   filters       the dropdowns or tabs: SelectField variant="pill", PillTabs ... They sit at the right end
 *                 of the row when there is a search, and at the left when there is none (monitoring).
 *   filtersAlign  'auto' (the default) | 'end': always the right end, for a screen whose search comes and
 *                 goes between tabs (cohort management) and must not make the tabs jump
 *   label         names the controls row for assistive technology
 *
 * It sticks right under the navbar and has a hairline under it once the list has scrolled beneath
 * it. That only works when <main> is the scroller: App.jsx makes the shell exactly as tall as the
 * window on the route (isFixedTopPage) and leaves out the footer. Put it first inside <Page>.
 */
export function AdminTop({ crumbs, title, count, description, actions, search, filters, filtersAlign = 'auto', label = 'Search and filters' }) {
  const [marker, stuck] = useStuck(NAVBAR_HEIGHT);
  const hasControls = Boolean(search || filters);

  return (
    <>
      <div ref={marker} className="ui-admintop-marker" aria-hidden="true" />
      <div className="ui-admintop" data-stuck={stuck ? 'true' : 'false'}>
        {crumbs && crumbs.length > 0 ? (
          <nav className="ui-admintop__crumbs" aria-label="Breadcrumb">
            <ol>
              {crumbs.map((crumb, index) => (
                <li key={`${index}-${crumb.label}`}>
                  <span className="ui-admintop__sep" aria-hidden="true">
                    /
                  </span>
                  {crumb.to ? (
                    <Link to={crumb.to}>{crumb.label}</Link>
                  ) : (
                    <span className="ui-admintop__here" aria-current="page">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}
        <PageHeader title={title} count={count} description={description} actions={actions} />
        {hasControls ? (
          <div className="ui-admintop__bar" role="search" aria-label={label}>
            {search ? <div className="ui-admintop__search">{search}</div> : null}
            {filters ? (
              <div className="ui-admintop__filters" data-end={search || filtersAlign === 'end' ? 'true' : 'false'}>
                {filters}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </>
  );
}

export default AdminTop;
