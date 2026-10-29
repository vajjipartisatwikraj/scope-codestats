import React, { useId } from 'react';
import { Badge } from './Display';
import { Drawer } from './Overlays';

const hasValue = (value) => value !== null && value !== undefined && value !== false && value !== '';

/**
 * DetailPanel: the sliding panel from the right that shows everything about one item of a list
 * (a test, a course, an opportunity, a resume). The list keeps only the few facts that matter in a
 * card or row; pressing it opens this panel with the rest. It is the kit's Drawer with a fixed,
 * ordered layout, so every detail panel of the app looks and behaves alike: it traps focus, closes
 * on Escape, the scrim and the close button, and hands focus back to the item that opened it.
 *
 * From top to bottom, each part is skipped when it is empty:
 *   media      a picture or preview (a node)
 *   badges     status, type, level (a node, usually a few Badges or Chips)
 *   note       one line of context under the badges, such as a countdown (a node)
 *   summary    a short paragraph, in a comfortable measure
 *   figures    up to three numbers with a name under each: [{ label, value }]
 *   facts      label and value rows: [{ label, value }]; a row without a value is left out
 *   sections   titled blocks: [{ key, title, content }]; a block without content is left out
 *   tags       short words: ['Graphs', 'DP']; shown as neutral Badges under `tagsTitle`
 *   children   anything else, at the end
 *
 * Props
 *   open, onClose     as Drawer
 *   title             the item's name (the panel's heading)
 *   subtitle          one line under the title, such as the organiser or the provider
 *   footer            the actions (the main one last, as a primary Button)
 *   width             'md' (480px, default) | 'lg' (640px)
 *   busy              Escape and the scrim do nothing while true
 *   tagsTitle         the heading above the tags ('Tags')
 *   className         added to the content wrapper, for the caller's own classes
 *
 * Example
 *   <DetailPanel
 *     open={Boolean(course)} onClose={close} title={course.title} subtitle={course.instructor}
 *     badges={<Badge tone="success">Beginner</Badge>} summary={course.description}
 *     facts={[{ label: 'Duration', value: course.duration }]} tags={course.topics}
 *     footer={<Button as="a" variant="primary" href={course.courseLink}>View course</Button>}
 *   />
 */
export default function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  footer,
  width = 'md',
  busy = false,
  media,
  badges,
  note,
  summary,
  figures,
  facts,
  sections,
  tags,
  tagsTitle = 'Tags',
  className,
  children,
}) {
  const baseId = useId();
  const shownFigures = (figures || []).filter((figure) => figure && hasValue(figure.value));
  const shownFacts = (facts || []).filter((fact) => fact && hasValue(fact.value));
  const shownSections = (sections || []).filter((section) => section && hasValue(section.content));
  const shownTags = (tags || []).filter(Boolean);

  return (
    <Drawer open={open} onClose={onClose} title={title || ''} description={subtitle} footer={footer} busy={busy} width={width}>
      <div className={className ? `ui-detail ${className}` : 'ui-detail'}>
        {media ? <div className="ui-detail__media">{media}</div> : null}

        {badges || note ? (
          <div className="ui-detail__status">
            {badges ? <div className="ui-detail__badges">{badges}</div> : null}
            {note ? <div className="ui-detail__note">{note}</div> : null}
          </div>
        ) : null}

        {summary ? <p className="ui-detail__summary">{summary}</p> : null}

        {shownFigures.length > 0 ? (
          <dl className="ui-detail__figures" data-count={shownFigures.length}>
            {shownFigures.map((figure) => (
              <div key={figure.label}>
                <dt>{figure.label}</dt>
                <dd>{figure.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {shownFacts.length > 0 ? (
          <dl className="ui-detail__facts">
            {shownFacts.map((fact) => (
              <div key={fact.label} className="ui-detail__fact">
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {shownSections.map((section, index) => {
          const headingId = `${baseId}-section-${section.key || index}`;
          return (
            <section key={section.key || index} className="ui-detail__section" aria-labelledby={headingId}>
              <h3 className="ui-detail__heading" id={headingId}>
                {section.title}
              </h3>
              {section.content}
            </section>
          );
        })}

        {shownTags.length > 0 ? (
          <section className="ui-detail__section" aria-labelledby={`${baseId}-tags`}>
            <h3 className="ui-detail__heading" id={`${baseId}-tags`}>
              {tagsTitle}
            </h3>
            <ul className="ui-detail__tags">
              {shownTags.map((tag, index) => (
                <li key={`${tag}-${index}`}>
                  <Badge tone="neutral">{tag}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {children}
      </div>
    </Drawer>
  );
}
