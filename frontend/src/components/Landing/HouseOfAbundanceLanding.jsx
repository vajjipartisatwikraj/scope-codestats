import brand from '../../brand';
import React from 'react';
import './Landing.css';
import { ArrowForward } from '@mui/icons-material';
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play';
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
 * The landing page of The House of Abundance Foundation (shown when the build's institution names
 * it as its landing page: brand.json "landingPage": "houseofabundance", see ./index.jsx).
 *
 * What changes with the data, not the code (src/brand/institutions/houseofabundance/brand.json):
 *   landing.stats / numberLocale   the numbers under the hero (1,00,000+ students, ...)
 *   landing.video                  { src, title } the video section; the section is left out without it
 *   landing.footerTitle            the name at the top of the footer
 *
 * (The paragraph in brand.json "about.text" belongs to the About page, /about, not to this page.)
 *
 * The sections it shares with the default page (stats, institution, leaderboard, FAQ, call to
 * action, footer) are in ./parts.
 */

const HouseOfAbundanceLanding = () => {
  const { token, navigate } = useLandingShell();
  const hero = useHeroScroll();
  const landing = brand.institution.landing || {};
  const video = landing.video && landing.video.src ? landing.video : null;

  if (token) return null;

  return (
    <main className="lp relative w-full bg-black font-body text-white antialiased selection:bg-white/20">
      {/* HERO */}
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
              {video ? (
                <a
                  href="#watch"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection('watch');
                  }}
                  className="liquid-glass group inline-flex items-center gap-3 rounded-full pl-1.5 pr-5 py-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white"
                >
                  <span className="liquid-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <PlayIcon size={14} weight="fill" aria-hidden="true" />
                  </span>
                  Watch the video
                </a>
              ) : null}
            </div>
          </HeroContent>
        </div>
      </section>

      {/* ABOUT: "CodeStats gives House of Abundance students a real place to ..." reveals itself as it scrolls into view */}
      <AboutSection />

      {/* NUMBERS */}
      <StatsSection />

      {/* EVERYTHING CODESTATS OFFERS */}
      <FeatureShowcase />

      {/* VIDEO */}
      {video ? (
        <section id="watch" className="lp-sec lp-pad scroll-mt-24 bg-black">
          <div className="mx-auto max-w-5xl">
            <div className="mb-8">
              <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/60">Watch</div>
              <h2 className="lp-h2 font-display">
                See {brand.codeStats.name} <span className="italic text-white/70">in action.</span>
              </h2>
            </div>
            <div className="liquid-glass-strong rounded-[1.25rem] overflow-hidden">
              <DemoVideo src={video.src} title={video.title || `${brand.codeStats.name} at ${brand.names.institution}`} controls />
            </div>
          </div>
        </section>
      ) : null}

      {/* INSTITUTION, LEADERBOARD, FAQ, CALL TO ACTION, FOOTER */}
      <InstitutionsSection />
      <LeaderboardSection />
      <FaqSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
};

export default HouseOfAbundanceLanding;
