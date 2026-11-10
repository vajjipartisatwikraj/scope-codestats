import React from 'react';
import { Card, EmptyState, formatNumber } from '../ui';
import useMediaQuery from '../../hooks/useMediaQuery';
import { formatDuration, formatMs, formatScore, humanize } from './monitoringModel';

/**
 * Evaluations by question type (reading, repeat, jumbled, question answer, storytelling ...): how
 * many were scored, how many recordings were rejected for bad audio, how many failed, the average
 * score and time, and what each type cost in audio and AI tokens. A compact table from 900px,
 * rows on a phone.
 *
 *   rows     the judge's `question-types` answer (null when that report failed)
 *   problem  why `rows` is missing
 */
export default function QuestionTypeTable({ rows, problem }) {
  const phone = useMediaQuery('(max-width: 899.95px)');

  let body;
  if (rows === null) {
    body = <EmptyState compact title="This report is not available" text={problem || 'The judge did not send it.'} />;
  } else if (rows.length === 0) {
    body = <EmptyState compact title="No evaluations in this range" text="They appear here once recordings are scored." />;
  } else if (phone) {
    body = (
      <ul className="ui-list">
        {rows.map((row) => (
          <li key={row.question_type} className="ui-list__row mon-row">
            <div className="mon-row__text">
              <span className="mon-row__route">
                <span className="mon-route__path">{humanize(row.question_type)}</span>
              </span>
              <span className="mon-row__meta">
                {`${formatNumber(row.runs)} runs \u00b7 ${formatNumber(row.completed)} scored \u00b7 ${formatNumber(row.failed_attempts)} failed`}
              </span>
              <span className="mon-row__meta">{`Average score ${formatScore(row.avg_score)} \u00b7 ${formatMs(row.avg_ms)}`}</span>
            </div>
          </li>
        ))}
      </ul>
    );
  } else {
    body = (
      <div className="ui-table-wrap">
        <table className="ui-table mon-table" data-density="compact">
          <caption className="ui-sr">Evaluations by question type.</caption>
          <thead>
            <tr>
              <th scope="col">Question type</th>
              <th scope="col" className="ui-num">Runs</th>
              <th scope="col" className="ui-num">Scored</th>
              <th scope="col" className="ui-num">Audio rejected</th>
              <th scope="col" className="ui-num">Failed</th>
              <th scope="col" className="ui-num">Average score</th>
              <th scope="col" className="ui-num">Average time</th>
              <th scope="col" className="ui-num mon-wide">Audio</th>
              <th scope="col" className="ui-num mon-wide">AI tokens</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.question_type}>
                <td className="mon-table__route">
                  <span className="ui-table__title">{humanize(row.question_type)}</span>
                </td>
                <td className="ui-num mon-table__num">{formatNumber(row.runs)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.completed)}</td>
                <td className="ui-num mon-table__num">{formatNumber(row.low_audio_quality)}</td>
                <td className="ui-num mon-table__num" data-problem={row.failed_attempts > 0 ? 'true' : undefined}>
                  {formatNumber(row.failed_attempts)}
                </td>
                <td className="ui-num mon-table__num">{formatScore(row.avg_score)}</td>
                <td className="ui-num mon-table__num">{formatMs(row.avg_ms)}</td>
                <td className="ui-num mon-table__num mon-wide">{formatDuration(row.whisper_audio_seconds)}</td>
                <td className="ui-num mon-table__num mon-wide">{formatNumber(row.gemini_tokens)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card flush className="mon-card" title="Evaluations by question type" description="How each kind of question performed in this range.">
      {body}
    </Card>
  );
}
