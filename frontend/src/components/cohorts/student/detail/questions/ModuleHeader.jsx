import React from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText';
import { PlayCircleIcon } from '@phosphor-icons/react/dist/csr/PlayCircle';
import { Button } from '../../../../ui';
import { safeUrl } from '../../../../../utils/safeUrl';

/**
 * The top of the right column: the open module's name, what it covers and the two things a teacher
 * can attach to it, a video (opens in a new tab) and notes (replace the questions until the student
 * goes back). On a phone, where the list and the questions take turns, "All modules" returns to the
 * list.
 *
 *   module     the open module
 *   onNotes    opens the notes view
 *   onBack     returns to the module list (shown below 900px only)
 *   actions    more buttons for the same row, in front of Video and Notes (the staff page puts Issues,
 *              Export and Add question here)
 */
export default function ModuleHeader({ module, onNotes, onBack, actions }) {
  const video = safeUrl(module.videoResource);
  const hasNotes = Boolean(module.documentationUrl && String(module.documentationUrl).trim());

  return (
    <header className="cdq-head">
      <Button className="cdq-back" variant="ghost" size="sm" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={onBack}>
        All modules
      </Button>

      <div className="cdq-head__row">
        <h2 className="cdq-title" id="cdq-title">
          {module.title}
        </h2>
        {actions || video || hasNotes ? (
          <div className="cdq-head__actions">
            {actions}
            {video ? (
              <Button
                as="a"
                size="sm"
                href={video}
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<PlayCircleIcon size={18} weight="regular" aria-hidden="true" />}
                endIcon={<ArrowUpRightIcon size={16} weight="regular" aria-hidden="true" />}
                aria-label={`Watch the video for ${module.title} (opens in a new tab)`}
              >
                Video
              </Button>
            ) : null}
            {hasNotes ? (
              <Button size="sm" startIcon={<FileTextIcon size={18} weight="regular" aria-hidden="true" />} onClick={onNotes}>
                Notes
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {module.description ? <p className="cdq-description">{module.description}</p> : null}
    </header>
  );
}
