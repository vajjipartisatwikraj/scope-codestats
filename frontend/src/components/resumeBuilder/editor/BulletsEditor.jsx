import React, { useId } from "react";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/csr/MinusCircle";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { Button, IconButton } from "../../ui";
import RichTextArea from "./RichTextArea";

/**
 * A list of bullet points: one text area per point (with the bold and code marks), a remove
 * button on each and an Add point button, up to the field's maxItems.
 *
 *   definition   the bullets field (maxItems, maxLength, placeholder)
 *   points       the current points
 *   label        what the points belong to, for the accessible names ("Experience 1")
 *   onChange(points)
 */
export default function BulletsEditor({ definition, points, label, onChange }) {
  const baseId = useId();
  const maxItems = definition.maxItems || 10;
  const list = Array.isArray(points) ? points : [];

  return (
    <div className="rbe-bullets">
      {list.map((point, index) => (
        <div className="rbe-bullet" key={index}>
          <RichTextArea
            id={`${baseId}-${index}`}
            ariaLabel={`${label}, point ${index + 1}`}
            value={point}
            rows={2}
            maxLength={definition.maxLength}
            placeholder={definition.placeholder}
            onChange={(text) => onChange(list.map((item, i) => (i === index ? text : item)))}
          />
          <IconButton
            label={`Remove point ${index + 1}`}
            size="sm"
            tone="danger"
            onClick={() => onChange(list.filter((_, i) => i !== index))}
          >
            <MinusCircleIcon size={20} weight="regular" aria-hidden="true" />
          </IconButton>
        </div>
      ))}

      <div className="rbe-add">
        <Button
          size="sm"
          startIcon={<PlusIcon size={16} weight="bold" aria-hidden="true" />}
          disabled={list.length >= maxItems}
          onClick={() => onChange([...list, ""])}
        >
          Add point
        </Button>
        <span className="rbe-add__count">
          {list.length} of {maxItems}
        </span>
      </div>
    </div>
  );
}
