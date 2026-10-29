import React, { useEffect } from 'react';
import { PlusIcon } from '@phosphor-icons/react/dist/csr/Plus';
import { TrashIcon } from '@phosphor-icons/react/dist/csr/Trash';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { CertificateIcon } from '@phosphor-icons/react/dist/csr/Certificate';
import { CodeIcon } from '@phosphor-icons/react/dist/csr/Code';
import { TrophyIcon } from '@phosphor-icons/react/dist/csr/Trophy';
import { Button, Chip, IconButton, TextField } from '../../ui';
import { TagInput } from '../../custom-components';
import CertificationPicker from './CertificationPicker';
import { ACHIEVEMENT_TYPES, DESCRIPTION_LIMITS, countWords, typeInfo } from '../profileModel';

const ICONS = { project: CodeIcon, internship: BriefcaseIcon, certification: CertificateIcon, achievement: TrophyIcon };

/**
 * One portfolio item: a project, an internship, a certification or an achievement. Only the fields
 * that belong to the chosen kind are shown. The description is a few short points, each held to the
 * same length rules as the server, with a live count so a student sees the limit before it bites.
 *
 *   draft, set, errors   from SectionEditor
 *   locked               the kind cannot be changed (editing an item)
 *   catalog              recognized certificates, or null while loading (certifications only)
 *   loadCatalog()        asks for the catalog; called when a certification is chosen
 */
export default function PortfolioForm({ draft, set, errors, locked = false, catalog, loadCatalog }) {
  const info = typeInfo(draft.type);
  const points = draft.description;
  const pointErrors = errors.points || [];

  useEffect(() => {
    if (draft.type === 'certification') loadCatalog();
  }, [draft.type, loadCatalog]);

  const changePoint = (index, value) => set({ description: points.map((point, position) => (position === index ? value : point)) });
  const removePoint = (index) => set({ description: points.filter((_, position) => position !== index) });

  const pickCertificate = (entry) =>
    set({ title: entry.code ? `${entry.name} (${entry.code})` : entry.name, issuer: entry.issuer, domainLink: entry.domain || draft.domainLink });

  return (
    <div className="pf-portfolio">
      {!locked ? (
        <div className="pf-kinds" role="group" aria-label="What are you adding?">
          {ACHIEVEMENT_TYPES.map((type) => {
            const Icon = ICONS[type.key];
            return (
              <Chip key={type.key} selected={draft.type === type.key} onClick={() => set({ type: type.key })} icon={<Icon size={16} aria-hidden="true" />}>
                {type.single}
              </Chip>
            );
          })}
        </div>
      ) : null}

      <TextField label={info.titleLabel} required value={draft.title} onChange={(event) => set({ title: event.target.value })} error={errors.title} hint={info.titleHint} />

      {draft.type === 'certification' ? <CertificationPicker catalog={catalog} query={draft.title} onPick={pickCertificate} /> : null}

      {draft.type === 'internship' ? (
        <div className="pf-fields">
          <TextField className="pf-fields__wide" label="Your role" value={draft.role} onChange={(event) => set({ role: event.target.value })} placeholder="Backend developer intern" />
          <TextField label="Started" type="date" value={draft.startDate} onChange={(event) => set({ startDate: event.target.value })} />
          <TextField label="Finished" type="date" value={draft.endDate} onChange={(event) => set({ endDate: event.target.value })} error={errors.endDate} hint="Leave empty if it is still going." />
        </div>
      ) : null}

      {draft.type === 'certification' ? (
        <div className="pf-fields">
          <TextField className="pf-fields__wide" label="Issued by" value={draft.issuer} onChange={(event) => set({ issuer: event.target.value })} placeholder="Amazon Web Services" />
          <TextField label="Issued on" type="date" value={draft.issuedDate} onChange={(event) => set({ issuedDate: event.target.value })} />
          <TextField label="Expires on" type="date" value={draft.expiryDate} onChange={(event) => set({ expiryDate: event.target.value })} error={errors.expiryDate} hint="Leave empty if it does not expire." />
        </div>
      ) : null}

      <fieldset className="pf-points">
        <legend className="pf-points__legend">What did you do?</legend>
        <p className="pf-muted">
          Write {DESCRIPTION_LIMITS.minPoints} to {DESCRIPTION_LIMITS.maxPoints} short points. Each one should be {DESCRIPTION_LIMITS.minWords} to {DESCRIPTION_LIMITS.maxWords} words: what you did and what came out of it.
        </p>
        {errors.description ? (
          <p className="pf-points__error" role="alert">
            {errors.description}
          </p>
        ) : null}
        {points.map((point, index) => {
          const words = countWords(point);
          return (
            <div key={index} className="pf-point">
              <TextField
                label={`Point ${index + 1}`}
                multiline
                rows={3}
                value={point}
                onChange={(event) => changePoint(index, event.target.value)}
                error={pointErrors[index] || undefined}
                hint={`${words} of ${DESCRIPTION_LIMITS.maxWords} words, ${point.trim().length} of ${DESCRIPTION_LIMITS.maxChars} characters`}
              />
              <IconButton label={`Remove point ${index + 1}`} size="sm" tone="danger" disabled={points.length <= DESCRIPTION_LIMITS.minPoints} onClick={() => removePoint(index)}>
                <TrashIcon size={18} aria-hidden="true" />
              </IconButton>
            </div>
          );
        })}
        <Button size="sm" startIcon={<PlusIcon size={16} aria-hidden="true" />} disabled={points.length >= DESCRIPTION_LIMITS.maxPoints} onClick={() => set({ description: [...points, ''] })}>
          Add a point
        </Button>
      </fieldset>

      <TagInput label="Tags" value={draft.tags} onChange={(tags) => set({ tags })} placeholder="React, Node.js, MongoDB" hint="Technologies or topics. Press Enter after each one." />

      <div className="pf-fields">
        <TextField
          label="Link"
          inputMode="url"
          autoCapitalize="none"
          value={draft.link}
          onChange={(event) => set({ link: event.target.value })}
          error={errors.link}
          placeholder="https://github.com/you/project"
          hint="Where someone can see it: a repository, a demo or the certificate."
        />
        <TextField
          label="Organization website"
          autoCapitalize="none"
          value={draft.domainLink}
          onChange={(event) => set({ domainLink: event.target.value })}
          placeholder="aws.amazon.com"
          hint="Optional. The website of the company or issuer."
        />
      </div>
    </div>
  );
}
