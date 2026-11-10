import React from 'react';
import { Button, Card, Notice, Skeleton } from '../../ui';

/** A failed load: what went wrong and a way to try again. */
export function LoadError({ title = 'We could not load this', message, onRetry }) {
  return (
    <Notice
      tone="danger"
      title={title}
      action={
        onRetry ? (
          <Button variant="ghost" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null
      }
    >
      {message}
    </Notice>
  );
}

/**
 * The skeleton of a view while its first answer loads: a row of tiles and two cards, shaped like
 * the content that will replace them (design/screens.md section 18).
 */
export function ViewSkeleton({ label = 'Loading', tiles = 4, cards = 2 }) {
  return (
    <div className="ad-skeleton" aria-busy="true" aria-label={label}>
      <div className="ad-skeleton__tiles">
        {Array.from({ length: tiles }, (_, index) => (
          <Skeleton key={index} height={112} radius="var(--ds-radius-xl)" />
        ))}
      </div>
      <div className="ad-grid">
        {Array.from({ length: cards }, (_, index) => (
          <Card key={index}>
            <Skeleton width="40%" height={20} />
            <div className="ad-skeleton__chart">
              <Skeleton height={200} radius="var(--ds-radius-lg)" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
