import React from 'react';
import { Badge, Card } from '../ui';
import { formatDateRange } from '../../utils/education';
import { normalizeSkillSets } from '../../utils/skillSets';
import { scoreText, yearLabel } from './profileModel';

/** About: what the student wrote about themselves, with their line breaks */
export function AboutCard({ about }) {
  const text = typeof about === 'string' ? about.trim() : '';
  if (!text) return null;
  return (
    <Card className="pp-card" title="About">
      <p className="pp-about">{text}</p>
    </Card>
  );
}

/** Details: label and value rows. A row without a value is left out. */
export function DetailsCard({ profile }) {
  const year = yearLabel(profile.graduatingYear);
  const rows = [
    { label: 'Roll number', value: profile.rollNumber },
    { label: 'Department', value: profile.department },
    { label: 'Section', value: profile.section },
    { label: 'Year', value: year },
    { label: 'Class of', value: profile.graduatingYear },
  ].filter((row) => row.value);

  if (rows.length === 0) return null;
  return (
    <Card className="pp-card" title="Details">
      <dl className="ui-detail__facts">
        {rows.map((row) => (
          <div className="ui-detail__fact" key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** Skills in the groups the student made, then their interests */
export function SkillsCard({ skills, interests }) {
  const sets = normalizeSkillSets(skills);
  const topics = (Array.isArray(interests) ? interests : []).filter(Boolean);
  if (sets.length === 0 && topics.length === 0) return null;

  return (
    <Card className="pp-card" title="Skills and interests">
      <div className="pp-skills">
        {sets.map((set, index) => (
          <section key={`${set.name}-${index}`} aria-label={set.name || 'Skills'}>
            {set.name ? <h3 className="pp-skills__name">{set.name}</h3> : null}
            <ul className="pp-tags">
              {set.skills.map((skill, skillIndex) => (
                <li key={`${skill}-${skillIndex}`}>
                  <Badge tone="info">{skill}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ))}

        {topics.length > 0 ? (
          <section aria-label="Interests">
            <h3 className="pp-skills__name">Interests</h3>
            <ul className="pp-tags">
              {topics.map((topic, index) => (
                <li key={`${topic}-${index}`}>
                  <Badge>{topic}</Badge>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </Card>
  );
}

/** Education from school to college, newest level last, as the server orders it */
export function EducationCard({ education }) {
  const entries = Array.isArray(education) ? education.filter((entry) => entry && entry.level) : [];
  if (entries.length === 0) return null;

  return (
    <Card className="pp-card" title="Education">
      <ol className="ui-detail__steps">
        {entries.map((entry, index) => {
          const range = formatDateRange(entry.startDate, entry.endDate);
          const line = [entry.stream, range].filter(Boolean).join(' \u00b7 ');
          const score = scoreText(entry);
          return (
            <li key={`${entry.level}-${index}`} className="ui-detail__step pp-edu">
              <span className="ui-detail__step-text">
                <span className="ui-detail__step-title">{entry.name || entry.level}</span>
                <span className="ui-detail__step-meta">{entry.name ? entry.level : ''}</span>
                {line ? <span className="ui-detail__step-meta">{line}</span> : null}
              </span>
              {score ? <Badge tone="success">{score}</Badge> : null}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
