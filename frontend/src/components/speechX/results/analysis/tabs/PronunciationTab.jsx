import React from "react";

/** Phoneme symbols in slashes; the ones that differed are bold and underlined (and amber). */
const Phonemes = ({ units }) => (
  <span className="sxe-phonemes">
    /{" "}
    {units.map((unit, index) => (
      <span key={index} className="sxe-phoneme" data-wrong={unit.wrong ? "true" : undefined}>
        {unit.symbol}
      </span>
    ))}
    /
  </span>
);

/** Per word: expected sounds, heard sounds and how closely they matched. */
const PronunciationTab = ({ pronunciation }) => (
  <div className="sxe-tab">
    <div>
      <h4 className="sxe-tab__heading">
        Pronunciation score
        <span className="sxe-tab__score">
          {pronunciation.score}
          <span className="sxe-muted"> / 100</span>
        </span>
      </h4>
      <p className="sxe-tab__note">
        Average sound match {pronunciation.averageMatch}%. Sounds in bold and underlined (amber) differed from the expected ones.
      </p>
    </div>

    <div className="sxe-scrollx" role="region" aria-label="Pronunciation by word" tabIndex={0}>
      <table className="sxe-table sxe-table--sounds">
        <thead>
          <tr>
            <th scope="col">Word</th>
            <th scope="col">Expected sounds</th>
            <th scope="col">Heard in your audio</th>
            <th scope="col" className="sxe-table__num">
              Match
            </th>
          </tr>
        </thead>
        <tbody>
          {pronunciation.words.map((word, index) => (
            <tr key={`${word.word}-${index}`}>
              <th scope="row">{word.word}</th>
              <td>
                <Phonemes units={word.expectedUnits} />
              </td>
              <td>
                {word.heardUnits.length ? <Phonemes units={word.heardUnits} /> : <span className="sxe-muted">Not heard</span>}
              </td>
              <td className="sxe-table__num">{word.accuracy}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default PronunciationTab;
