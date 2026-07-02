import React, { useEffect, useState, useRef } from 'react';
import './Landing.css';
import { useNavigate } from 'react-router-dom';
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
import { motion, useScroll, useTransform, useInView } from 'framer-motion';

// CountUp Component
const CountUp = ({ end, duration = 2200, suffix = '', prefix = '', className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;
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
  }, [inView, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

// ScrollRevealText Component
const Word = ({ children, progress, range, className = '' }) => {
  const opacity = useTransform(progress, range, [0.1, 1], {
    ease: (t) => t * t * (3 - 2 * t),
  });
  return (
    <motion.span
      style={{ opacity }}
      className={`inline-block mr-[0.25em] ${className}`}
    >
      {children}
    </motion.span>
  );
};

const ScrollRevealText = ({ segments, className = '' }) => {
  const containerRef = useRef(null);
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
          <Word key={i} progress={scrollYProgress} range={[start, end]} className={w.className}>
            {w.text}
          </Word>
        );
      })}
    </p>
  );
};

// FAQ Accordion Component - Custom implementation matching Dark Hero Section
const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const contentRefs = useRef([]);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqData = [
    {
      cat: "Platform",
      q: "What exactly is CodeStats?",
      a: "CodeStats is an in-house coding assessment platform built by SCOPE Club for MLR Institute of Technology. Students take coding assessments, join cohorts, practice in the arena, and track how their coding performance improves over time.",
    },
    {
      cat: "Access",
      q: "Who can use CodeStats?",
      a: "It's exclusively for the MLRIT community — students, teachers, and admins of MLR Institute of Technology. It isn't open to other campuses or to external recruiters and hiring teams.",
    },
    {
      cat: "For admins",
      q: "What can admins and teachers do?",
      a: "Admins and teachers can create and schedule coding assessments, build and manage cohorts with modules and questions, add and organise students, and review every submission — all from a dedicated management dashboard.",
    },
    {
      cat: "Analytics",
      q: "How can we analyse student performance?",
      a: "CodeStats turns every submission into insight. You get class and cohort-level analytics, individual progress over time, question-wise accuracy, and clear views of where students are strong or struggling — so teaching decisions are backed by real data.",
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
            style={{
              transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Top glow line when open */}
            <div
              className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(0,170,255,0.4)] to-transparent transition-all duration-700 ease-out ${
                isOpen ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
              }`}
              style={{
                transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1), transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
            
            {/* Subtle background glow when open */}
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(0,170,255,0.03)] via-transparent to-transparent transition-opacity duration-700 ${
                isOpen ? 'opacity-100' : 'opacity-0'
              }`}
            />
            
            {/* Accordion Trigger */}
            <button
              onClick={() => toggleAccordion(i)}
              className="relative flex w-full items-center py-5 text-left outline-none focus:outline-none"
            >
              <div className="flex flex-1 items-center gap-4 pr-4">
                <span 
                  className={`font-display text-xs tabular-nums transition-colors duration-500 ${
                    isOpen ? 'text-[rgb(120,200,255)]' : 'text-white/35'
                  }`}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex flex-col gap-1">
                  <span 
                    className={`text-[10px] uppercase tracking-[0.22em] transition-colors duration-500 ${
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
                className={`h-5 w-5 shrink-0 text-white transition-all duration-500 ease-out ${
                  isOpen ? 'rotate-180 text-[rgb(120,200,255)]' : 'rotate-0'
                }`}
                style={{
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), color 0.5s ease',
                }}
              />
            </button>

            {/* Accordion Content with smooth height transition */}
            <div
              ref={(el) => (contentRefs.current[i] = el)}
              className="overflow-hidden transition-all duration-500 ease-out"
              style={{
                maxHeight: isOpen ? `${contentRefs.current[i]?.scrollHeight || 500}px` : '0px',
                opacity: isOpen ? 1 : 0,
                transition: 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
              }}
            >
              <div 
                className="pb-5 pl-10 pr-4 text-[14px] leading-relaxed text-white/65"
                style={{
                  transform: isOpen ? 'translateY(0)' : 'translateY(-10px)',
                  transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s',
                }}
              >
                {f.a}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Testimonial Card Component
const TestimonialCard = ({ t }) => {
  return (
    <div className="group relative w-[280px] shrink-0 md:w-[340px] flex flex-col">
      <div className="relative flex-1 flex flex-col justify-between rounded-[1rem] p-4 md:p-5 transition-all duration-500 hover:-translate-y-1 hover:bg-[rgba(0,136,204,0.18)] hover:border-[rgba(0,170,255,0.55)] bg-[rgba(0,136,204,0.08)] border border-[rgba(0,136,204,0.25)] shadow-[0_0_25px_rgba(0,136,204,0.2)] overflow-hidden" style={{ clipPath: 'inset(0 0 0 0 round 1rem)' }}>
        {/* Reduced glow effects - contained within card */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,136,204,0.15),rgba(0,136,204,0.05)_50%,transparent_80%)] opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,170,255,0.12),transparent_40%)] opacity-50 group-hover:opacity-70 transition-opacity duration-500" />

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-semibold text-white leading-tight">{t.name}</div>
                <div className="truncate text-[10.5px] text-white/55 leading-tight mt-0.5">{t.role}</div>
              </div>
              <div className="flex gap-0.5 shrink-0 pt-0.5">
                {[...Array(5)].map((_, i) => {
                  const rating = t.rating ?? 5;
                  const starValue = i + 1;
                  const activeColor = 'rgb(120,200,255)';
                  const inactiveColor = 'rgba(255,255,255,0.25)';
                  if (rating >= starValue) {
                    return <Star key={i} style={{ fontSize: '10px', fill: activeColor, color: activeColor }} />;
                  }
                  if (rating >= starValue - 0.5) {
                    return <StarHalf key={i} style={{ fontSize: '10px', fill: activeColor, color: activeColor }} />;
                  }
                  return <StarBorder key={i} style={{ fontSize: '10px', fill: inactiveColor, color: inactiveColor }} />;
                })}
              </div>
            </div>
            <p className="mt-3 font-display text-[14.5px] leading-snug text-white/90 md:text-[16px]">
              "{t.quote}"
            </p>
          </div>
          <div className="mt-4">
            <span className="inline-block rounded-full px-2 py-0.5 text-[8.5px] uppercase tracking-[0.18em] text-[rgb(120,200,255)] bg-[rgba(0,136,204,0.18)] border border-[rgba(0,170,255,0.3)]">
              {t.tag}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const MarqueeRow = ({ reverse = false, duration = 50, testimonials }) => {
  const items = [...testimonials, ...testimonials];
  return (
    <div className="pause-on-hover relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-black to-transparent md:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-black to-transparent md:w-40" />
      
      <div
        className={`marquee-content flex gap-4 md:gap-5 py-2 ${
          reverse ? 'animate-marquee-rtl' : 'animate-marquee-ltr'
        }`}
        style={{ 
          width: 'max-content',
          '--duration': `${duration}s`
        }}
      >
        {items.map((t, i) => (
          <TestimonialCard key={`${t.name}-${i}`} t={t} />
        ))}
      </div>
    </div>
  );
};

const TestimonialsMarquee = () => {
  const testimonials = [
    {
      quote: "Setting up assessments now takes just minutes. Tracking thousands of student submissions has never been easier.",
      name: "Rani",
      role: "CSE Faculty, MLRIT",
      tag: "Faculty",
      rating: 5,
    },
    {
      quote: "The admin analytics make it easy to monitor student performance and track progress effectively.",
      name: "Sandeep",
      role: "IT Faculty, MLRIT",
      tag: "Faculty",
      rating: 4.5,
    },
    {
      quote: "Managing cohort access is effortless. The intuitive UI and UX provide a smooth user experience.",
      name: "RajaShekar",
      role: "Training Faculty, MLRIT",
      tag: "Faculty",
      rating: 5,
    },
    {
      quote: "The practice arena and cohort assessments kept me consistent. I can finally see my progress week over week.",
      name: "Rahul Mehta",
      role: "CSE Sophomore, MLRIT",
      tag: "Student",
      rating: 4.5,
    },
    {
      quote: "It's built by our own SCOPE Club, so it just fits how we actually learn to code at MLRIT.",
      name: "Sara Fatima",
      role: "Final-year student, MLRIT",
      tag: "Student",
      rating: 5,
    },
    {
      quote: "The secure code editor prevents malpractice and ensures fair, genuine scoring during assessments.",
      name: "Satyanagadurga",
      role: "2nd yr Student, MLRIT",
      tag: "Student",
      rating: 5,
    },
    {
      quote: "The coding problems are engaging, fun, and make learning enjoyable! 😊",
      name: "Sravanthi",
      role: "2nd yr Student, MLRIT",
      tag: "Student",
      rating: 4.5,
    },
    {
      quote: "The tasks are well-designed and greatly help in improving logical thinking and coding skills.",
      name: "Siddhartha",
      role: "3rd yr Student, MLRIT",
      tag: "Student",
      rating: 4,
    },
    {
      quote: "A great platform for beginners to build confidence and strengthen their coding fundamentals.",
      name: "Vishnu Vardhan",
      role: "2nd yr Student, MLRIT",
      tag: "Student",
      rating: 4.5,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-black px-0 py-20 md:py-24">
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
      <div className="relative mx-auto mb-10 max-w-6xl px-6 text-center md:px-12">
        <div className="mb-2.5 text-xs uppercase tracking-[0.25em] text-white/50">
          Testimonials
        </div>
        <h2 className="font-display text-2xl tracking-tight md:text-4xl">
          Loved by <span className="italic text-white/70">students &amp; faculty at MLRIT.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-xs text-white/45 md:text-sm">
          Real words from the people who use CodeStats every week to learn, teach, and measure how their code is improving.
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
const Landing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const snippetVideoRef = useRef(null);
  const [stats, setStats] = useState({ students: 0, admins: 0, teachers: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardSource, setLeaderboardSource] = useState('loading'); // 'loading', 'api', 'fallback'
  const itemsPerPage = 5;

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

  useEffect(() => {
    if (snippetVideoRef.current) {
      snippetVideoRef.current.playbackRate = 2.5;
    }
  }, []);

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
            { rank: 1, name: 'Ananya Sharma', department: 'CSE', graduatingYear: 2026, score: 2987, institution: 'MLRIT' },
            { rank: 2, name: 'Liu Wei', department: 'CSE', graduatingYear: 2025, score: 2914, institution: 'MLRIT' },
            { rank: 3, name: 'Marco Rossi', department: 'IT', graduatingYear: 2026, score: 2856, institution: 'MLRIT' }
          ]);
        }
      } catch (error) {
        setLeaderboardSource('fallback');
        // Fallback data
        setLeaderboard([
          { rank: 1, name: 'Ananya Sharma', department: 'CSE', graduatingYear: 2026, score: 2987, institution: 'MLRIT' },
          { rank: 2, name: 'Liu Wei', department: 'CSE', graduatingYear: 2025, score: 2914, institution: 'MLRIT' },
          { rank: 3, name: 'Marco Rossi', department: 'IT', graduatingYear: 2026, score: 2856, institution: 'MLRIT' }
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

  return (
    <>
      <main className="relative w-full bg-black font-body text-white antialiased selection:bg-white/20">
        {/* HERO Section */}
      <section className="relative h-screen w-full overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
        />
        <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/4 z-[1] bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none" />

        <div className="relative z-10 flex h-full flex-col justify-between px-6 py-4 md:px-12 md:py-6">
          <div className="h-14" />

          <section className="flex flex-1 flex-col justify-center max-w-4xl py-4">
            <div className="mb-6 inline-flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-white/70">
              <span className="h-px w-8 bg-white/60" />
              A coding platform by SCOPE Club · MLRIT
            </div>
            <h1 className="font-display text-5xl font-normal leading-[0.95] tracking-tight text-white sm:text-6xl md:text-7xl lg:text-[7.5rem]">
              Sharpen every
              <br />
              <span className="italic text-white/80">line of code.</span>
            </h1>
            <p className="mt-6 max-w-xl text-sm font-normal leading-relaxed text-white/75 md:text-base">
              Transform everyday practice into measurable technical growth. CodeStats provides a streamlined environment to complete coding assessments, participate in targeted cohorts, and leverage data-driven insights to continuously elevate your engineering skills.
            </p>
            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button onClick={() => navigate('/login')} className="liquid-glass-strong group inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.02]">
                Login
                <ArrowForward className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <a
                href="#code-snippet"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('code-snippet')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="liquid-glass group inline-flex items-center gap-3 rounded-full pl-1.5 pr-5 py-1.5 text-sm font-medium text-white/90 transition-colors hover:text-white"
              >
                <span className="liquid-glass flex h-9 w-9 items-center justify-center rounded-full">
                  <PlayArrow className="h-3.5 w-3.5 fill-white text-white" />
                </span>
                Watch a sample assessment
              </a>
            </div>
          </section>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-white/15 pt-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-white/60">
              <Code className="h-3.5 w-3.5" />
              Built by SCOPE Club — MLR Institute of Technology
            </div>
            <div className="flex items-center gap-6 text-[11px] text-white/60">
              <span>3,000+ students</span>
              <span className="h-3 w-px bg-white/20" />
              <span>50+ teachers</span>
              <span className="h-3 w-px bg-white/20" />
              <span>10+ admins</span>
            </div>
          </div>
        </div>
      </section>

      {/* 1. ABOUT Section */}
      <section className="bg-black px-6 py-32 md:px-12 md:py-48">
        <div className="mx-auto max-w-6xl text-center">
          <ScrollRevealText
            segments={[
              { text: 'CodeStats', className: 'font-display italic' },
              { text: 'gives', className: 'font-light text-white/70' },
              { text: 'MLRIT students', className: 'italic text-white/60' },
              { text: 'a real place to', className: 'font-light text-white/70' },
              { text: 'write code,', className: 'font-semibold' },
              { text: 'take assessments,', className: 'italic text-white/80' },
              { text: 'and track progress —', className: 'font-semibold' },
              { text: 'turning everyday practice', className: 'font-light text-white/65' },
              { text: 'into measurable growth', className: 'italic' },
              { text: 'that teachers and', className: 'font-light text-white/70' },
              { text: 'students can', className: 'font-light text-white/70' },
              { text: 'actually see.', className: 'font-semibold' },
            ]}
            className="font-display text-3xl font-normal leading-[1.25] tracking-[0.02em] text-white md:text-5xl lg:text-6xl"
          />
        </div>
      </section>

      {/* 2. STATS Section */}
      <section className="bg-black px-6 py-24 md:px-12">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/10 md:grid-cols-3 md:divide-y-0 md:divide-x">
          <div className="px-2 py-10 md:px-10 md:py-4 text-center">
            <CountUp
              end={stats.students}
              suffix="+"
              className="font-display text-6xl tracking-tight md:text-7xl lg:text-8xl text-white"
            />
            <div className="mt-4 text-sm tracking-wide text-white/55">Students registered</div>
          </div>
          <div className="px-2 py-10 md:px-10 md:py-4 text-center">
            <CountUp
              end={400}
              suffix="+"
              className="font-display text-6xl tracking-tight md:text-7xl lg:text-8xl text-white"
            />
            <div className="mt-4 text-sm tracking-wide text-white/55">Coding questions available</div>
          </div>
          <div className="px-2 py-10 md:px-10 md:py-4 text-center">
            <CountUp
              end={stats.teachers}
              suffix="+"
              className="font-display text-6xl tracking-tight md:text-7xl lg:text-8xl text-white"
            />
            <div className="mt-4 text-sm tracking-wide text-white/55">Teachers onboarded</div>
          </div>
        </div>
      </section>

      {/* 3. CAMPUSES Section */}
      <section className="bg-black px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-flex items-center gap-3 text-xs uppercase tracking-[0.25em] text-white/60">
            Institutions
          </div>
          <h2 className="font-display text-3xl tracking-tight md:text-5xl">
            Collaborated with <span className="italic text-white/70">institutions.</span>
          </h2>
          <div className="mt-12 flex flex-col items-center text-center">
            <img
              src="/MLRIT.png"
              alt="MLR Institute of Technology"
              className="w-full max-w-[300px] object-contain"
            />
            <div className="mt-5 font-display text-xl md:text-2xl">MLR Institute of Technology</div>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-white/55 md:text-sm">
              Dundigal V, Survey No. 444, Dundigal, Gandi Maisama, Medchal Malkajgiri, Telangana – 500 043, Telangana
            </p>
          </div>
        </div>
      </section>

      {/* 4. LEADERBOARD Section */}
      <section className="relative overflow-hidden px-6 py-24 md:px-12">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4"
        />
        <div className="absolute inset-0 z-[1] bg-black/60" />
        <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-t from-black to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/60">Top performers</div>
              <h2 className="font-display text-3xl tracking-tight md:text-5xl">Leaderboard</h2>
            </div>
            <EmojiEvents className="h-8 w-8 text-white/60" />
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
                className={`liquid-glass flex items-center gap-5 rounded-[1.25rem] p-5 transition-all duration-300 hover:bg-[rgba(0,136,204,0.15)] ${
                  p.rollNumber ? 'cursor-pointer hover:scale-[1.01]' : ''
                }`}
              >
                <div className="liquid-glass flex h-12 w-12 items-center justify-center rounded-[0.75rem] font-display text-xl">
                  {p.rank}
                </div>
                <div className="flex-1">
                  <div className="font-display text-lg">{p.name}</div>
                  <div className="text-xs text-white/55">
                    {p.department} {p.graduatingYear ? `'${p.graduatingYear.toString().slice(-2)}` : ''} • {p.institution}
                  </div>
                </div>
                <div className="liquid-glass rounded-full px-3 py-1 text-[11px] tracking-wider text-white/80">
                  {p.score} pts
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className={`liquid-glass rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                  currentPage === 0
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[rgba(0,136,204,0.2)] hover:scale-105 cursor-pointer'
                }`}
              >
                Previous
              </button>
              
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      currentPage === i
                        ? 'w-6 bg-[rgb(120,200,255)]'
                        : 'bg-white/30 hover:bg-white/50'
                    }`}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages - 1}
                className={`liquid-glass rounded-full px-5 py-2 text-sm font-medium transition-all duration-300 ${
                  currentPage === totalPages - 1
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-[rgba(0,136,204,0.2)] hover:scale-105 cursor-pointer'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 5. CODING SNIPPET Section */}
      <section id="code-snippet" className="scroll-mt-24 bg-black px-6 py-24 md:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <div className="mb-3 text-xs uppercase tracking-[0.25em] text-white/60">Live sample</div>
            <h2 className="font-display text-3xl tracking-tight md:text-5xl">
              A real challenge, <span className="italic text-white/70">auto-graded.</span>
            </h2>
          </div>
          <div className="liquid-glass-strong rounded-[1.25rem] overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-[11px] tracking-wider text-white/50">code-stats</span>
            </div>
            <div className="bg-black/40">
              <video
                ref={snippetVideoRef}
                autoPlay
                loop
                muted
                playsInline
                className="block w-full h-auto object-cover"
                src="https://sritulasiseeds.sgp1.cdn.digitaloceanspaces.com/scopecodestats.mp4"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 6. TESTIMONIALS Section */}
      <TestimonialsMarquee />

      {/* 7. FAQ Section */}
      <section className="relative overflow-hidden bg-black px-6 py-28 md:px-12 md:py-32">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[600px] opacity-[0.35]"
          style={{
            backgroundImage: "linear-gradient(rgba(0,170,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,170,255,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 0%, black 0%, rgba(0,0,0,0.6) 40%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 60% 70% at 50% 0%, black 0%, rgba(0,0,0,0.6) 40%, transparent 75%)",
          }}
        />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.18),transparent_70%)] blur-3xl" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

        <div className="relative mx-auto grid max-w-6xl gap-14 md:grid-cols-[0.9fr_1.4fr] md:gap-20">
          <div className="md:sticky md:top-24 md:self-start">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[rgba(0,170,255,0.3)] bg-[rgba(0,136,204,0.12)] px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-[rgb(120,200,255)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[rgb(120,200,255)] shadow-[0_0_8px_rgba(0,170,255,0.9)]" />
              FAQ
            </div>
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
              Questions, <br />
              <span className="italic text-white/65">answered with clarity.</span>
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/55">
              Everything you need to know about CodeStats — what it does, who it's for, and how MLRIT uses it.
              Still can't find your answer?
            </p>

            <a
              href="#"
              className="group relative mt-8 inline-flex w-full max-w-sm items-center justify-between overflow-hidden rounded-2xl border border-[rgba(0,170,255,0.25)] bg-[rgba(0,136,204,0.07)] px-5 py-4 transition-all duration-500 hover:border-[rgba(0,170,255,0.55)] hover:bg-[rgba(0,136,204,0.14)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,170,255,0.25),transparent_60%)] opacity-60 transition-opacity duration-500 group-hover:opacity-100" />
              <div className="relative">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">Still curious?</div>
                <div className="mt-1 text-sm font-medium text-white">Talk to our team</div>
              </div>
              <ArrowForward className="relative h-4 w-4 text-white/70 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
            </a>
          </div>

          <FAQAccordion />
        </div>
      </section>

      {/* 8. CTA Section */}
      <section className="relative overflow-hidden px-6 py-32 md:px-12">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 z-0 h-full w-full object-cover"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4"
        />
        <div className="absolute inset-0 z-[1] bg-black/55" />
        <div className="absolute top-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-b from-black to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-1/3 z-[1] bg-gradient-to-t from-black to-transparent pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-7xl">
            Ready to level up <br />
            <span className="italic text-white/70">your coding?</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-white/65">
            Log in with your MLRIT account and start practicing today — one assessment at a time.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
      <footer className="bg-black border-t border-white/10 px-6 py-16 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
            <div className="col-span-2">
              <span className="font-display text-2xl italic tracking-tight">CodeStats</span>
              <p className="mt-4 max-w-xs text-sm text-white/55">
                The coding assessment and performance-analysis platform built by SCOPE Club for the students of MLR Institute of Technology.
              </p>
              <div className="mt-6 flex items-center gap-4 text-white/60">
                <a href="https://www.linkedin.com/school/mlr-institute-of-technology/" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover:text-white"><LinkedIn sx={{ fontSize: 16 }} /></a>
                <a href="mailto:scopeclub@mlrinstitutions.ac.in" aria-label="Email" className="hover:text-white"><Email sx={{ fontSize: 16 }} /></a>
              </div>
            </div>
            {[
              { title: 'Platform', links: ['Assessments', 'Cohorts', 'Practice Arena', 'Leaderboard'] },
              { title: 'SCOPE Club', links: ['About', 'Contact', 'Workshops', 'Hackathons'] },
              { title: 'Institution', links: ['MLRIT', 'Docs', 'Login', 'Register'] },
            ].map((col) => (
              <div key={col.title}>
                <div className="mb-4 text-xs uppercase tracking-[0.2em] text-white/50">{col.title}</div>
                <ul className="space-y-2">
                  {col.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-white/75 hover:text-white">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/45 sm:flex-row sm:items-center">
            <div>© {new Date().getFullYear()} SCOPE Club · MLR Institute of Technology. All rights reserved.</div>
            <div className="flex items-center gap-5">
              <a href="mailto:scopeclub@mlrinstitutions.ac.in" className="hover:text-white">scopeclub@mlrinstitutions.ac.in</a>
            </div>
          </div>
        </div>
      </footer>
      </main>
    </>
  );
};

export default Landing;
