import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward, KeyboardArrowDown } from '@mui/icons-material';
import brand, { fill } from '../../../brand';
import useLoginConfig from '../../../hooks/useLoginConfig';

// FAQ Accordion Component - Custom implementation matching Dark Hero Section
const FAQAccordion = () => {
  // Who can sign in depends on how the server is set up (college addresses, or a list of addresses)
  const { loginMode } = useLoginConfig();
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData = [
    {
      cat: 'Platform',
      q: `What exactly is ${brand.codeStats.name}?`,
      a: fill(`${brand.codeStats.name} is a coding assessment and performance analysis platform. Students take coding assessments, join cohorts, practice in the arena, and track how their coding performance improves over time. ${brand.codeStats.name} is available for {institutionFull}.`),
    },
    {
      cat: 'Access',
      q: `Who can use ${brand.codeStats.name}?`,
      a:
        loginMode === 'allowlist'
          ? fill(`${brand.codeStats.name} is available for {institution}. Students, teachers, and admins whose email address has been added by an admin. You sign in with the Google account for that address, from any email domain. It isn't open to people who haven't been added.`)
          : fill(`${brand.codeStats.name} is available for the {institution} community: students, teachers, and admins of {institutionFull}. It isn't open to other campuses or to external recruiters and hiring teams.`),
    },
    {
      cat: 'For admins',
      q: 'What can admins and teachers do?',
      a: 'Admins and teachers can create and schedule coding assessments, build and manage cohorts with modules and questions, add and organise students, and review every submission, all from a dedicated management dashboard.',
    },
    {
      cat: 'Analytics',
      q: 'How can we analyse student performance?',
      a: fill(`${brand.codeStats.name} turns every submission into insight. You get class and cohort-level analytics, individual progress over time, question-wise accuracy, and clear views of where students are strong or struggling, so teaching decisions are backed by real data.`),
    },
  ];

  return (
    <div className="w-full space-y-3">
      {faqData.map((f, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={i}
            className={`group relative overflow-hidden rounded-2xl border bg-black px-5 transition-all duration-500 ease-out ${
              isOpen
                ? 'border-[rgba(0,170,255,0.45)] shadow-[0_0_20px_rgba(0,170,255,0.15)]'
                : 'border-white/[0.08] hover:border-[rgba(0,170,255,0.35)]'
            }`}
          >
            {/* Top glow line when open */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,170,255,0.4)] to-transparent transition-all duration-700 ease-out ${
                isOpen ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
              }`}
            />

            {/* Accordion Trigger */}
            <button
              id={`faq-button-${i}`}
              type="button"
              onClick={() => toggleAccordion(i)}
              aria-expanded={isOpen}
              aria-controls={`faq-panel-${i}`}
              className="lp-faq-trigger relative flex w-full items-center py-4 text-left"
            >
              <div className="flex flex-1 items-center gap-4 pr-4">
                <span
                  className={`font-display text-xs tabular-nums transition-colors duration-500 ${
                    isOpen ? 'text-[rgb(120,200,255)]' : 'text-white/50'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1">
                  <span
                    className={`text-xs uppercase tracking-[0.2em] transition-colors duration-500 ${
                      isOpen ? 'text-[rgb(120,200,255)]' : 'text-[rgb(120,200,255)]/80'
                    }`}
                  >
                    {f.cat}
                  </span>
                  <span className="text-base font-medium text-white md:text-[17px]">{f.q}</span>
                </div>
              </div>

              {/* Chevron icon with smooth rotation */}
              <KeyboardArrowDown
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 text-white transition-all duration-500 ease-out ${
                  isOpen ? 'rotate-180 text-[rgb(120,200,255)]' : 'rotate-0'
                }`}
              />
            </button>

            {/* The answer. Its height follows its text, so it stays right when the phone is rotated */}
            <div
              id={`faq-panel-${i}`}
              role="region"
              aria-labelledby={`faq-button-${i}`}
              className="lp-acc"
              data-open={isOpen ? 'true' : 'false'}
            >
              <div className="lp-acc-in">
                <div className="lp-acc-body">{f.a}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** The FAQ section: a heading and a link to the contact page on the left, the questions on the right. */
export default function FaqSection() {
  return (
    <section className="lp-sec-lg lp-pad relative overflow-hidden bg-black">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-[0.35]"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,170,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,170,255,0.18) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 70% at 50% 0%, black 0%, rgba(0,0,0,0.6) 40%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 60% 70% at 50% 0%, black 0%, rgba(0,0,0,0.6) 40%, transparent 75%)',
        }}
      />
      <div className="lp-faq-glow pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.18),transparent_70%)] blur-3xl" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="lp-faq-grid relative mx-auto max-w-6xl">
        <div className="lp-faq-aside">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(0,170,255,0.3)] bg-[rgba(0,136,204,0.12)] px-3 py-1 text-xs uppercase tracking-[0.2em] text-[rgb(120,200,255)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(120,200,255)] shadow-[0_0_8px_rgba(0,170,255,0.9)]" />
            FAQ
          </div>
          <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
            Questions, <br />
            <span className="italic text-white/65">answered with clarity.</span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
            Everything you need to know about {brand.codeStats.name}: what it does, who it's for, and how {brand.names.institution} uses it.
            Still can't find your answer?
          </p>

          <Link
            to="/contact"
            className="group relative mt-8 inline-flex w-full max-w-sm items-center justify-between overflow-hidden rounded-2xl border border-[rgba(0,170,255,0.25)] bg-[rgba(0,136,204,0.07)] px-5 py-4 transition-all duration-500 hover:border-[rgba(0,170,255,0.55)] hover:bg-[rgba(0,136,204,0.14)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,170,255,0.25),transparent_60%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
            <div className="relative">
              <div className="text-xs uppercase tracking-[0.18em] text-white/55">Still curious?</div>
              <div className="mt-1 text-sm font-medium text-white">Talk to our team</div>
            </div>
            <ArrowForward aria-hidden="true" className="relative h-4 w-4 text-white/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
          </Link>
        </div>

        <FAQAccordion />
      </div>
    </section>
  );
}
