import React, { useEffect, useState } from 'react';

/**
 * The placeholder of the search pill: Search "Student", then the word slides up and the next one
 * rises in below it (Course, Opportunity, VocalQ test, ...), like a vertical carousel.
 *
 * It is drawn over the input, so it is hidden from screen readers (the input has its own label)
 * and the page shows it only while the input is empty. Under reduced motion the words change
 * without sliding.
 *
 *   words        the words to cycle through, in order
 *   intervalMs   how long each word stays (default 2200)
 *
 * Each word carries its closing quote, so the quote always sits right after it.
 * Every word is stacked in the same grid cell: the box is as wide as the longest word and the
 * position of a word is a data attribute the stylesheet (search.css, .srp-ph) animates.
 */
const RotatingPlaceholder = ({ words, intervalMs = 2200 }) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (words.length < 2) return undefined;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % words.length), intervalMs);
    return () => window.clearInterval(timer);
  }, [words.length, intervalMs]);

  const previous = (index - 1 + words.length) % words.length;

  return (
    <span className="srp-ph" aria-hidden="true">
      <span className="srp-ph__lead">Search&nbsp;&quot;</span>
      <span className="srp-ph__window">
        {words.map((word, position) => (
          <span
            key={word}
            className="srp-ph__word"
            data-pos={position === index ? 'current' : position === previous ? 'out' : 'below'}
          >
            {word}&quot;
          </span>
        ))}
      </span>
    </span>
  );
};

export default RotatingPlaceholder;
