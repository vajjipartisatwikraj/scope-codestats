import React, { useState } from 'react';
import { MicrophoneIcon } from '@phosphor-icons/react/dist/csr/Microphone';
import { Button, Card, EmptyState, Notice, Skeleton, StatGrid, StatTile, formatNumber } from '../ui';
import ErrorContext from './ErrorContext';
import JudgeCard from './JudgeCard';
import JudgeChecks from './JudgeChecks';
import JudgeRoutesTable from './JudgeRoutesTable';
import MonitorBar from './MonitorBar';
import QuestionTypeTable from './QuestionTypeTable';
import useRemoteData from './useRemoteData';
import { AudioChart, EvaluationsChart, JudgeCallsChart, JudgeOutcomeCard, TokensChart } from './VocalqCharts';
import { monitoringApi } from '../../services/monitoringApi';
import { VOCALQ_RANGES, formatClock, formatDuration, formatMs, formatScore } from './monitoringModel';

const POLL_MS = 30 * 1000; // the judge's own console refreshes every 30 seconds

function Loading() {
  return (
    <div role="status" aria-label="Loading the VocalQ API usage" className="mon-loading">
      <div className="ui-stats" data-cols="4">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} height={108} radius="var(--ds-radius-xl)" />
        ))}
      </div>
      <Skeleton height={300} radius="var(--ds-radius-xl)" />
    </div>
  );
}

/** What to show when the numbers cannot be had: a plain card or notice that says why. */
function Unavailable({ overview, onRetry }) {
  if (!overview.configured) {
    return (
      <Card>
        <EmptyState
          icon={<MicrophoneIcon size={28} aria-hidden="true" />}
          title="VocalQ scoring is not set up"
          text="Set SPEECHJUDGE_BASE_URL and SPEECHJUDGE_API_KEY in the backend environment, then reload."
        />
      </Card>
    );
  }
  return (
    <Notice
      tone="danger"
      title="The speech judge is not reachable"
      action={
        <Button variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      }
    >
      {overview.error || 'The backend could not reach the judge.'} Recordings are kept and scored again once it is back.
    </Notice>
  );
}

/**
 * The VocalQ API tab: how the speech judge is being used. The numbers are SpeechJudge's own usage
 * reports (its /api/v1/metrics API), read by the backend (GET /api/admin/monitoring/vocalq) and
 * shown as they come: evaluations and their scores, calls to the judge's API and how they ended,
 * the audio it transcribed, the AI tokens it used, and the space its usage data takes.
 *
 * Only what an admin needs to judge the health and cost of scoring is shown; the judge's own
 * console has the per-route and per-evaluation lists.
 */
