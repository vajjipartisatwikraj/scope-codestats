import React from "react";
import { Button, Dialog } from "../../ui";
import { SECTION_TYPES, SECTION_TYPE_META, TonalMark } from "../shared";
import { SECTION_TYPE_ICON } from "./typeIcons";

/**
 * Dialog with one tile per section type; choosing a tile adds a section of that type.
 * Props: open, onClose, onPick(type).
 */
const SectionTypePicker = ({ open, onClose, onPick }) => (
  <Dialog
    open={open}
    onClose={onClose}
    size="lg"
    title="Add a section"
    description="Each section holds one type of question and has its own time limit."
    actions={<Button onClick={onClose}>Cancel</Button>}
  >
    <ul className="sxa-types">
      {SECTION_TYPES.map((type) => {
        const meta = SECTION_TYPE_META[type];
        return (
          <li key={type}>
            <button type="button" className="sxa-type-tile" onClick={() => onPick(type)}>
              <TonalMark icon={SECTION_TYPE_ICON[type]} hue={meta.hue} size={40} />
              <span className="sxa-type-tile__text">
                <span className="sxa-type-tile__label">{meta.label}</span>
                <span className="sxa-type-tile__hint">{meta.hint}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  </Dialog>
);

export default SectionTypePicker;
