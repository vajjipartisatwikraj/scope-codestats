import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';

const stats = [
  { label: 'Students Onboarded', value: 3000, suffix: '+' },
  { label: 'Problems Tracked', value: 10000, suffix: '+' },
  { label: 'Active Cohorts', value: 120, suffix: '+' },
  { label: 'Daily Submissions', value: 5800, suffix: '+' },
];

const features = [
  {
    title: 'Unified Coding Dashboard',
    description:
      'Merge LeetCode, Codeforces, CodeChef, and GitHub activity into one elite view with trend awareness.',
    icon: '[]',
  },
  {
    title: 'Cohort-Based Learning',
    description:
      'Learn in focused circles with weekly challenge windows, mentor checkpoints, and accountability loops.',
    icon: '</>',
  },
  {
    title: 'Real-Time Leaderboards',
    description:
      'Watch rank shifts live during challenge windows and identify who is climbing before anyone else.',
    icon: '#',
  },
  {
    title: 'Performance Insights',
    description:
      'Pinpoint stagnation, optimize topic coverage, and track consistency using meaningful score signals.',
    icon: '::',
  },
];

const demoTabs = {
  leaderboard: {
    title: 'Leaderboard Dynamics',
    caption: 'Live cohort standings with velocity and consistency multipliers.',
    rows: [
      { name: 'Anika', points: 982, streak: '21d' },
      { name: 'Rohit', points: 961, streak: '18d' },
      { name: 'Aarav', points: 945, streak: '15d' },
      { name: 'Sana', points: 930, streak: '14d' },
    ],
  },
  analytics: {
    title: 'Analytics Graphs',
    caption: 'Weekly growth pulse with solved volume and accuracy confidence.',
    bars: [32, 48, 44, 61, 72, 68, 80],
  },
  profile: {
    title: 'Student Performance Card',
    caption: 'Skill mix, momentum score, and recent problem-solving consistency.',
    chips: ['DP 82%', 'Graphs 74%', 'Greedy 88%', 'Trees 79%'],
  },
};

const cohortTimeline = [
  { week: 'Week 1', title: 'Foundation Sprint', text: 'Warm-up sheet + baseline rating snapshot.' },
  { week: 'Week 2', title: 'Topic Deep Dive', text: 'Pattern clusters with timed problem blocks.' },
  { week: 'Week 3', title: 'Contest Simulation', text: 'Ranked cohort duel and post-match analysis.' },
  { week: 'Week 4', title: 'Performance Review', text: 'Growth report, feedback, and next path unlock.' },
];

const steps = ['Connect profiles', 'Join cohort', 'Track progress', 'Improve rankings'];

const testimonials = [
  {
    name: 'Sanjana R.',
    role: '3rd Year CSE',
    text: 'Scope Cohorts turned random solving into a focused system. My consistency score jumped in just 4 weeks.',
  },
  {
    name: 'Harsh V.',
    role: 'Competitive Programmer',
    text: 'The cohort leaderboard pressure is addictive in the best way. I now solve with intent, not guesswork.',
  },
  {
    name: 'Nikhil P.',
    role: 'Placement Prep Lead',
    text: 'Our team used to study in silos. Now we track performance together and improve faster as a group.',
  },
];

const container = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: 'easeOut' },
  },
};

function useCountUp(target, duration = 1400) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let frame;
    const startedAt = performance.now();

    const update = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(target * eased));
      if (progress < 1) {
        frame = requestAnimationFrame(update);
      }
    };

    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return count;
}

const Counter = ({ value, suffix, label }) => {
  const count = useCountUp(value);

  return (
    <motion.div
      variants={container}
      className="rounded-2xl border border-scope-line/60 bg-white/[0.04] p-5 backdrop-blur-xl"
    >
      <p className="text-3xl font-semibold text-scope-text sm:text-4xl">
        {count.toLocaleString()}
        {suffix}
      </p>
      <p className="mt-2 text-sm text-scope-muted">{label}</p>
    </motion.div>
  );
};

