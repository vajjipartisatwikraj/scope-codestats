import React from 'react';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { Button, Card, Prose } from '../../../../ui';

/**
 * A module's notes, written by the teacher as HTML, in the reading typography (Prose, which cleans
 * the HTML first and never rewrites code). It replaces the module's questions until the student goes
 * back. The heading stays at the top of the card and only the notes scroll, like the questions.
 *
 *   module   the open module (its notes are in `documentationUrl`)
 *   onBack   returns to the questions
 */
export default function ModuleNotes({ module, onBack }) {
  return (
    <Card as="section" flush className="cdq" aria-labelledby="cdn-title">
      <div className="cdq-top">
        <header className="cdq-head">
          <Button variant="ghost" size="sm" startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />} onClick={onBack}>
            Back to questions
          </Button>
          <h2 className="cdq-title" id="cdn-title">
            Notes
          </h2>
          <p className="cdq-description">{module.title}</p>
        </header>
      </div>
      <div className="cdq-body">
        <Prose html={module.documentationUrl} />
      </div>
    </Card>
  );
}
