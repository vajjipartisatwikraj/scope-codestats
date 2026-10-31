import React, { useEffect, useRef, useState } from 'react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { EyeIcon } from '@phosphor-icons/react/dist/csr/Eye';
import { LockSimpleIcon } from '@phosphor-icons/react/dist/csr/LockSimple';
import { Button, Card } from '../../ui';
import { usernameOfEmail } from '../profileModel';

const PUBLIC = ['Your name, department, section and year', 'Your score, rank and platform stats', 'Your skills, interests and education', 'Your portfolio, LinkedIn and resume'];
const PRIVATE = ['Your college email', 'Your mobile number'];

/**
 * Says plainly who can see what, because people fill in more when they know where it goes. Also the
 * place to copy the public link.
 */
export default function VisibilityCard({ profile }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const username = usernameOfEmail(profile.email, profile.username);
  const address = username ? `${window.location.origin}/public-profile/${encodeURIComponent(username)}` : '';

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card as="section" className="pf-card" title="Who can see your profile" description="Anyone with your link can open your public profile.">
      <div className="pf-visibility">
        <section aria-labelledby="pf-visible">
          <h3 className="pf-visibility__title" id="pf-visible">
            <EyeIcon size={18} aria-hidden="true" /> Visible to everyone
          </h3>
          <ul className="pf-visibility__list">
            {PUBLIC.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="pf-private">
          <h3 className="pf-visibility__title" id="pf-private">
            <LockSimpleIcon size={18} aria-hidden="true" /> Only you
          </h3>
          <ul className="pf-visibility__list">
            {PRIVATE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      </div>

      {address ? (
        <div className="pf-visibility__actions">
          <Button size="sm" onClick={copy} startIcon={copied ? <CheckIcon size={16} weight="bold" aria-hidden="true" /> : <CopyIcon size={16} aria-hidden="true" />}>
            {copied ? 'Link copied' : 'Copy link'}
          </Button>
          <Button as="a" size="sm" href={address} target="_blank" rel="noopener noreferrer" startIcon={<ArrowSquareOutIcon size={16} aria-hidden="true" />}>
            Open<span className="ui-sr"> your public profile in a new tab</span>
          </Button>
          <span className="ui-sr" role="status">
            {copied ? 'Link copied to the clipboard' : ''}
          </span>
        </div>
      ) : null}
    </Card>
  );
}
