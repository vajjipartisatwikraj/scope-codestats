import React from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { MinusIcon } from "@phosphor-icons/react/dist/csr/Minus";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { ArrowsLeftRightIcon } from "@phosphor-icons/react/dist/csr/ArrowsLeftRight";
import { Badge, StatGrid, StatTile } from "../../../../ui";

const TAGS = {
  match: { label: "Match", badge: "success", icon: CheckCircleIcon },
  substitution: { label: "Substitution", badge: "warning", icon: ArrowsLeftRightIcon },
  missing: { label: "Missing", badge: "warning", icon: MinusIcon },
  extra: { label: "Extra", badge: "warning", icon: PlusIcon },
};

/** A word in one of the two rows. Differing words are tinted amber and bold. */
const WordCell = ({ word, differs }) => (
  <span className="sxe-word" data-differs={differs ? "true" : undefined} data-empty={word ? undefined : "true"}>
    {word || "–"}
  </span>
);

const Tag = ({ status }) => {
  const meta = TAGS[status] || TAGS.substitution;
  const Icon = meta.icon;
  return (
    <Badge tone={meta.badge} icon={<Icon size={14} weight="bold" aria-hidden="true" />}>
      {meta.label}
    </Badge>
  );
};

/**
 * With a target sentence: expected words lined up against the heard words, with the error
 * counts, as a table (one column per word, the first column names the rows and stays in view
 * while it scrolls sideways). Without one (open answers): just the transcript, in a card at
 * reading width.
 */
const TranscriptionTab = ({ transcription }) => {
  if (!transcription.rows) {
    return (
      <div className="sxe-tab">
        <div className="sxe-transcript">
          <h4 className="sxe-tab__heading">What the speech recogniser heard</h4>
          <p className="sxe-transcript__text">{transcription.text || "Nothing was recognised."}</p>
        </div>
      </div>
    );
  }

  const { rows, counts } = transcription;
  return (
    <div className="sxe-tab sxe-transcription">
      <div className="sxe-transcription__side">
        <div>
          <h4 className="sxe-tab__heading">
            Transcription score
            <span className="sxe-tab__score">
              {transcription.score}
              <span className="sxe-muted"> / 100</span>
            </span>
          </h4>
        </div>
        <StatGrid label="Word errors" columns={3}>
          <StatTile className="sxe-metric" size="m" label="Insertions" value={counts.extra} />
          <StatTile className="sxe-metric" size="m" label="Deletions" value={counts.missing} />
          <StatTile className="sxe-metric" size="m" label="Substitutions" value={counts.substitutions} />
        </StatGrid>
      </div>

      <div className="sxe-transcription__main">
        <p className="sxe-tab__note">The expected text is lined up with what the speech recogniser heard, word by word.</p>
        <div className="sxe-scrollx" role="region" aria-label="Word by word comparison" tabIndex={0}>
          <table className="sxe-table sxe-table--align">
            <tbody>
              <tr>
                <th scope="row">Expected text</th>
                {rows.map((row, index) => (
                  <td key={index} style={{ "--i": Math.min(index, 14) }}>
                    <WordCell word={row.expected} differs={row.status !== "match"} />
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">We heard</th>
                {rows.map((row, index) => (
                  <td key={index} style={{ "--i": Math.min(index, 14) }}>
                    <WordCell word={row.heard} differs={row.status !== "match"} />
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">Result</th>
                {rows.map((row, index) => (
                  <td key={index} style={{ "--i": Math.min(index, 14) }}>
                    <Tag status={row.status} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="sxe-tab__note">{transcription.summary}</p>
      </div>
    </div>
  );
};

export default TranscriptionTab;
