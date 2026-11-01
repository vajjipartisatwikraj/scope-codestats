import brand, { fill } from '../brand';
import React, { useEffect, useState, useRef } from 'react';
import './Landing.css';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowForward,
  Code,
  PlayArrow,
  EmojiEvents,
  KeyboardArrowDown,
  LinkedIn,
  Email,
  Star,
  StarHalf,
  StarBorder
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import useLoginConfig from '../hooks/useLoginConfig';
import { motion, useScroll, useTransform, useInView, useReducedMotion } from 'framer-motion';

// CountUp Component
const CountUp = ({ end, duration = 2200, suffix = '', prefix = '', className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setValue(end);
      return;
    }
    const ease = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(Math.round(end * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, end, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

// ScrollRevealText Component
const Word = ({ children, progress, range, reduced, className = '' }) => {
  const opacity = useTransform(progress, range, [0.1, 1], {
    ease: (t) => t * t * (3 - 2 * t),
  });
  return (
    <motion.span
      style={reduced ? undefined : { opacity }}
      className={`inline-block mr-[0.25em] ${className}`}
    >
      {children}
    </motion.span>
  );
};

const ScrollRevealText = ({ segments, className = '' }) => {
  const containerRef = useRef(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.85', 'end 0.45'],
  });

  const words = segments.flatMap((seg) =>
    seg.text.split(/\s+/).filter(Boolean).map((w) => ({ text: w, className: seg.className }))
  );

  return (
    <p ref={containerRef} className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <Word key={i} progress={scrollYProgress} range={[start, end]} reduced={reduced} className={w.className}>
            {w.text}
          </Word>
        );
      })}
    </p>
  );
};

// A background video that is only loaded once its section is near the screen, and not at all
// for people who asked for less motion. Keeps a phone from downloading three videos at once.
const BackdropVideo = ({ src }) => {
  const ref = useRef(null);
  const near = useInView(ref, { once: true, margin: '400px 0px' });
  const reduced = useReducedMotion();
  return (
    <div ref={ref} className="absolute inset-0 z-0" aria-hidden="true">
      {near && !reduced ? (
        <video autoPlay loop muted playsInline className="h-full w-full object-cover" src={src} />
      ) : null}
    </div>
  );
};

