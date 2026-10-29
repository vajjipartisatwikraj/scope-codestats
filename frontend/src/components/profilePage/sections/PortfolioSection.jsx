import React, { useMemo, useState } from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { CertificateIcon } from '@phosphor-icons/react/dist/csr/Certificate';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { SealCheckIcon } from '@phosphor-icons/react/dist/csr/SealCheck';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { Badge, Button, Card, EmptyState, IconButton, OrgLogo, PillTabs, logoDomainOf } from '../../ui';
import { ACHIEVEMENT_TYPES, MAX_ITEMS_PER_TYPE, monthYear, rangeText, typeInfo } from '../profileModel';
import { safeUrl } from '../../publicProfile/profileModel';
import { withProtocol } from '../profileModel';

const ICONS = { project: CodeIcon, internship: BriefcaseIcon, certification: CertificateIcon, achievement: TrophyIcon };
const HUES = { project: 'blue', internship: 'teal', certification: 'violet', achievement: 'amber' };

const EMPTY = {
  project: ['Add your first project', 'Show something you built. A repository link and a few points about what it does are enough.'],
  internship: ['Add an internship', 'Say where you worked, your role and what you delivered.'],
  certification: ['Add a certification', 'Recognized certificates from AWS, Google, Microsoft and others are marked on your profile.'],
  achievement: ['Add an achievement', 'Hackathon wins, ranks, scholarships and other things you are proud of.'],
};

/** The date line of an entry: when it ran, or when it was issued */
function whenOf(item) {
  if (item.type === 'certification') {
    const parts = [item.issuedDate ? `Issued ${monthYear(item.issuedDate)}` : '', item.expiryDate ? `Expires ${monthYear(item.expiryDate)}` : ''];
    return parts.filter(Boolean).join(' \u00b7 ');
  }
  return rangeText(item.startDate, item.endDate);
}

/**
 * The portfolio: projects, internships, certifications and achievements, one tab each with its count.
 * Projects and internships are limited to five each, and the count says how many are left.
 *
 *   achievements   the list from the server (newest first)
 *   onAdd(type)    opens the editor for a new item of that kind
 *   onEdit(item)   opens the editor for an item
 *   onDelete(item) asks to delete (the screen confirms)
 */
export default function PortfolioSection({ achievements, onAdd, onEdit, onDelete }) {
  const counts = useMemo(() => Object.fromEntries(ACHIEVEMENT_TYPES.map((type) => [type.key, achievements.filter((item) => item.type === type.key).length])), [achievements]);
  const [tab, setTab] = useState(ACHIEVEMENT_TYPES.find((type) => counts[type.key] > 0)?.key || 'project');
  const info = typeInfo(tab);
  const items = achievements.filter((item) => item.type === tab);
  const full = info.limited && counts[tab] >= MAX_ITEMS_PER_TYPE;

  return (
    <Card
      as="section"
      id="pf-portfolio"
      className="pf-card"
      title="Portfolio"
      description="What you have built, earned and done."
      actions={
        <Button size="sm" startIcon={<PlusIcon size={16} aria-hidden="true" />} onClick={() => onAdd(tab)} disabled={full}>
          Add {info.single.toLowerCase()}
        </Button>
      }
    >
      <div className="pf-portfolio-tabs">
        <PillTabs
          size="sm"
          label="Kind of item"
          idPrefix="pf-ach"
          items={ACHIEVEMENT_TYPES.map((type) => ({ key: type.key, label: `${type.label} ${counts[type.key]}${type.limited ? `/${MAX_ITEMS_PER_TYPE}` : ''}` }))}
          value={tab}
          onChange={setTab}
        />
      </div>

      {full ? <p className="pf-muted">You have {MAX_ITEMS_PER_TYPE} {info.label.toLowerCase()}, the most you can show. Delete one to add another.</p> : null}

      <div role="tabpanel" id={`pf-ach-panel-${tab}`} aria-labelledby={`pf-ach-tab-${tab}`}>
        {items.length === 0 ? (
          <EmptyState
            compact
            icon={React.createElement(ICONS[tab], { size: 28, 'aria-hidden': true })}
            title={EMPTY[tab][0]}
            text={EMPTY[tab][1]}
            action={
              <Button startIcon={<PlusIcon size={18} aria-hidden="true" />} onClick={() => onAdd(tab)}>
                Add {info.single.toLowerCase()}
              </Button>
            }
          />
        ) : (
          <ul className="pf-rows">
            {items.map((item) => {
              const Icon = ICONS[item.type] || TrophyIcon;
              const href = item.link ? safeUrl(withProtocol(item.link)) : null;
              const subtitle = item.role || item.issuer || item.domainLink || '';
              const when = whenOf(item);
              // Certificates and internships take their logo from the issuer's or company's website
              const logo = logoDomainOf(item, { fromLink: item.type === 'certification' || item.type === 'internship' });
              return (
                <li key={item._id} className="pf-row pf-row--item">
                  {logo ? (
                    <OrgLogo domain={logo} name={item.issuer || item.title} size={44} />
                  ) : (
                    <span className="pf-mark" style={{ '--pf-hue': `var(--ds-series-${HUES[item.type] || 'blue'})` }} aria-hidden="true">
                      <Icon size={22} />
                    </span>
                  )}
                  <div className="pf-row__main">
                    <p className="pf-row__title">{item.title}</p>
                    {subtitle ? <p className="pf-row__meta">{subtitle}</p> : null}
                    {when ? <p className="pf-row__meta">{when}</p> : null}
                  </div>
                  {item.recognized ? (
                    <Badge tone="success" icon={<SealCheckIcon size={14} weight="fill" aria-hidden="true" />}>
                      Recognized
                    </Badge>
                  ) : null}
                  <div className="pf-row__actions">
                    {href ? (
                      <IconButton href={href} target="_blank" rel="noopener noreferrer" size="sm" label={`Open ${item.title} (opens in a new tab)`}>
                        <ArrowUpRightIcon size={18} aria-hidden="true" />
                      </IconButton>
                    ) : null}
                    <IconButton size="sm" label={`Edit ${item.title}`} onClick={() => onEdit(item)}>
                      <PencilSimpleIcon size={18} aria-hidden="true" />
                    </IconButton>
                    <IconButton size="sm" tone="danger" label={`Delete ${item.title}`} onClick={() => onDelete(item)}>
                      <TrashIcon size={18} aria-hidden="true" />
                    </IconButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Card>
  );
}
