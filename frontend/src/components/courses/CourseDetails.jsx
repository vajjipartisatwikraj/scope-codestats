import React from 'react';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/csr/ArrowUpRight';
import { ClockIcon } from '@phosphor-icons/react/dist/csr/Clock';
import { Badge, Button, DetailPanel } from '../ui';
import { Thumbnail } from './CourseCard';
import { CATEGORIES, levelTone, safeUrl } from './coursesModel';

/**
 * The detail panel of a course (the app's DetailPanel from ../ui): the picture, level and
 * duration, the full description, who teaches it, the category, every topic, and the link out.
 *
 *   course    the selected one, or null while the panel is closed
 *   onClose
 */
export default function CourseDetails({ course, onClose }) {
  const href = course ? safeUrl(course.courseLink) : null;
  const topics = course && Array.isArray(course.topics) ? course.topics : [];
  const category = course ? CATEGORIES.find((entry) => entry.key === course.category) : null;

  return (
    <DetailPanel
      open={Boolean(course)}
      onClose={onClose}
      title={course?.title}
      subtitle={course?.instructor}
      media={course ? <Thumbnail src={course.image} /> : null}
      badges={
        course ? (
          <>
            {course.level ? <Badge tone={levelTone(course.level)}>{course.level}</Badge> : null}
            {course.duration ? (
              <Badge tone="neutral" icon={<ClockIcon size={14} weight="regular" aria-hidden="true" />}>
                {course.duration}
              </Badge>
            ) : null}
          </>
        ) : null
      }
      summary={course?.description}
      facts={
        course
          ? [
              { label: 'Instructor', value: course.instructor },
              { label: 'Category', value: category && category.key !== 'all' ? category.label : null },
            ]
          : []
      }
      tags={topics}
      tagsTitle="Topics"
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          {href ? (
            <Button
              as="a"
              variant="primary"
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              endIcon={<ArrowUpRightIcon size={18} weight="regular" aria-hidden="true" />}
              aria-label={`View course: ${course.title} (opens in a new tab)`}
            >
              View course
            </Button>
          ) : (
            <Button variant="primary" disabled>
              No link yet
            </Button>
          )}
        </>
      }
    />
  );
}
