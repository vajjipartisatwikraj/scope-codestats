import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Book, Code, Terminal, Lightbulb, Groups, ArrowForward, Search } from '@mui/icons-material';

const Docs = () => {
  const navigate = useNavigate();

  // Add landing-page class to body element
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  const sections = [
    {
      icon: <Code className="h-5 w-5 text-white" />,
      label: "Getting started",
      items: ["Logging in", "Your dashboard", "Taking your first assessment", "Understanding your score"],
    },
    {
      icon: <Code className="h-5 w-5 text-white" />,
      label: "Assessments",
      items: ["Question types", "The code editor", "Running & submitting", "Instant evaluation"],
    },
    {
      icon: <Groups className="h-5 w-5 text-white" />,
      label: "Cohorts",
      items: ["Joining a cohort", "Modules & questions", "Deadlines", "Tracking progress"],
    },
    {
      icon: <Terminal className="h-5 w-5 text-white" />,
      label: "Practice arena",
      items: ["Daily practice", "Topic-wise problems", "Custom practice tests", "Reviewing solutions"],
    },
    {
      icon: <Lightbulb className="h-5 w-5 text-white" />,
      label: "Leaderboard & analytics",
      items: ["How ranking works", "Performance insights", "Strengths & gaps", "Progress over time"],
    },
    {
      icon: <Book className="h-5 w-5 text-white" />,
      label: "For teachers & admins",
      items: ["Creating assessments", "Managing cohorts", "Class-level analytics", "Managing students"],
    },
  ];

  return (
    <>
      <main className="relative w-full bg-black font-body text-white antialiased">
        {/* HERO */}
        <section className="relative overflow-hidden px-6 pt-40 pb-20 md:px-12 md:pt-48 md:pb-24">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-[100%] max-w-none object-cover opacity-70 [object-position:center_85%] -translate-x-[0%]"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.22),transparent_70%)] blur-3xl" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-white/70">
              <Book className="h-3 w-3" />
              Documentation
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-7xl">
              The <span className="italic text-white/70">CodeStats</span> guide.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              Everything students, teachers, and admins at MLRIT need to get the most out of CodeStats — from taking assessments and joining cohorts to the practice arena and performance analytics.
            </p>

            {/* Search bar — temporarily hidden. Change `false` to `true` to restore. */}
            {false && (
            <div className="mx-auto mt-10 flex max-w-xl items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-5 py-3 text-left">
              <Search className="h-4 w-4 text-white/55" />
              <input
                type="text"
                placeholder="Search docs — try 'webhooks' or 'Python runtime'"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
              <kbd className="rounded-md border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[10px] text-white/60">⌘K</kbd>
            </div>
            )}
          </div>
        </section>

        {/* Coming soon chip */}
        <section className="px-6 pb-20 md:px-12 md:pb-24">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,170,255,0.3)] bg-[rgba(0,136,204,0.1)] px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[rgb(120,200,255)]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgb(120,200,255)] shadow-[0_0_8px_rgba(0,170,255,0.9)]" />
              More coming soon
            </div>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-white/55">
              We're actively writing the full CodeStats guides. Detailed docs for assessments, cohorts, and analytics are on the way.
            </p>
          </div>
        </section>

        {/* --- Temporarily hidden: only the HERO section is shown for now.
            Change `false` to `true` below to restore these sections. --- */}
        {false && (
          <>
        {/* SECTION GRID */}
        <section className="px-6 py-20 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {sections.map((s) => (
                <div
                  key={s.label}
                  className="liquid-glass group relative overflow-hidden rounded-[1.25rem] p-7 transition-all duration-300 hover:border-[rgba(0,170,255,0.35)]"
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,170,255,0.18),transparent_70%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative">
                    <div className="liquid-glass mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl">
                      {s.icon}
                    </div>
                    <div className="font-display text-xl">{s.label}</div>
                    <ul className="mt-4 space-y-2">
                      {s.items.map((i) => (
                        <li key={i}>
                          <a
                            href="#"
                            className="group/link flex items-center justify-between text-sm text-white/65 transition-colors hover:text-white"
                          >
                            <span>{i}</span>
                            <ArrowForward className="h-3.5 w-3.5 opacity-0 transition-all group-hover/link:translate-x-0.5 group-hover/link:opacity-100" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* QUICKSTART */}
        <section className="px-6 py-24 md:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/55">Quickstart</div>
            <h2 className="font-display text-3xl tracking-tight md:text-5xl">
              From login to <span className="italic text-white/70">first submission</span> in a minute.
            </h2>

            <div className="mt-10 liquid-glass-strong overflow-hidden rounded-[1.25rem]">
              <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-[11px] tracking-wider text-white/50">getting-started</span>
              </div>
              <pre className="overflow-x-auto bg-black/40 px-6 py-6 text-sm leading-relaxed text-white/85">
{`# 1. Sign in with your MLRIT account
Head to the login page and use your college credentials.

# 2. Open your dashboard
See your cohorts, upcoming assessments, and progress at a glance.

# 3. Start an assessment or practice
Pick a cohort question or jump into the practice arena.

# 4. Write, run, and submit
Solve in the editor, run against sample cases, then submit.

# 5. Review your performance
Get instant results and track how you improve over time.`}
              </pre>
            </div>
          </div>
        </section>
          </>
        )}
      </main>
    </>
  );
};

export default Docs;
