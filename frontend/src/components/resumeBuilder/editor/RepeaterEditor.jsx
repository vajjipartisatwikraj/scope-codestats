import React, { useEffect, useId, useRef, useState } from "react";
import { ArrowDownIcon } from "@phosphor-icons/react/dist/csr/ArrowDown";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { DotsSixVerticalIcon } from "@phosphor-icons/react/dist/csr/DotsSixVertical";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { toast } from "react-toastify";
import { blankItem } from "../../../utils/resume";
import { Button, IconButton, TextField } from "../../ui";
import BulletsEditor from "./BulletsEditor";
import RichTextArea from "./RichTextArea";
import { isFilled } from "./sections";

let keyCounter = 0;
const newKey = () => `entry-${++keyCounter}`;

/**
 * A stable key per entry. The saved entries are plain objects with no id, so the editor keeps its
 * own list of keys in step with them (add, remove, move). Without it a moved entry would be
 * re-created by index and lose focus and its place in the page.
 */
function useEntryKeys(length) {
  const keys = useRef([]);
  while (keys.current.length < length) keys.current.push(newKey());
  if (keys.current.length > length) keys.current.length = length;
  return keys;
}

// A short, single-line field sits next to its neighbour; anything longer takes the full row
const spanOf = (subField) => (subField.type === "text" && (subField.maxLength || 0) <= 80 ? "half" : "full");

