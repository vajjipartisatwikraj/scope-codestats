import React, { useState } from 'react';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { MegaphoneIcon } from '@phosphor-icons/react/dist/csr/Megaphone';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';
import { Button, Prose } from '../ui';
import './announcementCard.css';

/**
 * AnnouncementCard: the announcement as it is drawn, a solid card with a thin border, the picture on the
 * left and the text on the right (the picture goes above the text on a phone). The text side has a
 * header (a small megaphone mark and the title), the scrolling text, and a footer set off by a hairline
 * with the buttons at the right; the cross is at the top right. It only draws; AnnouncementDialog puts it in an overlay
 * with focus handling, and the management screen shows it as a preview.
 *
 * The description is HTML written in the rich text editor; Prose cleans it before it is placed in the
 * page. Without a button the one action is "Got it"; with a button there is "Not now" next to it.
 *
 *   announcement   { title, description, imageUrl, buttonText }
 *   titleId        the id of the title, for the dialog's aria-labelledby
 *   onButton()     the button was pressed
 *   onClose()      the cross, "Not now" or "Got it" was pressed
 */
export default function AnnouncementCard({ announcement, titleId, onButton, onClose }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(announcement.imageUrl) && !imageFailed;
  const hasButton = Boolean(announcement.buttonText);

  return (
    <div className="an__card" data-has-image={hasImage ? 'true' : 'false'}>
      {hasImage ? (
        <div className="an__media">
          <img src={announcement.imageUrl} alt="" onError={() => setImageFailed(true)} />
        </div>
      ) : null}

      <div className="an__body">
        <header className="an__head">
          <span className="an__mark" aria-hidden="true">
            <MegaphoneIcon size={22} weight="fill" />
          </span>
          <h2 className="an__title" id={titleId}>
            {announcement.title}
          </h2>
        </header>
        <div className="an__text">
          <Prose html={announcement.description} />
        </div>
        <div className="an__actions">
          {hasButton ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Not now
              </Button>
              <Button variant="primary" onClick={onButton} endIcon={<ArrowRightIcon size={18} weight="bold" aria-hidden="true" />}>
                {announcement.buttonText}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={onClose}>
              Got it
            </Button>
          )}
        </div>
      </div>

      {/* data-close keeps the first focus on a button, not on the cross */}
      <button type="button" className="an__close" data-close="true" aria-label="Close this announcement" onClick={onClose}>
        <XIcon size={20} weight="bold" aria-hidden="true" />
      </button>
    </div>
  );
}
