import brand from '../../brand';
import React from 'react';
import './Landing.css';
import { ArrowForward, Code, PlayArrow, Star, StarHalf, StarBorder } from '@mui/icons-material';
import AboutSection from './parts/AboutSection';
import { BackdropVideo, DemoVideo } from './parts/Videos';
import StatsSection from './parts/StatsSection';
import FeatureShowcase from './parts/FeatureShowcase';
import InstitutionsSection from './parts/InstitutionsSection';
import LeaderboardSection from './parts/LeaderboardSection';
import FaqSection from './parts/FaqSection';
import CtaSection from './parts/CtaSection';
import LandingFooter from './parts/LandingFooter';
import useLandingShell from './parts/useLandingShell';
import { scrollToSection } from './parts/smoothScroll';
import { HeroBackdrop, HeroContent, useHeroScroll } from './parts/HeroScroll';
import ScrollProgress from './parts/ScrollProgress';
import landingConfig from './landingConfig';

/**
 * The landing page every institution gets unless it has a page of its own (see ./index.jsx).
 * Its numbers, footer title and a few headings can still be changed per institution in brand.json
 * ("landing"); see the House of Abundance folder for the list.
 */

// Testimonial Card Component
const TestimonialCard = ({ t, duplicate = false }) => {
  return (
    <div className="group relative lp-tcard" data-dup={duplicate ? 'true' : undefined} aria-hidden={duplicate ? 'true' : undefined}>
      <div className="relative flex-1 flex flex-col justify-between rounded-[1rem] p-4 md:p-5 transition-all duration-500 hover:-translate-y-1 hover:bg-[rgba(0,136,204,0.18)] hover:border-[rgba(0,170,255,0.55)] bg-[rgba(0,136,204,0.08)] border border-[rgba(0,136,204,0.25)] shadow-[0_0_25px_rgba(0,136,204,0.2)] overflow-hidden" style={{ clipPath: 'inset(0 0 0 0 round 1rem)' }}>
        {/* Reduced glow effects - contained within card */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,136,204,0.15),rgba(0,136,204,0.05)_50%,transparent_80%)] opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,170,255,0.12),transparent_40%)] opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-white leading-tight">{t.name}</div>
                <div className="truncate text-xs text-white/60 leading-tight mt-0.5">{t.role}</div>
              </div>
              <div className="flex gap-0.5 shrink-0 pt-0.5" role="img" aria-label={`${t.rating ?? 5} out of 5 stars`}>
                {[...Array(5)].map((_, i) => {
                  const rating = t.rating ?? 5;
                  const starValue = i + 1;
                  const activeColor = 'rgb(120,200,255)';
                  const inactiveColor = 'rgba(255,255,255,0.25)';
                  if (rating >= starValue) {
                    return <Star key={i} style={{ fontSize: '14px', fill: activeColor, color: activeColor }} />;
                  }
                  if (rating >= starValue - 0.5) {
                    return <StarHalf key={i} style={{ fontSize: '14px', fill: activeColor, color: activeColor }} />;
                  }
                  return <StarBorder key={i} style={{ fontSize: '14px', fill: inactiveColor, color: inactiveColor }} />;
                })}
              </div>
            </div>
            <p className="mt-3 font-display text-[15px] leading-snug text-white/90 md:text-[16px]">
              "{t.quote}"
            </p>
          </div>
          <div className="mt-4">
            <span className="inline-block rounded-full px-2.5 py-0.5 text-xs tracking-[0.1em] text-[rgb(120,200,255)] bg-[rgba(0,136,204,0.18)] border border-[rgba(0,170,255,0.3)]">
              {t.tag}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MarqueeRow = ({ reverse = false, duration = 50, testimonials }) => {
  return (
    <div className="pause-on-hover relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-black to-transparent sm:w-24 md:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-black to-transparent sm:w-24 md:w-40" />

      <div
        className={`marquee-content flex gap-4 md:gap-5 py-2 ${
          reverse ? 'animate-marquee-rtl' : 'animate-marquee-ltr'
        }`}
        style={{
          width: 'max-content',
          '--duration': `${duration}s`
        }}
      >
        {testimonials.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
        {testimonials.map((t, i) => (
          <TestimonialCard key={`${t.name}-dup-${i}`} t={t} duplicate />
        ))}
      </div>
    </div>
  );
};

const TestimonialsMarquee = () => {
  // The testimonials are the institution's own words (src/brand/institutions/<name>/testimonials.js).
  // An institution without any shows no section.
  const testimonials = brand.institution.testimonials || [];
  if (testimonials.length === 0) return null;

  return (
    <section className="lp-sec relative overflow-hidden bg-black px-0">
      <style>{`
        @keyframes marquee-ltr {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        @keyframes marquee-rtl {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee-ltr {
          animation: marquee-ltr var(--duration, 50s) linear infinite;
        }
        .animate-marquee-rtl {
          animation: marquee-rtl var(--duration, 50s) linear infinite;
        }
        .pause-on-hover:hover .marquee-content {
          animation-play-state: paused;
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04),transparent_60%)]" />
      <div className="lp-pad relative mx-auto mb-10 max-w-6xl text-center">
        <div className="mb-2.5 text-xs uppercase tracking-[0.25em] text-white/55">
          Testimonials
        </div>
        <h2 className="font-display text-2xl tracking-tight md:text-4xl">
          Loved by <span className="italic text-white/70">students &amp; faculty at {brand.names.institution}.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm text-white/55">
          Real words from the people who use {brand.names.platform} every week to learn, teach, and measure how their code is improving.
        </p>
      </div>
      <div className="relative space-y-4 md:space-y-5">
        <MarqueeRow duration={45} testimonials={testimonials} />
        <MarqueeRow reverse duration={55} testimonials={testimonials} />
      </div>
    </section>
  );
};

// Main Landing Component
const DefaultLanding = () => {
  const { token, navigate } = useLandingShell();
  const hero = useHeroScroll();
  const demoVideo = brand.platform.demoVideo;

  // Wording the institution sets for this page (src/brand/institutions/<name>/brand.json, "landing").
  // Whatever it leaves out keeps the default.
  const landing = brand.institution.landing || {};
  // The numbers under the hero buttons are the institution's own: ["3,000+ students", ...] in brand.json (landing.heroStats)
  const heroStats = Array.isArray(landing.heroStats) ? landing.heroStats.filter(Boolean) : [];

  if (token) return null;

  return (
    <>
      <main className="lp relative w-full bg-black font-body text-white antialiased selection:bg-white/20">
        {/* HERO Section */}
      <ScrollProgress />
      <section ref={hero.ref} className="lp-hero">
        <HeroBackdrop motion={hero}>
          <BackdropVideo src={landingConfig.media.hero} />
        </HeroBackdrop>
        <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/4 z-[1] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

        <div className="lp-pad lp-hero-inner">
          <div className="lp-hero-top" aria-hidden="true" />

          <HeroContent motion={hero} className="lp-hero-main">
            <div className="lp-eyebrow">
              {landingConfig.hero.eyebrow}
            </div>
            <h1 className="lp-h1 font-display font-normal text-white">
              {landingConfig.hero.titleTop}
              <br />
              <span className="italic text-white/80">{landingConfig.hero.titleAccent}</span>
            </h1>
            <p className="lp-lead font-normal">
              {landingConfig.hero.lead}
            </p>
            <div className="lp-cta-row">
              <button onClick={() => navigate('/login')} className="liquid-glass-strong group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
                {landingConfig.hero.loginLabel}
                <ArrowForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {demoVideo ? (
                <a
                  href="#code-snippet"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('code-snippet');
                  }}
                  className="liquid-glass group inline-flex items-center gap-3 rounded-full pl-1.5 pr-5 py-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white"
                >
                  <span className="liquid-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <PlayArrow className="h-3.5 w-3.5 fill-white text-white" />
                  </span>
                  Watch a sample assessment
                </a>
              ) : null}
            </div>
          </HeroContent>

          {!landing.hideHeroFooter ? (
            <div className="lp-hero-foot">
              <div className="lp-built">
                <Code aria-hidden="true" />
                <span>Built by {brand.names.builder} for {brand.names.institution}</span>
              </div>
              {heroStats.length > 0 ? (
                <div className="lp-hero-stats">
                  {heroStats.map((stat, index) => (
                    <React.Fragment key={stat}>
                      {index > 0 ? <span className="lp-sep" aria-hidden="true" /> : null}
                      <span>{stat}</span>
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {/* 1. ABOUT Section */}
      <AboutSection />

      {/* 2. STATS Section */}
      <StatsSection />

      {/* EVERYTHING CODESTATS OFFERS: the animated feature tiles, on every landing page */}
      <FeatureShowcase />

      {/* 3. CAMPUSES Section */}
      <InstitutionsSection />

      {/* 4. LEADERBOARD Section */}
      <LeaderboardSection />

      {/* 5. CODING SNIPPET Section (only when the platform has a sample video) */}
      {demoVideo ? (
        <section id="code-snippet" className="lp-sec lp-pad scroll-mt-24 bg-black">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/60">Live sample</div>
              <h2 className="lp-h2 font-display">
                A real challenge, <span className="italic text-white/70">auto-graded.</span>
              </h2>
            </div>
            <div className="liquid-glass-strong rounded-[1.25rem] overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 md:px-5">
                <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                <span className="ml-3 text-xs tracking-wider text-white/55">code-stats</span>
              </div>
              <DemoVideo src={demoVideo} speed={2.5} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. TESTIMONIALS Section */}
      <TestimonialsMarquee />

      {/* 7. FAQ Section */}
      <FaqSection />

      {/* 8. CTA Section */}
      <CtaSection />

      {/* 9. FOOTER Section */}
      <LandingFooter />
      </main>
    </>
  );
};

export default DefaultLanding;
