import React, { useEffect, useState } from 'react';
import { daylight } from '../../theme/tokens';
import { Avatar } from './Display';

/**
 * The logo token for img.logo.dev. It is a publishable key (it is meant to be used in the browser).
 * Set VITE_LOGO_DEV_TOKEN to use your own.
 */
const LOGO_TOKEN = import.meta.env.VITE_LOGO_DEV_TOKEN || 'pk_RBjC8X-kSE2wrzZ-kFI4-g';

const HOST = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;

/** "https://www.aws.amazon.com/certification" -> "aws.amazon.com"; '' when it is not a website */
export function cleanDomain(value) {
  const host = String(value || '')
    .trim()
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#\s]/)[0];
  return HOST.test(host) ? host.toLowerCase() : '';
}

/** The website to take a logo from: the one the student gave, else the one in their link */
export function logoDomainOf(item, { fromLink = true } = {}) {
  const given = cleanDomain(item && item.domainLink);
  if (given || !fromLink) return given;
  return cleanDomain(item && item.link);
}

/**
 * OrgLogo: the logo of an organization (a company, a certificate issuer) from its website. It sits on
 * a light tile in both themes, because logos are drawn for a light background. When there is no
 * website, or the logo does not load, it falls back to the organization's initials, so the space is
 * never empty and never broken.
 *
 *   domain   the organization's website ("aws.amazon.com"); a full link is fine
 *   name     the organization's name, for the initials
 *   size     px (default 40)
 */
export function OrgLogo({ domain, name, size = 40, className }) {
  const host = cleanDomain(domain);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [host]);

  if (!host || failed) return <Avatar name={name || host} size={size} className={className} />;

  return (
    <span className={className ? `ui-org-logo ${className}` : 'ui-org-logo'} style={{ '--ui-size': `${size}px`, backgroundColor: daylight.surface }} aria-hidden="true">
      <img src={`https://img.logo.dev/${host}?token=${LOGO_TOKEN}&size=${Math.min(256, size * 3)}`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
    </span>
  );
}

export default OrgLogo;
