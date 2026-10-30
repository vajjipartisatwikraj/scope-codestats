import React, { useState } from "react";
import { UserCirclePlusIcon } from "@phosphor-icons/react/dist/csr/UserCirclePlus";
import { Button, Card, ConfirmDialog, SelectField } from "../../ui";

/**
 * The settings of the whole document: the template and "Import from my profile". Changing the template
 * only changes the look. Everything the student wrote is kept, because every template is filled from the
 * same details.
 *
 *   templates, template   the catalogue and the chosen template
 *   importing             an import is in progress
 *   onTemplate(id), onImport()
 */
export default function DocumentCard({ templates, template, importing, onTemplate, onImport }) {
  const [confirmImport, setConfirmImport] = useState(false);

  const runImport = () => {
    setConfirmImport(false);
    onImport();
  };

  return (
    <Card
      as="section"
      className="rbe-document"
      title="Document"
      description="Pick a look and, if you like, start from your profile."
      id="rbe-section-document"
    >
      <div className="rbe-document__grid">
        <SelectField
          label="Template"
          value={template.id}
          hint={template.description || undefined}
          onChange={(event) => onTemplate(event.target.value)}
          options={templates.map((item) => ({ value: item.id, label: item.name }))}
        />
      </div>

      {/* Pulls name, contact, about, education, skills, internships, projects and certifications
          from the saved profile */}
      <Button
        className="rbe-document__import"
        startIcon={<UserCirclePlusIcon size={20} weight="regular" aria-hidden="true" />}
        loading={importing}
        onClick={() => setConfirmImport(true)}
      >
        {importing ? "Importing" : "Import from my profile"}
      </Button>

      <ConfirmDialog
        open={confirmImport}
        onClose={() => setConfirmImport(false)}
        title="Import from your profile?"
        description="This replaces the content of any section your profile has data for. Sections with nothing in your profile are left as they are. Nothing is saved until you press Save."
        confirmLabel="Import from profile"
        onConfirm={runImport}
      />
    </Card>
  );
}
