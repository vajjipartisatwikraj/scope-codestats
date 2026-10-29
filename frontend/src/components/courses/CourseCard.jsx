import React, { useState } from 'react';
import { BookOpenIcon } from '@phosphor-icons/react/dist/csr/BookOpen';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { Avatar, Badge, Card, Skeleton } from '../ui';
import { levelTone } from './coursesModel';

/** The 16:9 picture of a course; a tonal mark takes its place when there is none or it will not load */
export function Thumbnail({ src }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="ui-thumb crs-thumb">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <span className="crs-thumb__mark" aria-hidden="true">
          <BookOpenIcon size={32} weight="regular" />
        </span>
      )}
    </span>
  );
}

/**
 * One course, with only what decides whether to look closer: the picture, the level and duration,
 * the title and who teaches it. The whole card is a button; pressing it opens the detail panel
 * (CourseDetails) with the description, topics and the link to the course.
 *
 *   course
 *   onOpen   called with the course id
 */
export default function CourseCard({ course, onOpen }) {
  const provider = course.instructor || '';

  return (
    <button type="button" className="ui-card crs-card" onClick={() => onOpen(course._id)} aria-haspopup="dialog">
      <Thumbnail src={course.image} />

      <span className="crs-card__meta">
        {course.level ? <Badge tone={levelTone(course.level)}>{course.level}</Badge> : null}
        {course.duration ? (
          <Badge tone="neutral" icon={<ClockIcon size={14} weight="regular" aria-hidden="true" />}>
            {course.duration}
          </Badge>
        ) : null}
      </span>

      <span className="crs-card__title">{course.title}</span>

      {provider ? (
        <span className="crs-card__provider">
          <Avatar name={provider} size={32} />
          <span className="crs-card__provider-name">{provider}</span>
        </span>
      ) : null}
    </button>
  );
}

/** A card-shaped placeholder, the same height as the real thing */
export function CourseCardSkeleton() {
  return (
    <Card as="div" className="crs-card" aria-hidden="true">
      <div className="ui-thumb crs-thumb">
        <Skeleton height="100%" radius="0" />
      </div>
      <div className="crs-card__meta">
        <Skeleton width={84} height={24} radius="var(--ds-radius-pill)" />
        <Skeleton width={96} height={24} radius="var(--ds-radius-pill)" />
      </div>
      <Skeleton width="86%" height={24} />
      <div className="crs-card__provider">
        <Skeleton width={32} height={32} radius="50%" />
        <Skeleton width="40%" height={16} />
      </div>
    </Card>
  );
}