export default function VocalqApi() {
  const [range, setRange] = useState('24h');
  const { data, loading, error, updatedAt, reload } = useRemoteData(
    (signal) => monitoringApi.vocalq(range, { signal }),
    range,
    { pollMs: POLL_MS }
  );

  const bar = (
    <MonitorBar
      ranges={VOCALQ_RANGES}
      range={range}
      onRange={setRange}
      onReload={reload}
      loading={loading}
      label="Time range of the VocalQ API usage"
      caption={updatedAt ? `Updated ${formatClock(updatedAt)}` : null}
    />
  );

  if (!data) {
    return (
      <div className="mon-tab">
        {bar}
        {error ? (
          <Notice
            tone="danger"
            title="We could not load the VocalQ API usage"
            action={
              <Button variant="ghost" onClick={reload}>
                Retry
              </Button>
            }
          >
            {error}
          </Notice>
        ) : (
          <Loading />
        )}
      </div>
    );
  }

  if (!data.configured || data.reachable === false) {
    return (
      <div className="mon-tab">
        {bar}
        <Unavailable overview={data} onRetry={reload} />
      </div>
    );
  }

  const { monitoring, summary } = data;
  const judgeCard = (
    <JudgeCard
      writer={monitoring?.writer}
      storage={data.storage}
      storageError={data.problems?.storage}
    />
  );

  // The judge answers, but its usage reports are off or failing: show its state and say why
  if (!monitoring?.available || !monitoring.enabled) {
    return (
      <div className="mon-tab">
        {bar}
        <Notice tone="warning" title={monitoring?.available ? 'Usage monitoring is off on the judge' : 'The judge did not send its usage reports'}>
          {monitoring?.available
            ? monitoring.hint || 'Set SJ_DATABASE_URL on the judge and restart it.'
            : `${monitoring?.error || 'The request failed.'} Check SPEECHJUDGE_API_KEY and that the judge is up to date.`}
        </Notice>
        <JudgeChecks judge={data.judge} />
      </div>
    );
  }

  const { api, evaluations: runs, whisper, pronunciation, gemini } = summary;
  const finished = runs.completed + runs.low_audio_quality;

  return (
    <div className="mon-tab">
      {bar}
      <JudgeChecks judge={data.judge} />

      {error ? (
        <Notice tone="warning" title="The numbers could not be refreshed">
          {error} Showing the last data that loaded.
        </Notice>
      ) : null}
      {data.mock ? (
        <Notice tone="info" title="Showing sample data">
          SPEECHJUDGE_MOCK is on in the backend, so these figures are made up and do not come from the speech judge. Remove it
          from the backend environment to see real usage.
        </Notice>
      ) : null}
      {runs.mocked > 0 ? (
        <Notice tone="info" title={`${formatNumber(runs.mocked)} evaluations used a placeholder service`}>
          Their scores are not real. This happens when a judge service runs in mock mode.
        </Notice>
      ) : null}

      <StatGrid label="Summary of the VocalQ API usage" className="mon-stats--compact">
        <StatTile
          tone="spotlight"
          size="m"
          label="Evaluations"
          value={finished}
          context={`${formatNumber(runs.completed)} scored \u00b7 ${formatNumber(runs.low_audio_quality)} rejected`}
        />
        <StatTile size="m" label="Average score" value={formatScore(runs.avg_score)} context="Of scored evaluations" />
        <StatTile
          size="m"
          label="Failed attempts"
          value={runs.failed_attempts}
          context={<ErrorContext count={runs.failed_attempts} total={runs.runs} tone="danger" noun="runs" />}
        />
        <StatTile size="m" label="Average evaluation" value={formatMs(runs.avg_ms)} context={`Slowest ${formatMs(runs.max_ms)}`} />
        <StatTile size="m" label="API calls" value={api.requests} context={`${formatNumber(api.by_status_class['2xx'])} successful`} />
        <StatTile size="m" label="API latency" value={formatMs(api.avg_ms)} context={`Slowest ${formatMs(api.max_ms)}`} />
        <StatTile
          size="m"
          label="API errors"
          value={api.errors}
          context={<ErrorContext count={api.errors} total={api.requests} tone={api.server_errors ? 'danger' : 'warning'} noun="calls" />}
        />
        <StatTile
          size="m"
          label="Audio transcribed"
          value={formatDuration(whisper.audio_seconds)}
          context={`About ${formatDuration(whisper.avg_audio_seconds)} each`}
        />
        <StatTile size="m" label="Whisper evaluations" value={whisper.evaluations} context="Recordings to text" />
        <StatTile
          size="m"
          label="Pronunciation evaluations"
          value={pronunciation.evaluations}
          context={`${formatDuration(pronunciation.audio_seconds)} checked`}
        />
        <StatTile size="m" label="Gemini calls" value={gemini.calls} context="Including retries" />
        <StatTile
          size="m"
          label="Gemini tokens"
          value={gemini.total_tokens}
          context={`in ${formatNumber(gemini.prompt_tokens)} \u00b7 out ${formatNumber(gemini.output_tokens)} \u00b7 thinking ${formatNumber(gemini.thinking_tokens)}`}
        />
      </StatGrid>
      <div className="mon-charts">
        <EvaluationsChart overview={data} />
        <JudgeCallsChart overview={data} />
        <JudgeOutcomeCard overview={data} />
        <AudioChart overview={data} />
        <TokensChart overview={data} />
      </div>

      <JudgeRoutesTable rows={data.routes} problem={data.problems?.routes} />

      <QuestionTypeTable rows={data.questionTypes} problem={data.problems?.questionTypes} />

      {judgeCard}

      <p className="mon-note">
        Counted by the speech judge and read through the backend. Health checks and the monitoring reports themselves are not included.
      </p>
    </div>
  );
}
