import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/csr/ArrowSquareOut';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { CopyIcon } from '@phosphor-icons/react/dist/csr/Copy';
import { LinkedinLogoIcon } from '@phosphor-icons/react/dist/csr/LinkedinLogo';
import { Button, Dialog } from '../ui';
import { daylight } from '../../theme/tokens';

/** Copies text; false when the browser refuses (an old browser, or no permission) */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share this profile: a QR code to scan, the address to copy, a LinkedIn share and a link that opens
 * the page. The QR code is always dark on light, in the Daylight colours, because a scanner needs the
 * contrast in both themes.
 *
 *   open, onClose
 *   url     the address of this profile
 *   name    the student's name, for the LinkedIn text
 */
export default function ShareDialog({ open, onClose, url, name }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setFailed(false);
    }
    return () => window.clearTimeout(timer.current);
  }, [open]);

  const copy = async () => {
    const done = await copyText(url);
    setCopied(done);
    setFailed(!done);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2500);
  };

  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Share this profile"
      description={name ? `Anyone with the link can see ${name}'s public profile.` : 'Anyone with the link can see this public profile.'}
      actions={<Button onClick={onClose}>Done</Button>}
    >
      <div className="pp-share">
        <div className="pp-share__qr">
          <QRCodeSVG value={url} size={176} level="M" bgColor={daylight.surface} fgColor={daylight.text} marginSize={2} title="QR code of this profile's address" />
        </div>
        <p className="pp-share__hint">Scan with a phone camera</p>

        <div className="pp-share__url" aria-label="Profile address">
          {url}
        </div>

        <div className="pp-share__actions">
          <Button
            variant="primary"
            onClick={copy}
            startIcon={copied ? <CheckIcon size={18} weight="bold" aria-hidden="true" /> : <CopyIcon size={18} aria-hidden="true" />}
          >
            {copied ? 'Copied' : 'Copy link'}
          </Button>
          <Button as="a" href={linkedin} target="_blank" rel="noopener noreferrer" startIcon={<LinkedinLogoIcon size={18} aria-hidden="true" />}>
            Share on LinkedIn<span className="ui-sr"> (opens in a new tab)</span>
          </Button>
          <Button as="a" href={url} target="_blank" rel="noopener noreferrer" startIcon={<ArrowSquareOutIcon size={18} aria-hidden="true" />}>
            Open<span className="ui-sr"> in a new tab</span>
          </Button>
        </div>
        <p className="pp-share__status" role="status">
          {copied ? 'Link copied to the clipboard.' : failed ? 'Your browser did not allow copying. Select the address above and copy it.' : ''}
        </p>
      </div>
    </Dialog>
  );
}
