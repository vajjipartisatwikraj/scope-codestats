# Product

<!-- impeccable:product-schema 1 -->

> Status: written without a live interview. Every line marked **(inferred)** came from the repository and the owner's brief, not from a confirmed answer. Correct those lines and remove the marker.

## Platform

web

## Users

- **Students of MLR Institute of Technology (MLRIT).** Undergraduates in every department and graduating year who practise coding for placements and coursework. They sign in with their college Google account, link their LeetCode, Codeforces, CodeChef, HackerRank and GitHub usernames, join cohorts, take practice and communication tests, check where they stand against classmates, build a resume and look for courses and opportunities. They use the product on laptops, often in the evening, and on phones for quick checks. **(inferred: usage times and devices)**
- **Teachers and admins.** Faculty and SCOPE Club coordinators who run cohorts, schedule tests, manage user groups and academic years, run the nightly profile sync and read performance analytics for whole departments and years. Teacher access is granted by an admin after a request.
- Not for external recruiters or other campuses. Access is limited to the MLRIT community.

## Product Purpose

CodeStats is the in-house coding assessment and performance platform built by SCOPE Club for MLRIT. It turns scattered coding practice into one measurable record: a student's problems solved, contests, ratings and GitHub activity across platforms are combined into a score, a rank and a weekly consistency level, and the college's own cohorts, practice arena and communication tests add to it.

Success for a student is steady practice and a rising rank. Success for staff is seeing who is progressing, who has gone quiet and how a department compares, without opening five websites.

## Positioning

Public coding sites each show one slice of a student. CodeStats is the only place that adds all of them together, ranks students within their own college by department and year, keeps the history of scores and ranks, and runs the college's own assessments next to them.

## Operating Context

- Students and staff work in IST. Profile data is synced from the external platforms every night at 12:00 AM IST and on demand by admins, so numbers are as of the last sync and the interface says when that was.
- Scores, ranks and progress are stored as sparse history. A day without a record means "unchanged", and a student who has not linked a platform has no data for it, which is different from zero.
- Rankings cover active students only. Graduated students, admins, teachers and teachers awaiting approval are excluded.
- Departments in use: AERO, CSC, CSD, CSE, CSM, CSIT, IT, ECE, MECH, EEE. Sections A to G.
- The same product serves very different screens: dense admin tables and analytics, timed tests with a code editor or a microphone, a public landing page, and a student's own dashboard.
- Timed tests and exams need a calm, low-distraction screen.

## Capabilities and Constraints

- Student: dashboard (overview, platforms, progress with score and rank history), leaderboard, cohorts with a code editor, practice arena, speech tests, CodePad, courses, opportunities, resume builder, notifications, profile and public profile.
- Teacher and admin: all of the above views plus cohort and test management, user groups, teacher requests, academic year configuration, profile sync control, ranking recalculation and the Student Performance analytics (filters by department, graduating year, section and period).
- Stack: React 18, Vite, Material UI 5, Tailwind 3, framer-motion, recharts and Monaco editor on the front end. Node, Express and MongoDB on the back end. The design tokens live in `frontend/src/theme/tokens.js` and `frontend/src/contexts/ThemeContext.jsx` publishes them; the Material UI theme for screens not yet migrated is built from them in `frontend/src/theme/createAppTheme.js`.
- Light and dark themes both ship, and a student can switch between them.
- Some screens are restricted on mobile (the app has a mobile restriction popup); those restrictions are product decisions, not design gaps. **(inferred: which screens)**
- Terminology: "cohort", "practice arena", "consistency index" (0 to 5, from how many of the last 7 days the total score changed), "score change" (over the last 7 days), "sync".

## Brand Commitments

- Name: **CodeStats**, built by **SCOPE Club** for MLR Institute of Technology. The page title is "SCOPE-Codestats".
- Logo files in use: `frontend/public/scope-blac.png`, `frontend/public/codestats.png`, `frontend/public/scope-logo.png`.
- **Typeface: Plus Jakarta Sans.** The owner replaced Nekst with it. Binding.
- **Visual references: two sample dashboards supplied by the owner** (a dark navy health overview and a light finance overview). The new look is built to resemble their character: soft rounded cards, large confident numerals, pill controls, one electric blue, a high-contrast spotlight tile. Binding.
- Both a dark and a light theme. Professional, not playful.
- Voice: direct, encouraging and specific. It tells a student what changed and what to do next. **(inferred)**

## Evidence on Hand

- Real product data lives in the application. The 100 accounts with emails `sample.NNN@mlrit.ac.in` and roll numbers starting `SMP` are synthetic sample data and must never appear as testimonials or proof.
- The landing page currently carries quotes attributed to named students. Treat them as unverified until the owner confirms they are real. **(inferred)**
- No pricing, customer counts or benchmarks exist and none may be invented.

## Product Principles

1. **The number comes first.** Each screen opens on the figure the student came for (score, rank, consistency) and everything else supports it.
2. **One number, one look.** A score, a rank or a change reads and looks the same on every screen.
3. **Quiet by default.** Colour is spent on action, selection and state, and on one spotlight per screen.
4. **Honest data.** Missing, stale and zero are different states and are shown differently. Say when the data was last synced.
5. **One language, two densities.** Students and staff share the same components. Staff screens are denser, not differently styled.

## Accessibility & Inclusion

- Target WCAG 2.2 AA in both themes: text contrast 4.5:1, interface and chart contrast 3:1, visible keyboard focus, targets of at least 44px on touch layouts. **(inferred: standard)**
- Colour is never the only carrier of meaning in charts and status. Series also differ by label, shape or pattern.
- Respect reduced motion.
- Many students use mid-range laptops and phone data: keep the interface light, self-host the font and avoid heavy effects. **(inferred)**