const SectionHeading = ({ eyebrow, title, subtitle }) => (
  <motion.div
    variants={container}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, amount: 0.2 }}
    className="mx-auto mb-10 max-w-3xl text-center"
  >
    <p className="text-xs uppercase tracking-[0.3em] text-scope-cyan">{eyebrow}</p>
    <h2 className="mt-4 font-display text-3xl font-semibold leading-tight text-white sm:text-4xl">{title}</h2>
    <p className="mt-4 text-scope-muted">{subtitle}</p>
  </motion.div>
);

const Landing = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [heroPulse, setHeroPulse] = useState({ rank: 128, streak: 16, solved: 146 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const { scrollYProgress } = useScroll();
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 320]);

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate, token]);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroPulse((current) => ({
        rank: Math.max(75, current.rank + Math.floor(Math.random() * 7) - 3),
        streak: Math.max(3, current.streak + Math.floor(Math.random() * 3) - 1),
        solved: current.solved + Math.floor(Math.random() * 3),
      }));
    }, 2400);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const onMove = (event) => {
      const px = (event.clientX / window.innerWidth - 0.5) * 2;
      const py = (event.clientY / window.innerHeight - 0.5) * 2;
      setMouse({ x: px, y: py });
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  const activeDemo = useMemo(() => demoTabs[activeTab], [activeTab]);

  if (token) {
    return null;
  }

  return (
    <div className="relative overflow-hidden bg-scope-glow text-scope-text">
      <motion.div
        style={{ y: glowY }}
        className="pointer-events-none absolute -left-36 top-8 h-96 w-96 rounded-full bg-scope-violet/20 blur-3xl"
      />
      <motion.div
        animate={{
          x: mouse.x * 14,
          y: mouse.y * 14,
        }}
        transition={{ type: 'spring', stiffness: 30, damping: 18 }}
        className="pointer-events-none absolute right-0 top-20 h-[26rem] w-[26rem] rounded-full bg-scope-cyan/10 blur-3xl"
      />
      <div className="scope-grid pointer-events-none absolute inset-0 opacity-60" />

      <section className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-16 px-6 pb-20 pt-28 md:grid-cols-2 md:px-10 xl:px-2">
        <motion.div initial={{ opacity: 0, y: 36 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <p className="inline-flex rounded-full border border-scope-cyan/40 bg-scope-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-scope-cyan">
            Elite Cohort Intelligence Platform
          </p>
          <h1 className="mt-7 font-display text-5xl font-semibold leading-[1.05] text-white sm:text-6xl lg:text-7xl">
            Track. Compete. Improve.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-scope-muted sm:text-lg">
            Scope Cohorts unifies coding performance analytics, structured cohort learning, and competitive leaderboards into one premium growth engine.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="scope-button-glow rounded-xl bg-gradient-to-r from-scope-blue to-scope-violet px-7 py-4 font-semibold text-white shadow-neon transition duration-300 hover:brightness-110"
            >
              Get Started
            </button>
            <button
              type="button"
              onClick={() => navigate('/cohorts')}
              className="rounded-xl border border-scope-line bg-scope-panel/40 px-7 py-4 font-semibold text-scope-text backdrop-blur-xl transition hover:border-scope-cyan hover:text-white"
            >
              Explore Cohorts
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.8 }}
          className="relative"
        >
          <div className="absolute -left-6 top-6 h-20 w-48 rounded-2xl border border-scope-line bg-scope-panel/60 p-4 backdrop-blur-xl floating-card">
            <p className="text-xs uppercase tracking-[0.2em] text-scope-muted">Current Rank</p>
            <p className="mt-2 text-2xl font-semibold text-scope-cyan">#{heroPulse.rank}</p>
          </div>

          <div className="absolute -right-6 top-20 h-20 w-48 rounded-2xl border border-scope-line bg-scope-panel/60 p-4 backdrop-blur-xl floating-card-alt">
            <p className="text-xs uppercase tracking-[0.2em] text-scope-muted">Streak</p>
            <p className="mt-2 text-2xl font-semibold text-scope-violet">{heroPulse.streak} days</p>
          </div>

          <div className="absolute -bottom-6 left-8 h-20 w-52 rounded-2xl border border-scope-line bg-scope-panel/60 p-4 backdrop-blur-xl floating-card">
            <p className="text-xs uppercase tracking-[0.2em] text-scope-muted">Solved This Month</p>
            <p className="mt-2 text-2xl font-semibold text-white">{heroPulse.solved}</p>
          </div>

          <div className="rounded-3xl border border-scope-line/80 bg-scope-panel/60 p-6 backdrop-blur-2xl shadow-neon">
            <div className="mb-5 flex items-center justify-between">
              <p className="text-sm uppercase tracking-[0.2em] text-scope-muted">Live Dashboard Mockup</p>
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.9)]" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[72, 84, 67].map((value, index) => (
                <div key={index} className="rounded-xl border border-scope-line/60 bg-scope-deep/70 p-3">
                  <p className="text-xs text-scope-muted">Metric {index + 1}</p>
                  <p className="mt-2 text-xl font-semibold text-white">{value}%</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-scope-line bg-scope-ink/70 p-4">
              <p className="mb-4 text-xs uppercase tracking-[0.2em] text-scope-muted">Weekly Performance</p>
              <div className="flex h-28 items-end gap-2">
                {[35, 52, 44, 70, 66, 82, 88].map((bar, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    animate={{ height: `${bar}%` }}
                    transition={{ delay: 0.3 + index * 0.08, duration: 0.55 }}
                    className="flex-1 rounded-t-md bg-gradient-to-t from-scope-blue to-scope-cyan"
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <section className="relative mx-auto max-w-7xl px-6 pb-20 md:px-10 xl:px-2">
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {stats.map((item) => (
            <Counter key={item.label} value={item.value} suffix={item.suffix} label={item.label} />
          ))}
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 xl:px-2">
        <SectionHeading
          eyebrow="Core Capabilities"
          title="Everything You Need To Build Competitive Consistency"
          subtitle="Purpose-built modules for motivated students, coding clubs, and high-performance cohorts."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: index * 0.08, duration: 0.6 }}
              className="group rounded-3xl border border-scope-line bg-white/[0.03] p-7 backdrop-blur-xl transition hover:-translate-y-1 hover:border-scope-cyan/70"
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-scope-blue to-scope-violet font-mono text-sm font-semibold text-white shadow-neon">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              <p className="mt-3 leading-7 text-scope-muted">{feature.description}</p>
              <p className="mt-5 text-sm font-medium text-scope-cyan transition group-hover:translate-x-1">
                Explore module {'->'}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 xl:px-2">
        <SectionHeading
          eyebrow="Interactive Preview"
          title="See Leaderboards, Analytics, and Profiles In Motion"
          subtitle="Switch between key product experiences with seamless transitions."
        />
        <div className="rounded-3xl border border-scope-line bg-scope-panel/50 p-6 backdrop-blur-2xl sm:p-8">
          <div className="mb-6 flex flex-wrap gap-3">
            {Object.keys(demoTabs).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  activeTab === key
                    ? 'bg-gradient-to-r from-scope-blue to-scope-violet text-white shadow-neon'
                    : 'border border-scope-line bg-scope-deep/70 text-scope-muted hover:text-scope-text'
                }`}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              transition={{ duration: 0.35 }}
              className="rounded-2xl border border-scope-line bg-scope-ink/70 p-6"
            >
              <h3 className="text-2xl font-semibold text-white">{activeDemo.title}</h3>
              <p className="mt-2 text-scope-muted">{activeDemo.caption}</p>

              {activeTab === 'leaderboard' && (
                <div className="mt-6 space-y-3">
                  {activeDemo.rows.map((row, index) => (
                    <div key={row.name} className="flex items-center justify-between rounded-xl border border-scope-line/70 bg-scope-panel/60 px-4 py-3">
                      <div>
                        <p className="font-semibold text-white">{index + 1}. {row.name}</p>
                        <p className="text-sm text-scope-muted">Streak {row.streak}</p>
                      </div>
                      <p className="text-lg font-semibold text-scope-cyan">{row.points}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="mt-7 flex h-44 items-end gap-3">
                  {activeDemo.bars.map((bar, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 0 }}
                      animate={{ height: `${bar}%` }}
                      transition={{ delay: index * 0.06, duration: 0.45 }}
                      className="flex-1 rounded-t-lg bg-gradient-to-t from-scope-violet to-scope-cyan"
                    />
                  ))}
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {activeDemo.chips.map((chip) => (
                    <div key={chip} className="rounded-xl border border-scope-line/70 bg-scope-panel/50 px-4 py-3 text-scope-text">
                      {chip}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 xl:px-2">
        <SectionHeading
          eyebrow="Cohorts Engine"
          title="Structured Paths, Weekly Goals, Competitive Momentum"
          subtitle="An accountability-first journey that compounds problem-solving confidence week by week."
        />
        <div className="grid gap-5 md:grid-cols-2">
          {cohortTimeline.map((item, index) => (
            <motion.div
              key={item.week}
              initial={{ opacity: 0, x: index % 2 ? 30 : -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6 }}
              className="relative rounded-2xl border border-scope-line bg-white/[0.03] p-6 backdrop-blur-xl"
            >
              <span className="mb-3 inline-block rounded-lg border border-scope-cyan/30 bg-scope-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-scope-cyan">
                {item.week}
              </span>
              <h3 className="text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-3 text-scope-muted">{item.text}</p>
              <div className="mt-5 h-1 w-full overflow-hidden rounded bg-scope-line/70">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: '100%' }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.9, delay: index * 0.1 }}
                  className="h-full bg-gradient-to-r from-scope-blue to-scope-cyan"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 xl:px-2">
        <SectionHeading
          eyebrow="How It Works"
          title="Simple Flow, Strong Outcomes"
          subtitle="From account connection to ranking improvements in four focused steps."
        />
        <div className="grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="relative rounded-2xl border border-scope-line bg-scope-panel/45 p-5"
            >
              <p className="text-sm uppercase tracking-[0.2em] text-scope-cyan">Step {index + 1}</p>
              <p className="mt-2 text-lg font-semibold text-white">{step}</p>
              {index < steps.length - 1 && (
                <motion.span
                  aria-hidden
                  className="absolute -right-2 top-1/2 hidden h-0.5 w-5 bg-gradient-to-r from-scope-cyan to-transparent md:block"
                  animate={{ opacity: [0.3, 1, 0.3], x: [0, 5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.2 }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 xl:px-2">
        <SectionHeading
          eyebrow="Student Success"
          title="Built By Community, Proven By Results"
          subtitle="Stories from students using Scope Cohorts to drive measurable coding growth."
        />
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item, index) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.55, delay: index * 0.08 }}
              className="rounded-2xl border border-scope-line bg-white/[0.03] p-6"
            >
              <p className="text-sm leading-7 text-scope-muted">"{item.text}"</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-scope-blue to-scope-violet text-sm font-semibold text-white">
                  {item.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </div>
                <div>
                  <p className="font-semibold text-white">{item.name}</p>
                  <p className="text-sm text-scope-muted">{item.role}</p>
                </div>
              </div>
              <div className="mt-4 text-scope-cyan">★★★★★</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 xl:px-2">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl border border-scope-line bg-gradient-to-br from-scope-deep via-scope-panel to-scope-deep p-8 text-center sm:p-12"
        >
          <div className="pointer-events-none absolute -top-14 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-scope-cyan/20 blur-3xl" />
          <p className="text-xs uppercase tracking-[0.3em] text-scope-cyan">Ready To Level Up</p>
          <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold text-white sm:text-5xl">
            Start Your Coding Journey Today
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-scope-muted">
            Join high-performing peers, unlock structured growth, and convert consistency into rank gains.
          </p>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="scope-button-glow mt-8 rounded-xl bg-gradient-to-r from-scope-blue to-scope-violet px-8 py-4 text-lg font-semibold text-white shadow-neon transition hover:brightness-110"
          >
            Launch Scope Cohorts
          </button>
        </motion.div>
      </section>
    </div>
  );
};

export default Landing;
