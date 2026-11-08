import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';
import brand from '../../../brand';
import landingConfig from '../landingConfig';
import { BackdropVideo } from './Videos';

/** "Ready to level up your coding?" with a Login and a Learn more button, over a background video. */
export default function CtaSection() {
  const navigate = useNavigate();
  return (
    <section className="lp-sec-lg lp-pad relative overflow-hidden">
      <BackdropVideo src={landingConfig.media.cta} parallax />
      <div className="absolute inset-0 z-[1] bg-black/55" />
      <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-t from-black to-transparent pointer-events-none" />
      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <h2 className="lp-cta-title font-display">
          Ready to level up <br />
          <span className="italic text-white/70">your coding?</span>
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base text-white/70">
          Log in with your {brand.names.institution} account and start practicing today, one assessment at a time.
        </p>
        <div className="lp-cta-row lp-cta-row--center mt-10">
          <button onClick={() => navigate('/login')} className="liquid-glass-strong group inline-flex items-center gap-2 rounded-full px-8 py-4 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
            Login
            <ArrowForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={() => navigate('/about')} className="liquid-glass inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white/90 hover:text-white">
            Learn more
          </button>
        </div>
      </div>
    </section>
  );
}