function SubFieldEditor({ subField, value, entryTitle, onChange }) {
  const id = useId();

  if (subField.type === "bullets") {
    return (
      <div className="rbe-sub" data-span="full" role="group" aria-labelledby={id}>
        <span className="ui-field__label" id={id}>
          {subField.label}
        </span>
        <BulletsEditor definition={subField} points={value} label={`${entryTitle}, ${subField.label}`} onChange={onChange} />
      </div>
    );
  }

  if (subField.type === "multiline") {
    return (
      <div className="rbe-sub" data-span="full">
        <label className="ui-field__label" htmlFor={id}>
          {subField.label}
        </label>
        <RichTextArea
          id={id}
          value={value ?? ""}
          rows={3}
          maxLength={subField.maxLength}
          placeholder={subField.placeholder}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <div className="rbe-sub" data-span={spanOf(subField)}>
      <TextField
        label={subField.label}
        placeholder={subField.placeholder}
        value={value ?? ""}
        maxLength={subField.maxLength}
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * The repeating entries of a field (education, projects, contact items ...), described by
 * definition.subFields. Each entry is a tile with a drag handle, Move up and Move down buttons
 * (the keyboard way to reorder; the handle is for the pointer), Remove, and its fields. Removing an
 * entry that has text offers Undo.
 *
 *   definition   the repeater field (itemLabel, addLabel, maxItems, subFields)
 *   items        the current entries
 *   onChange(items)
 */
export default function RepeaterEditor({ definition, items, onChange }) {
  const maxItems = definition.maxItems || 10;
  const itemLabel = definition.itemLabel || "Entry";
  const list = Array.isArray(items) ? items : [];
  const keys = useEntryKeys(list.length);

  const latest = useRef(list);
  latest.current = list;
  const rootRef = useRef(null);
  const addRef = useRef(null);
  const pendingFocus = useRef(null);
  const [drag, setDrag] = useState(null); // { from } while an entry is being dragged
  const [drop, setDrop] = useState(null); // { index, edge: "before" | "after" }

  // Focus is set after the render that moved or removed an entry
  useEffect(() => {
    if (!pendingFocus.current) return;
    const run = pendingFocus.current;
    pendingFocus.current = null;
    run();
  });

  const entryNode = (key) => rootRef.current && rootRef.current.querySelector(`[data-key="${key}"]`);

  const patchEntry = (index, patch) =>
    onChange(list.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const move = (from, to, direction) => {
    if (to < 0 || to >= list.length || to === from) return;
    const next = [...list];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry);
    const [key] = keys.current.splice(from, 1);
    keys.current.splice(to, 0, key);
    if (direction) {
      // Keep focus on the same button of the entry that moved (or its neighbour at the ends)
      pendingFocus.current = () => {
        const node = entryNode(key);
        const button =
          (node && node.querySelector(`[data-move="${direction}"]:not(:disabled)`)) ||
          (node && node.querySelector("[data-move]:not(:disabled)"));
        if (button) button.focus();
      };
    }
    onChange(next);
  };

  const restore = (entry, index, key) => {
    const current = latest.current;
    if (current.length >= maxItems) {
      toast.error(`You can have up to ${maxItems} here, so the ${itemLabel.toLowerCase()} was not brought back`);
      return;
    }
    const at = Math.min(index, current.length);
    keys.current.splice(at, 0, key);
    onChange([...current.slice(0, at), entry, ...current.slice(at)]);
  };

  const remove = (index) => {
    const entry = list[index];
    const [key] = keys.current.splice(index, 1);
    pendingFocus.current = () => {
      // The entry now in this place gets focus; with none left, the Add button does
      const nextKey = keys.current[Math.min(index, keys.current.length - 1)];
      const node = nextKey ? entryNode(nextKey) : null;
      const target = node ? node.querySelector("input, textarea") : null;
      (target || addRef.current)?.focus();
    };
    onChange(list.filter((_, i) => i !== index));

    if (isFilled(entry)) {
      toast.info(
        ({ closeToast }) => (
          <div className="rbe-undo">
            <span>{itemLabel} removed</span>
            <button
              type="button"
              className="rbe-undo__button"
              onClick={() => {
                restore(entry, index, key);
                closeToast();
              }}
            >
              Undo
            </button>
          </div>
        ),
        { autoClose: 7000 },
      );
    }
  };

  const add = () => {
    keys.current.push(newKey());
    onChange([...list, blankItem(definition.subFields)]);
    // The new entry's first field is where the student types next
    pendingFocus.current = () => {
      const node = entryNode(keys.current[keys.current.length - 1]);
      const field = node ? node.querySelector("input, textarea") : null;
      if (field) field.focus();
    };
  };

  // ---- Drag and drop (pointer). The buttons above are the keyboard and touch way. ----

  const endDrag = () => {
    setDrag(null);
    setDrop(null);
  };

  const onDragOverEntry = (event, index) => {
    if (!drag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const box = event.currentTarget.getBoundingClientRect();
    const edge = event.clientY < box.top + box.height / 2 ? "before" : "after";
    if (!drop || drop.index !== index || drop.edge !== edge) setDrop({ index, edge });
  };

  const onDropOnList = (event) => {
    if (!drag || !drop) return;
    event.preventDefault();
    const position = drop.index + (drop.edge === "after" ? 1 : 0);
    const to = drag.from < position ? position - 1 : position;
    endDrag();
    if (to !== drag.from) move(drag.from, to, null);
  };

  return (
    <div className="rbe-repeater" ref={rootRef}>
      <ul
        className="rbe-entries"
        onDrop={onDropOnList}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDrop(null);
        }}
      >
        {list.map((item, index) => {
          const key = keys.current[index];
          const title = `${itemLabel} ${index + 1}`;
          const firstText = definition.subFields.find(
            (subField) => subField.type === "text" && String(item?.[subField.key] ?? "").trim(),
          );
          return (
            <li
              key={key}
              className="rbe-entry"
              data-key={key}
              data-dragging={drag && drag.from === index ? "true" : "false"}
              data-drop={drop && drop.index === index ? drop.edge : undefined}
              onDragOver={(event) => onDragOverEntry(event, index)}
            >
              <div className="rbe-entry__head">
                <span
                  className="rbe-handle"
                  draggable="true"
                  aria-hidden="true"
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                    const node = entryNode(key);
                    if (node) event.dataTransfer.setDragImage(node, 24, 24);
                    setDrag({ from: index });
                  }}
                  onDragEnd={endDrag}
                >
                  <DotsSixVerticalIcon size={20} weight="bold" />
                </span>

                <div className="rbe-entry__titles">
                  <h3 className="rbe-entry__title">{title}</h3>
                  {firstText ? <span className="rbe-entry__sub">{item[firstText.key]}</span> : null}
                </div>

                <div className="rbe-entry__tools">
                  <IconButton
                    label={`Move ${title} up`}
                    size="sm"
                    tone="plain"
                    data-move="up"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1, "up")}
                  >
                    <ArrowUpIcon size={18} weight="regular" aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={`Move ${title} down`}
                    size="sm"
                    tone="plain"
                    data-move="down"
                    disabled={index === list.length - 1}
                    onClick={() => move(index, index + 1, "down")}
                  >
                    <ArrowDownIcon size={18} weight="regular" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`Remove ${title}`} size="sm" tone="danger" onClick={() => remove(index)}>
                    <TrashIcon size={18} weight="regular" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>

              <div className="rbe-entry__fields">
                {definition.subFields.map((subField) => (
                  <SubFieldEditor
                    key={subField.key}
                    subField={subField}
                    value={item?.[subField.key]}
                    entryTitle={title}
                    onChange={(value) => patchEntry(index, { [subField.key]: value })}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="rbe-add">
        <Button
          ref={addRef}
          size="sm"
          startIcon={<PlusIcon size={16} weight="bold" aria-hidden="true" />}
          disabled={list.length >= maxItems}
          onClick={add}
        >
          {definition.addLabel || "Add entry"}
        </Button>
        <span className="rbe-add__count">
          {list.length} of {maxItems}
        </span>
      </div>
    </div>
  );
}