// The sample assessment video, loaded when it is near the screen
const DemoVideo = ({ src }) => {
  const ref = useRef(null);
  const near = useInView(ref, { once: true, margin: '300px 0px' });
  const reduced = useReducedMotion();
  return (
    <div ref={ref} className="lp-demo">
      {near ? (
        <video
          autoPlay={!reduced}
          controls={reduced}
          loop
          muted
          playsInline
          preload="metadata"
          src={src}
          onLoadedMetadata={(e) => {
            e.currentTarget.playbackRate = 2.5;
          }}
        />
      ) : null}
    </div>
  );
};

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
      cat: "Platform",
      q: `What exactly is ${brand.codeStats.name}?`,
      a: fill(`${brand.codeStats.name} is a coding assessment and performance analysis platform. Students take coding assessments, join cohorts, practice in the arena, and track how their coding performance improves over time. ${brand.codeStats.name} is available for {institutionFull}.`),
    },
    {
      cat: "Access",
      q: `Who can use ${brand.codeStats.name}?`,
      a:
        loginMode === "allowlist"
          ? fill(`${brand.codeStats.name} is available for {institution}. Students, teachers, and admins whose email address has been added by an admin. You sign in with the Google account for that address, from any email domain. It isn't open to people who haven't been added.`)
          : fill(`${brand.codeStats.name} is available for the {institution} community: students, teachers, and admins of {institutionFull}. It isn't open to other campuses or to external recruiters and hiring teams.`),
    },
    {
      cat: "For admins",
      q: "What can admins and teachers do?",
      a: "Admins and teachers can create and schedule coding assessments, build and manage cohorts with modules and questions, add and organise students, and review every submission, all from a dedicated management dashboard.",
    },
    {
      cat: "Analytics",
      q: "How can we analyse student performance?",
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

// The footer links that lead somewhere. The others are shown as plain text until their pages exist.
const FOOTER_ROUTES = {
  About: '/about',
  Contact: '/contact',
  Docs: '/docs',
  Login: '/login',
  Register: '/register',
};

// Main Landing Component
const Landing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [stats, setStats] = useState({ students: 0, admins: 0, teachers: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardSource, setLeaderboardSource] = useState('loading'); // 'loading', 'api', 'fallback'
  const itemsPerPage = 5;
  const demoVideo = brand.platform.demoVideo;

  // Add landing-page class to body element
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/stats`);
        const data = await response.json();
        if (data) {
          setStats({
            students: data.totalStudents || 3000,
            admins: data.totalAdmins || 10,
            teachers: data.totalTeachers || 50
          });
        }
      } catch (error) {
        setStats({ students: 3000, admins: 10, teachers: 50 });
      }
    };
    fetchStats();
  }, []);

  // Fetch leaderboard from public endpoint
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardSource('loading');
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/leaderboard/public/top10`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setLeaderboard(data);
          setLeaderboardSource('api');
        } else {
          setLeaderboardSource('fallback');
          // Fallback data
          setLeaderboard([
            { rank: 1, name: 'Ananya Sharma', department: 'CSE', graduatingYear: 2026, score: 2987, institution: brand.names.institution },
            { rank: 2, name: 'Liu Wei', department: 'CSE', graduatingYear: 2025, score: 2914, institution: brand.names.institution },
            { rank: 3, name: 'Marco Rossi', department: 'IT', graduatingYear: 2026, score: 2856, institution: brand.names.institution }
          ]);
        }
      } catch (error) {
        setLeaderboardSource('fallback');
        // Fallback data
        setLeaderboard([
          { rank: 1, name: 'Ananya Sharma', department: 'CSE', graduatingYear: 2026, score: 2987, institution: brand.names.institution },
          { rank: 2, name: 'Liu Wei', department: 'CSE', graduatingYear: 2025, score: 2914, institution: brand.names.institution },
          { rank: 3, name: 'Marco Rossi', department: 'IT', graduatingYear: 2026, score: 2856, institution: brand.names.institution }
        ]);
      } finally {
        setLeaderboardLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  // Calculate paginated leaderboard
  const totalPages = Math.ceil(leaderboard.length / itemsPerPage);
  const paginatedLeaderboard = leaderboard.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (token) return null;

  const footerColumns = [
    { title: 'Platform', links: ['Assessments', 'Cohorts', 'Practice Arena', 'Leaderboard'] },
    { title: brand.names.club, links: ['About', 'Contact', 'Workshops', 'Hackathons'] },
    { title: 'Institution', links: [brand.names.institution, 'Docs', 'Login', 'Register'] },
  ];

  return (
    <>
      <main className="lp relative w-full bg-black font-body text-white antialiased selection:bg-white/20">
        {/* HERO Section */}
      <section className="lp-hero">
        <BackdropVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4" />
        <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/4 z-[1] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

        <div className="lp-pad lp-hero-inner">
          <div className="lp-hero-top" aria-hidden="true" />

          <div className="lp-hero-main">
            <div className="lp-eyebrow">
              {brand.codeStats.name} at {brand.names.institution}
            </div>
            <h1 className="lp-h1 font-display font-normal text-white">
              Sharpen every
              <br />
              <span className="italic text-white/80">line of code.</span>
            </h1>
            <p className="lp-lead font-normal">
              Transform everyday practice into measurable technical growth. {brand.codeStats.name} provides a streamlined environment to complete coding assessments, participate in targeted cohorts, and leverage data-driven insights to continuously elevate your engineering skills.
            </p>
            <div className="lp-cta-row">
              <button onClick={() => navigate('/login')} className="liquid-glass-strong group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
                Login
                <ArrowForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              {demoVideo ? (
                <a
                  href="#code-snippet"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('code-snippet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
          </div>

          <div className="lp-hero-foot">
            <div className="lp-built">
              <Code aria-hidden="true" />
              <span>Built by {brand.names.builder} for {brand.names.institution}</span>
            </div>
            <div className="lp-hero-stats">
              <span>3,000+ students</span>
              <span className="lp-sep" aria-hidden="true" />
              <span>50+ teachers</span>
              <span className="lp-sep" aria-hidden="true" />
              <span>10+ admins</span>
            </div>
          </div>
        </div>
      </section>

      {/* 1. ABOUT Section */}
      <section className="lp-sec-xl lp-pad bg-black">
        <div className="mx-auto max-w-6xl text-center">
          <ScrollRevealText
            segments={[
              { text: brand.codeStats.name, className: 'font-display italic' },
              { text: 'gives', className: 'font-light text-white/70' },
              { text: `${brand.names.institution} students`, className: 'italic text-white/60' },
              { text: 'a real place to', className: 'font-light text-white/70' },
              { text: 'write code,', className: 'font-semibold' },
              { text: 'take assessments,', className: 'italic text-white/80' },
              { text: 'and track progress,', className: 'font-semibold' },
              { text: 'turning everyday practice', className: 'font-light text-white/65' },
              { text: 'into measurable growth', className: 'italic' },
              { text: 'that teachers and', className: 'font-light text-white/70' },
              { text: 'students can', className: 'font-light text-white/70' },
              { text: 'actually see.', className: 'font-semibold' },
            ]}
            className="lp-about-text font-display font-normal leading-[1.25] tracking-[0.02em] text-white"
          />
        </div>
      </section>

      {/* 2. STATS Section */}
      <section className="lp-sec lp-pad bg-black">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-y-0 md:divide-x">
          <div className="lp-stat">
            <CountUp
              end={stats.students}
              suffix="+"
              className="lp-stat-num font-display text-white"
            />
            <div className="mt-4 text-sm tracking-wide text-white/60">Students registered</div>
          </div>
          <div className="lp-stat">
            <CountUp
              end={400}
              suffix="+"
              className="lp-stat-num font-display text-white"
            />
            <div className="mt-4 text-sm tracking-wide text-white/60">Coding questions available</div>
          </div>
          <div className="lp-stat">
            <CountUp
              end={stats.teachers}
              suffix="+"
              className="lp-stat-num font-display text-white"
            />
            <div className="mt-4 text-sm tracking-wide text-white/60">Teachers onboarded</div>
          </div>
        </div>
      </section>

      {/* 3. CAMPUSES Section */}
      <section className="lp-sec lp-pad bg-black">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 text-xs uppercase tracking-[0.25em] text-white/60">
            Institutions
          </div>
          <h2 className="lp-h2 lp-h2-sm font-display">
            Collaborated with <span className="italic text-white/70">institutions.</span>
          </h2>
          <div className="mt-10 flex flex-col items-center text-center md:mt-12">
            <img
              src={brand.institution.logo}
              alt={brand.names.institutionFull}
              className="h-auto w-full object-contain"
              style={{ maxWidth: 'min(100%, 600px)' }}
            />
            {brand.institution.address ? (
              <p className="mt-2 max-w-md text-sm leading-relaxed text-white/60">
                {brand.institution.address}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* 4. LEADERBOARD Section */}
      <section className="lp-sec lp-pad relative overflow-hidden">
        <BackdropVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4" />
        <div className="absolute inset-0 z-[1] bg-black/60" />
        <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-t from-black to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="lp-lb-head">
            <div>
              <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/60">Top performers</div>
              <h2 className="lp-h2 font-display">Leaderboard</h2>
            </div>
            <EmojiEvents aria-hidden="true" className="h-8 w-8 shrink-0 text-white/60" />
          </div>
          
          {/* Leaderboard Items */}
          <div className="space-y-3 mb-6">
            {paginatedLeaderboard.map((p) => (
              <div
                key={p.rank}
                onClick={() => p.rollNumber && navigate(`/public-profile/${p.rollNumber}`)}
                role={p.rollNumber ? 'button' : undefined}
                tabIndex={p.rollNumber ? 0 : undefined}
                onKeyDown={(e) => {
                  if (p.rollNumber && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    navigate(`/public-profile/${p.rollNumber}`);
                  }
                }}
                className={`liquid-glass lp-lb-row transition-all duration-300 hover:bg-[rgba(0,136,204,0.15)] ${
                  p.rollNumber ? 'cursor-pointer hover:scale-[1.01]' : ''
                }`}
              >
                <div className="liquid-glass lp-lb-rank font-display">
                  {p.rank}
                </div>
                <div className="lp-lb-who">
                  <div className="lp-lb-name font-display">{p.name}</div>
                  <div className="lp-lb-sub">
                    {p.department} {p.graduatingYear ? `'${p.graduatingYear.toString().slice(-2)}` : ''} • {p.institution}
                  </div>
                </div>
                <div className="liquid-glass lp-lb-score rounded-full">
                  {p.score} pts
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="lp-pg">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`liquid-glass lp-pg-btn rounded-full font-medium transition-all duration-300 ${
                  currentPage === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[rgba(0,136,204,0.2)] cursor-pointer'
                }`}
              >
                Previous
              </button>
              
              <div className="lp-dots">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentPage(i)}
                    className="lp-dot"
                    aria-label={`Go to page ${i + 1}`}
                    aria-current={currentPage === i ? 'true' : undefined}
                  >
                    <span />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className={`liquid-glass lp-pg-btn rounded-full font-medium transition-all duration-300 ${
                  currentPage === totalPages - 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[rgba(0,136,204,0.2)] cursor-pointer'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

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
              <DemoVideo src={demoVideo} />
            </div>
          </div>
        </section>
      ) : null}

      {/* 6. TESTIMONIALS Section */}
      <TestimonialsMarquee />

      {/* 7. FAQ Section */}
      <section className="lp-sec-lg lp-pad relative overflow-hidden bg-black">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-[0.35]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,170,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,170,255,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 0%, black 0%, rgba(0,0,0,0.6) 40%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 60% 70% at 50% 0%, black 0%, rgba(0,0,0,0.6) 40%, transparent 75%)",
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

      {/* 8. CTA Section */}
      <section className="lp-sec-lg lp-pad relative overflow-hidden">
        <BackdropVideo src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4" />
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

      {/* 9. FOOTER Section */}
      <footer className="lp-foot lp-pad bg-black border-t border-white/10">
        <div className="mx-auto max-w-6xl">
          <div className="lp-foot-grid">
            <div className="lp-foot-brand">
              <span className="font-display text-2xl italic tracking-tight">{brand.names.platform}</span>
              <p className="mt-4 max-w-xs text-sm text-white/60">
                The coding assessment and performance-analysis platform built by {brand.names.builder} for the students of {brand.names.institutionFull}.
              </p>
              {brand.institution.linkedin || brand.institution.contactEmail ? (
                <div className="lp-foot-social">
                  {brand.institution.linkedin ? (
                    <a href={brand.institution.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="lp-icon-link"><LinkedIn sx={{ fontSize: 20 }} /></a>
                  ) : null}
                  {brand.institution.contactEmail ? (
                    <a href={`mailto:${brand.institution.contactEmail}`} aria-label="Email" className="lp-icon-link"><Email sx={{ fontSize: 20 }} /></a>
                  ) : null}
                </div>
              ) : null}
            </div>
            {footerColumns.map((col) => (
              <div key={col.title}>
                <div className="lp-foot-title">{col.title}</div>
                <ul>
                  {col.links.map((l) => (
                    <li key={l}>
                      {FOOTER_ROUTES[l] ? (
                        <Link to={FOOTER_ROUTES[l]} className="lp-foot-link">{l}</Link>
                      ) : (
                        <span className="lp-foot-link">{l}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="lp-foot-bottom">
            <div>© {new Date().getFullYear()} {brand.names.club} · {brand.names.institutionFull}. All rights reserved.</div>
            {brand.institution.contactEmail ? (
              <a href={`mailto:${brand.institution.contactEmail}`} className="hover:text-white">{brand.institution.contactEmail}</a>
            ) : null}
          </div>
        </div>
      </footer>
      </main>
    </>
  );
};

export default Landing;
