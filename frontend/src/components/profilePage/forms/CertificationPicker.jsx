import React, { useMemo } from 'react';
import { SealCheckIcon } from '@phosphor-icons/react/dist/csr/SealCheck';
import { Badge, OrgLogo } from '../../ui';

const MAX_SUGGESTIONS = 5;

const normalize = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/**
 * Under the certificate name: the recognized certificates that match what is typed. Choosing one
 * fills in the name, who issued it and their website in one press. When the name already matches
 * one, it says so instead ("Recognized"). The server makes the final call on whether a certificate is
 * recognized, by matching the same list.
 *
 *   catalog   [{ name, issuer, domain, code }] or null while it loads
 *   query     the name typed so far
 *   onPick(entry)
 */
export default function CertificationPicker({ catalog, query, onPick }) {
  const { matches, exact } = useMemo(() => {
    const list = Array.isArray(catalog) ? catalog : [];
    const needle = normalize(query);
    if (!needle) return { matches: list.slice(0, MAX_SUGGESTIONS), exact: null };
    const found = list.find((entry) => needle.includes(normalize(entry.name)) || (entry.code && needle.includes(normalize(entry.code))));
    const filtered = list.filter((entry) => normalize(entry.name).includes(needle) || normalize(entry.issuer).includes(needle) || (entry.code && normalize(entry.code).includes(needle)));
    return { matches: filtered.slice(0, MAX_SUGGESTIONS), exact: found || null };
  }, [catalog, query]);

  if (catalog === null) return <p className="pf-muted">{'Loading recognized certificates\u2026'}</p>;

  if (exact) {
    return (
      <p className="pf-recognized">
        <OrgLogo domain={exact.domain} name={exact.issuer} size={28} />
        <Badge tone="success" icon={<SealCheckIcon size={14} weight="fill" aria-hidden="true" />}>
          Recognized
        </Badge>
        <span>{exact.issuer} certificates like this one are marked as recognized on your profile.</span>
      </p>
    );
  }

  if (matches.length === 0) return null;

  return (
    <div className="pf-picker">
      <p className="pf-picker__title">{query.trim() ? 'Matching recognized certificates' : 'Popular recognized certificates'}</p>
      <ul className="pf-picker__list">
        {matches.map((entry) => (
          <li key={`${entry.issuer}-${entry.name}`}>
            <button type="button" className="pf-picker__item" onClick={() => onPick(entry)}>
              <OrgLogo domain={entry.domain} name={entry.issuer} size={36} />
              <span className="pf-picker__text">
                <span className="pf-picker__name">{entry.name}</span>
                <span className="pf-picker__meta">
                  {entry.issuer}
                  {entry.code ? ` \u00b7 ${entry.code}` : ''}
                </span>
              </span>
              <SealCheckIcon size={18} weight="regular" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
