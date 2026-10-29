import React, { useMemo, useState } from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { CertificateIcon } from '@phosphor-icons/react/dist/csr/Certificate';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { SealCheckIcon } from '@phosphor-icons/react/dist/csr/SealCheck';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { Badge, Button, Card, DetailPanel, EmptyState, OrgLogo, PillTabs, logoDomainOf } from '../ui';
import { normalizeDescriptionPoints } from '../../utils/descriptionPoints';
import { ACHIEVEMENT_TYPES, monthYear, organizationOf, rangeOf, safeUrl } from './profileModel';

const ICONS = { project: CodeIcon, internship: BriefcaseIcon, certification: CertificateIcon, achievement: TrophyIcon };
const HUES = { project: 'blue', internship: 'teal', certification: 'violet', achievement: 'amber' };

const keyOf = (achievement, index) => achievement._id || `${achievement.type}-${index}`;

/** The icon of a kind on a tonal circle: the kind is told by the icon and by the tab it sits under */
function TypeMark({ type }) {
  const Icon = ICONS[type] || TrophyIcon;
  return (
    <span className="pp-mark" style={{ '--pp-hue': `var(--ds-series-${HUES[type] || 'blue'})` }} aria-hidden="true">
      <Icon size={22} weight="regular" />
    </span>
  );
}

/** Where an entry's logo comes from: the website given, else (for certificates and internships) the one in the link */
const logoOf = (achievement) => logoDomainOf(achievement, { fromLink: achievement.type === 'certification' || achievement.type === 'internship' });

/** One entry, with only what identifies it. The whole card is a button that opens the detail panel. */
function AchievementItem({ achievement, onOpen }) {
  const organization = organizationOf(achievement);
  const when = rangeOf(achievement.startDate, achievement.endDate) || monthYear(achievement.issuedDate);

  return (
    <button type="button" className="pp-item" onClick={onOpen} aria-haspopup="dialog">
      {logoOf(achievement) ? <OrgLogo domain={logoOf(achievement)} name={achievement.issuer || achievement.title} size={44} /> : <TypeMark type={achievement.type} />}
      <span className="pp-item__text">
        <span className="pp-item__title">{achievement.title}</span>
        {organization ? <span className="pp-item__meta">{organization}</span> : null}
        {when ? <span className="pp-item__meta">{when}</span> : null}
      </span>
      {achievement.recognized ? (
        <Badge tone="success" icon={<SealCheckIcon size={14} weight="fill" aria-hidden="true" />}>
          Recognized
        </Badge>
      ) : null}
    </button>
  );
}

/** Everything about one entry, in the app's DetailPanel */
function AchievementDetails({ achievement, onClose }) {
  const href = achievement ? safeUrl(achievement.link) : null;
  const points = achievement ? normalizeDescriptionPoints(achievement.description) : [];
  const type = achievement ? ACHIEVEMENT_TYPES.find((entry) => entry.key === achievement.type) : null;

  return (
    <DetailPanel
      open={Boolean(achievement)}
      onClose={onClose}
      title={achievement?.title}
      subtitle={achievement ? organizationOf(achievement) : undefined}
      media={achievement && logoOf(achievement) ? <OrgLogo domain={logoOf(achievement)} name={achievement.issuer || achievement.title} size={64} /> : null}
      badges={
        achievement ? (
          <>
            <Badge tone="info">{type ? type.single : 'Entry'}</Badge>
            {achievement.recognized ? (
              <Badge tone="success" icon={<SealCheckIcon size={14} weight="fill" aria-hidden="true" />}>
                Recognized
              </Badge>
            ) : null}
          </>
        ) : null
      }
      facts={
        achievement
          ? [
              { label: 'Role', value: achievement.role },
              { label: 'Issued by', value: achievement.issuer },
              { label: 'Organization', value: achievement.domainLink },
              { label: 'Duration', value: rangeOf(achievement.startDate, achievement.endDate) },
              { label: 'Issued', value: monthYear(achievement.issuedDate) },
              { label: 'Expires', value: monthYear(achievement.expiryDate) },
            ]
          : []
      }
      sections={[
        {
          key: 'highlights',
          title: 'Highlights',
          content:
            points.length > 0 ? (
              <ul className="ui-detail__list">
                {points.map((point, index) => (
                  <li key={`${index}-${point.slice(0, 12)}`}>{point}</li>
                ))}
              </ul>
            ) : null,
        },
      ]}
      tags={achievement && Array.isArray(achievement.tags) ? achievement.tags : []}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {href ? (
            <Button as="a" variant="primary" href={href} target="_blank" rel="noopener noreferrer" endIcon={<ArrowUpRightIcon size={18} aria-hidden="true" />}>
              Open link<span className="ui-sr"> (opens in a new tab)</span>
            </Button>
          ) : null}
        </>
      }
    />
  );
}

/**
 * Projects, internships, certifications and achievements, one tab each with its count. A tab lists
 * the entries as compact cards; pressing one opens everything about it in the detail panel.
 *
 *   achievements   the list from the profile
 */
export default function AchievementsCard({ achievements }) {
  const list = useMemo(() => (Array.isArray(achievements) ? achievements : []), [achievements]);
  const counts = useMemo(() => {
    const result = {};
    ACHIEVEMENT_TYPES.forEach((type) => {
      result[type.key] = list.filter((entry) => entry.type === type.key).length;
    });
    return result;
  }, [list]);

  const firstFilled = ACHIEVEMENT_TYPES.find((type) => counts[type.key] > 0);
  const [tab, setTab] = useState(firstFilled ? firstFilled.key : ACHIEVEMENT_TYPES[0].key);
  const [openId, setOpenId] = useState(null);

  if (list.length === 0) return null;

  const entries = list.map((entry, index) => ({ entry, id: keyOf(entry, index) })).filter(({ entry }) => entry.type === tab);
  const opened = list.map((entry, index) => ({ entry, id: keyOf(entry, index) })).find(({ id }) => id === openId);
  const tabInfo = ACHIEVEMENT_TYPES.find((type) => type.key === tab);

  return (
    <Card
      className="pp-card"
      title="Work and achievements"
      description={`${list.length} ${list.length === 1 ? 'entry' : 'entries'} this student has shared`}
      actions={
        <PillTabs
          size="sm"
          label="Kind of entry"
          idPrefix="pp-ach"
          items={ACHIEVEMENT_TYPES.map((type) => ({ key: type.key, label: `${type.label} ${counts[type.key]}` }))}
          value={tab}
          onChange={setTab}
        />
      }
    >
      <div role="tabpanel" id={`pp-ach-panel-${tab}`} aria-labelledby={`pp-ach-tab-${tab}`}>
        {entries.length > 0 ? (
          <ul className="pp-items">
            {entries.map(({ entry, id }) => (
              <li key={id}>
                <AchievementItem achievement={entry} onOpen={() => setOpenId(id)} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={<TypeMark type={tab} />} title={tabInfo.empty} text="Nothing has been added under this tab." />
        )}
      </div>

      <AchievementDetails achievement={opened ? opened.entry : null} onClose={() => setOpenId(null)} />
    </Card>
  );
}
