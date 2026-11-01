import React from 'react';
import { Chip, Disclosure, Prose } from '../../../../ui';

/**
 * The statement itself: the description (teacher-written HTML, cleaned before it is shown), then
 * the hints one by one, then the topics and the companies that ask it. Hints, topics and companies
 * are left out when the question has none.
 */
export default function ProblemBody({ question }) {
  const hints = question.hints || [];
  const tags = question.tags || [];
  const companies = question.companies || [];

  return (
    <div className="ps-problem-body">
      <Prose html={question.description} className="ps-statement" />

      {hints.length > 0 ? (
        <section className="ps-extra" aria-labelledby="ps-hints">
          <h2 className="ps-extra__title" id="ps-hints">
            Hints
          </h2>
          {hints.map((hint, index) => (
            <Disclosure key={index} variant="raised" level={3} title={`Hint ${index + 1}`}>
              <p className="ps-extra__text">{hint}</p>
            </Disclosure>
          ))}
        </section>
      ) : null}

      {tags.length > 0 || companies.length > 0 ? (
        <section className="ps-extra" aria-label="Topics and companies">
          {tags.length > 0 ? (
            <Disclosure variant="raised" level={2} title="Topics" badge={tags.length}>
              <ul className="ps-chips">
                {tags.map((tag, index) => (
                  <li key={index}>
                    <Chip>{tag}</Chip>
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
          {companies.length > 0 ? (
            <Disclosure variant="raised" level={2} title="Companies" badge={companies.length}>
              <ul className="ps-chips">
                {companies.map((company, index) => (
                  <li key={index}>
                    <Chip>{company}</Chip>
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
