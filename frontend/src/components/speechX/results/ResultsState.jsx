import React from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { HourglassIcon } from "@phosphor-icons/react/dist/csr/Hourglass";
import { Button, EmptyState, Notice, Skeleton } from "../../ui";
import { FocusHeader, FocusPage, Reveal } from "../shared";

/**
 * What the results page shows until a report is ready, in one persistent polite live region so a
 * change of state is announced:
 *   loading    skeletons shaped like the page (the band, the score tile, the cards, the rows)
 *   notReady   the server said the section is not scored yet (409): an empty state that says
 *              scoring is still running, with "Check again" and a way back
 *   error      a danger Notice that says what failed, with Retry and a way back
 */
const ResultsState = ({ loading, notReady, error, onRetry, onBack }) => (
  <>
    <FocusHeader subtitle="VocalQ" />
    <FocusPage wide gap aria-busy={loading || undefined}>
      <h1 className="sx-sr">Section results</h1>
      <div className="sxe-live" aria-live="polite">
        {loading ? (
          <>
            <p className="sx-sr">Loading your results…</p>
            <Reveal y={0} className="sxe-live">
              <Skeleton height={112} radius="var(--ds-radius-xl)" />
              <div className="sxe-skeleton-grid">
                <Skeleton height={320} radius="var(--ds-radius-xl)" />
                <Skeleton height={320} radius="var(--ds-radius-xl)" />
              </div>
              <Skeleton height={280} radius="var(--ds-radius-xl)" />
              <Skeleton height={64} radius="var(--ds-radius-xl)" />
              <Skeleton height={64} radius="var(--ds-radius-xl)" />
              <Skeleton height={64} radius="var(--ds-radius-xl)" />
            </Reveal>
          </>
        ) : notReady ? (
          <Reveal y={8} className="sxe-problem">
            <EmptyState
              icon={<HourglassIcon size={28} weight="regular" />}
              title="Your results are not ready yet"
              text={`${error || "The results for this section are not ready yet"}. Scoring can take a little while. Check again in a moment.`}
              action={
                <div className="sxe-problem__actions">
                  <Button variant="primary" onClick={onRetry} startIcon={<ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true" />}>
                    Check again
                  </Button>
                  <Button variant="secondary" onClick={onBack} startIcon={<ArrowLeftIcon size={18} weight="bold" aria-hidden="true" />}>
                    Back to sections
                  </Button>
                </div>
              }
            />
          </Reveal>
        ) : (
          <Reveal y={8}>
            <Notice
              tone="danger"
              title="These results could not be shown"
              action={
                <>
                  <Button variant="ghost" size="sm" onClick={onRetry} startIcon={<ArrowClockwiseIcon size={18} weight="bold" aria-hidden="true" />}>
                    Retry
                  </Button>
                  <Button variant="secondary" size="sm" onClick={onBack}>
                    Back
                  </Button>
                </>
              }
            >
              {error || "Results not found"}
            </Notice>
          </Reveal>
        )}
      </div>
    </FocusPage>
  </>
);

export default ResultsState;
