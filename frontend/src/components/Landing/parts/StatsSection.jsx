import React, { useEffect, useState } from 'react';
import brand, { fill } from '../../../brand';
import { apiUrl } from '../../../config/apiConfig';
import CountUp from './CountUp';

/**
 * The big numbers under the hero: students, coding questions and teachers.
 *
 * Each number is the institution's own when it sets one in brand.json ("landing.stats", together with the labels and
 * the way numbers are grouped, "landing.numberLocale"), and otherwise the real count from the server
 * (GET /api/users/stats). A number that is not known (the server cannot be reached, or the count is zero) is left
 * out instead of being replaced by an invented one, and the whole section is left out when none is known.
 *
 *   "landing": {
 *     "numberLocale": "en-IN",
 *     "stats": { "students": { "value": 100000, "label": "Students registered" },
 *                "questions": { ... }, "teachers": { ... } }
 *   }
 */
const STATS = [
  { key: 'students', serverKey: 'totalStudents', label: 'Students registered' },
  { key: 'questions', serverKey: 'totalQuestions', label: 'Coding questions available' },
  { key: 'teachers', serverKey: 'totalTeachers', label: 'Teachers onboarded' },
];

export default function StatsSection() {
  const [server, setServer] = useState(null);
  const landing = brand.institution.landing || {};
  const allSet = STATS.every((stat) => Number(landing.stats?.[stat.key]?.value) > 0);

  useEffect(() => {
    // Nothing to ask when the institution has set every number itself
    if (allSet) return undefined;
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`${apiUrl}/users/stats`, { signal: controller.signal });
        if (!response.ok) return;
        setServer(await response.json());
      } catch (error) {
        // Not reachable: the numbers that are not set in brand.json are simply not shown
      }
    })();
    return () => controller.abort();
  }, [allSet]);

  const items = STATS.map((stat) => ({
    key: stat.key,
    value: Number(landing.stats?.[stat.key]?.value ?? server?.[stat.serverKey] ?? 0),
    label: fill(landing.stats?.[stat.key]?.label ?? stat.label),
  })).filter((item) => item.value > 0);

  if (items.length === 0) return null;

  return (
    <section className="lp-sec lp-pad bg-black">
      <div className="mx-auto flex max-w-6xl flex-col divide-y divide-white/10 md:flex-row md:justify-center md:divide-y-0 md:divide-x">
        {items.map((item) => (
          <div key={item.key} className="lp-stat">
            <CountUp end={item.value} suffix="+" locale={landing.numberLocale} className="lp-stat-num font-display text-white" />
            <div className="mt-4 text-sm tracking-wide text-white/60">{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}