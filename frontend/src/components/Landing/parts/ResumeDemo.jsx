import React, { useEffect, useRef, useState } from 'react';
import { DownloadSimpleIcon } from '@phosphor-icons/react/dist/csr/DownloadSimple';
import { usePlay } from './useFeaturePlay';
import './ResumeDemo.css';

/**
 * The resume builder tile: a resume that writes itself, as a short film that loops while the tile is on screen.
 *
 *   The header comes in (a round monogram, the name, a line for the role), then every section is written in turn: its
 *   heading appears and its lines are drawn from left to right, the skills as small chips that pop in. When the
 *   resume is done a PDF button pops in at the top right. Then it holds, fades out and starts again.
 *
 * The page is made of the shapes of a resume, with real words only for the name and the headings, so there is
 * nothing to read. It keeps one size throughout. It starts when the tile is mostly in view and stops when it
 * leaves. For people who asked for less motion it shows the finished resume. Decorative (aria-hidden): the tile's
 * title and sentence carry the meaning. The name is a placeholder.
 */

// Times in ms (the delays inside the film are in ResumeDemo.css, set from --k)
const FILM_MS = 3200; // everything has been written
const HOLD_MS = 3200; // the finished resume stays
const FADE_MS = 500; // keep the same as the opacity transition of .fx-rs in ResumeDemo.css

// What the page is made of, in the order it is written. A line is a width, a chip row is a list of widths.
const SECTIONS = [
  { heading: 'Projects', lines: [92, 74] },
  { heading: 'Skills', chips: [3.25, 2.5, 3.5, 2.75] },
  { heading: 'Coding', lines: [86, 58] },
];

// Every part with the place it has in the order of writing (--k): the header is 0 and 1, then each heading and its lines
const LAYOUT = (() => {
  let k = 2;
  return SECTIONS.map((section) => {
    const heading = k;
    k += 1;
    const items = (section.lines || section.chips).map((size) => {
      const item = { size, k };
      k += 1;
      return item;
    });
    return { ...section, heading: section.heading, headingK: heading, items };
  });
})();

export default function ResumeDemo() {
  const [ref, inView, reduced] = usePlay();
  const [on, setOn] = useState(false); // the film is running
  const [leaving, setLeaving] = useState(false); // the finished resume is fading out

  useEffect(() => {
    if (reduced) return undefined;
    if (!inView) {
      setOn(false);
      setLeaving(false);
      return undefined;
    }
    const timers = [];
    const later = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    const cycle = () => {
      setLeaving(false);
      setOn(true);
      later(FILM_MS + HOLD_MS, () => setLeaving(true));
      later(FILM_MS + HOLD_MS + FADE_MS, () => {
        setOn(false);
        setLeaving(false);
      });
      // a short gap with the page empty, so the animations start again from the beginning
      later(FILM_MS + HOLD_MS + FADE_MS + 120, cycle);
    };
    cycle();
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [inView, reduced]);

  const play = reduced ? true : on;
  return (
    <div ref={ref} className="fx-rs" data-play={play ? 'true' : 'false'} data-leave={leaving ? 'true' : 'false'} aria-hidden="true">
      <div className="fx-rs-paper">
        <div className="fx-rs-head" style={{ '--k': 0 }}>
          <span className="fx-rs-avatar">YN</span>
          <span className="fx-rs-who">
            <b>Your Name</b>
            <i className="fx-rs-line" style={{ '--w': '58%', '--k': 1 }} />
          </span>
          <span className="fx-rs-pdf">
            <DownloadSimpleIcon size={14} weight="bold" aria-hidden="true" />
            PDF
          </span>
        </div>

        {LAYOUT.map((section) => (
          <div key={section.heading} className="fx-rs-sec">
            <span className="fx-rs-h" style={{ '--k': section.headingK }}>
              {section.heading}
            </span>
            {section.lines ? (
              section.items.map((item) => <i key={item.k} className="fx-rs-line" style={{ '--w': `${item.size}%`, '--k': item.k }} />)
            ) : (
              <span className="fx-rs-chips">
                {section.items.map((item) => (
                  <i key={item.k} className="fx-rs-chip" style={{ '--cw': `${item.size}rem`, '--k': item.k }} />
                ))}
              </span>
            )}
          </div>
        ))}      </div>
    </div>
  );
}
