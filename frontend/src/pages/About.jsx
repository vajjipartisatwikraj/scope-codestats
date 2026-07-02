import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowForward, LocationCity, Lightbulb, EmojiEvents, Groups } from '@mui/icons-material';

const About = () => {
  const navigate = useNavigate();

  // Add landing-page class to body element
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

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
            className="pointer-events-none absolute inset-y-0 left-0 h-full w-[110%] max-w-none object-cover opacity-70 [object-position:center_40%] -translate-x-[7%]"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_230229_7c9bc431-46cf-489a-948d-e8144d8eb5d4.mp4"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.22),transparent_70%)] blur-3xl" />
          <div className="relative mx-auto max-w-5xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(120,200,255)] shadow-[0_0_8px_rgba(0,170,255,0.9)]" />
              About CodeStats
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-7xl">
              Built by MLRIT students, <br />
              <span className="italic text-white/70">for MLRIT students.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-base leading-relaxed text-white/70 md:text-lg">
              CodeStats is the coding assessment platform built by SCOPE Club — the central coding club of MLR Institute of Technology.
            </p>
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
              We're actively building out this page. Check back soon for the full story behind CodeStats and SCOPE Club.
            </p>
          </div>
        </section>

        {/* --- Temporarily hidden: only the HERO section is shown for now.
            Change `false` to `true` below to restore these sections. --- */}
        {false && (
          <>
        {/* MISSION + STORY */}
        <section className="px-6 py-24 md:px-12">
          <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1fr_1.3fr] md:gap-20">
            <div className="md:sticky md:top-32 md:self-start">
              <div className="mb-4 text-xs uppercase tracking-[0.25em] text-white/55">Our mission</div>
              <h2 className="font-display text-3xl leading-[1.1] tracking-tight md:text-5xl">
                Measure what <span className="italic text-white/70">actually</span> matters.
              </h2>
            </div>
            <div className="space-y-6 text-[15px] leading-relaxed text-white/70 md:text-[17px]">
              <p>
                Software is built in editors, not on whiteboards. So our assessments are too. Students write real code against problems that reflect the work — then get instant, honest feedback on how they did.
              </p>
              <p>
                Behind the scenes, CodeStats quietly turns every submission into insight. Teachers see where a class is struggling, students see how they're improving, and everyone works from the same clear picture — no proctoring, no surveillance, just performance.
              </p>
              <p>
                We're a group of MLRIT students — the SCOPE Club — who love building things. We made CodeStats for our own campus because we wanted it to exist.
              </p>
            </div>
          </div>
        </section>

        {/* VALUES */}
        <section className="px-6 py-24 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/55">What we believe</div>
              <h2 className="font-display text-3xl tracking-tight md:text-5xl">Principles, not posture.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: <LocationCity className="h-5 w-5 text-white" />,
                  title: "Signal over theater",
                  copy: "Every challenge is built from real problems. No riddles, no gotchas, no whiteboard recall.",
                },
                {
                  icon: <Lightbulb className="h-5 w-5 text-white" />,
                  title: "Fair by default",
                  copy: "Standardized environments, accessible tooling, zero hidden context. The same stage for every student.",
                },
                {
                  icon: <EmojiEvents className="h-5 w-5 text-white" />,
                  title: "Cinematic detail",
                  copy: "We obsess over the small things — timing, motion, type. Assessment should feel as crafted as the work.",
                },
              ].map((v) => (
                <div key={v.title} className="liquid-glass rounded-[1.25rem] p-7">
                  <div className="liquid-glass mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl">
                    {v.icon}
                  </div>
                  <h3 className="font-display text-xl">{v.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/65">{v.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="px-6 py-24 md:px-12">
          <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 md:grid-cols-4 md:divide-y-0 md:divide-x">
            {[
              { stat: "1", label: "Campus — MLRIT" },
              { stat: "3,000+", label: "Students assessed" },
              { stat: "50+", label: "Teachers onboard" },
              { stat: "2019", label: "SCOPE Club founded" },
            ].map((s) => (
              <div key={s.label} className="px-2 py-8 md:px-10 md:py-4 text-center">
                <div className="font-display text-5xl tracking-tight text-white md:text-6xl">{s.stat}</div>
                <div className="mt-3 text-xs uppercase tracking-[0.2em] text-white/55">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TEAM */}
        <section className="px-6 py-24 md:px-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/55">The team</div>
                <h2 className="font-display text-3xl tracking-tight md:text-5xl">Builders, first.</h2>
              </div>
              <Groups className="h-7 w-7 text-white/50" />
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {[
                { name: "Satwik Tata", role: "Founder & Developer", bio: "Building SCOPE to revolutionize coding assessments. Believes in measurable skill." },
                { name: "MLRIT Team", role: "Core Contributors", bio: "Students and faculty working together to build the future of technical education." },
                { name: "You?", role: "Join Us", bio: "We're always looking for passionate contributors who want to make assessment better." },
              ].map((p) => (
                <div key={p.name} className="liquid-glass rounded-[1.25rem] p-6">
                  <div className="liquid-glass flex h-12 w-12 items-center justify-center rounded-xl font-display text-lg">
                    {p.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="mt-5 font-display text-xl">{p.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-[rgb(120,200,255)]/80">{p.role}</div>
                  <p className="mt-3 text-sm leading-relaxed text-white/65">{p.bio}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden px-6 py-32 md:px-12">
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.2),transparent_70%)] blur-3xl" />
          <div className="relative mx-auto max-w-3xl text-center">
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-6xl">
              Ready to <span className="italic text-white/70">start coding?</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-white/65">
              Log in with your MLRIT account and jump into your first assessment.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/login')}
                className="liquid-glass-strong group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                Login
                <ArrowForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="liquid-glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white/90 hover:text-white"
              >
                Talk to us
              </button>
            </div>
          </div>
        </section>
          </>
        )}
      </main>
    </>
  );
};

export default About;
