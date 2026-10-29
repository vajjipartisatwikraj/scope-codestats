import React, { useState } from "react";
import { UserCirclePlusIcon } from "@phosphor-icons/react/dist/csr/UserCirclePlus";
import { Button, Card, ConfirmDialog, SelectField } from "../../ui";

/**
 * The settings of the whole document: the template, the document font and "Import from my
 * profile". The font picker is a native select whose options are set in their own font; it styles
 * the sheet only (the interface keeps its own font).
 *
 *   templates, template   the catalogue and the chosen template definition
 *   fonts, fontId         the font catalogue and the chosen font's id
 *   importing             an import is in progress
 *   onTemplate(id), onFont(id), onImport()
 */
export default function DocumentCard({ templates, template, fonts, fontId, importing, onTemplate, onFont, onImport }) {
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
      description="Template, font and where your details come from."
      id="rbe-section-document"
    >
      <div className="rbe-document__grid">
        <SelectField
          label="Template"
          value={template.id}
          onChange={(event) => onTemplate(event.target.value)}
          options={templates.map((item) => ({ value: item.id, label: item.name }))}
        />

        {/* Only fonts that survive the PDF and Word exports are offered */}
        <SelectField
          label="Font"
          value={fontId}
          hint="Applies to the document only."
          onChange={(event) => onFont(event.target.value)}
        >
          {fonts.map((option) => (
            <option key={option.id} value={option.id} style={{ fontFamily: option.cssFamily }}>
              {option.name} ({option.category})
            </option>
          ))}
        </SelectField>
      </div>

      {/* Pulls name, contact, about, education, skills, internships, projects and
          certifications from the saved profile */}
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
        description="This replaces the content of any section your profile has data for. Sections with nothing in your profile are left as they are, and text sizes are kept. Nothing is saved until you press Save."
        confirmLabel="Import from profile"
        onConfirm={runImport}
      />
    </Card>
  );
}
