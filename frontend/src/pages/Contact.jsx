import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Email, LocationOn, Send, Chat, ArrowForward, Business } from '@mui/icons-material';

const Contact = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    topic: 'General',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Add landing-page class to body element
  useEffect(() => {
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page');
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/contact`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Request failed (${response.status})`);
      }

      alert(data.message || "Thank you for contacting us! We'll get back to you soon.");
      setFormData({ name: '', email: '', company: '', topic: 'General', message: '' });
    } catch (error) {
      alert(error.message || "Sorry, we couldn't send your message. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <main className="relative w-full bg-black font-body text-white antialiased">
        {/* HERO */}
        <section className="relative overflow-hidden px-6 pt-40 pb-16 md:px-12 md:pt-48 md:pb-20">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-70"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/10 via-black/30 to-black" />
          <div className="pointer-events-none absolute -top-32 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,136,204,0.22),transparent_70%)] blur-3xl" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] text-white/70">
              <Email className="h-3 w-3" />
              Get in touch
            </div>
            <h1 className="font-display text-5xl leading-[1.02] tracking-tight md:text-7xl">
              Let's <span className="italic text-white/70">talk.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg">
              Have a question about CodeStats, spotted a bug, or want to get involved with SCOPE Club? Send us a message and we'll get back to you.
            </p>
          </div>
        </section>

        {/* MAIN */}
        <section className="px-6 pb-28 md:px-12 md:pb-36">
          <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1.1fr_1fr] md:gap-14">
            {/* Form */}
            <form onSubmit={handleSubmit} className="liquid-glass rounded-[1.5rem] p-7 md:p-10">
              <h2 className="font-display text-2xl tracking-tight md:text-3xl">Send us a note</h2>
              <p className="mt-2 text-sm text-white/60">We read everything. Reply within one business day.</p>

              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/55">Full name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[rgba(0,170,255,0.5)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/55">Work email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@institution.edu"
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[rgba(0,170,255,0.5)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-5">
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/55">Institution</label>
                <input
                  type="text"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your Institution"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[rgba(0,170,255,0.5)] focus:outline-none"
                />
              </div>
              <div className="mt-5">
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/55">Topic</label>
                <select
                  name="topic"
                  value={formData.topic}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white focus:border-[rgba(0,170,255,0.5)] focus:outline-none"
                >
                  <option className="bg-black">General</option>
                  <option className="bg-black">Assessment help</option>
                  <option className="bg-black">Report a bug</option>
                  <option className="bg-black">Join SCOPE Club</option>
                </select>
              </div>
              <div className="mt-5">
                <label className="mb-2 block text-[11px] uppercase tracking-[0.2em] text-white/55">Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={5}
                  placeholder="Tell us a bit about what you're building or assessing…"
                  required
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-[rgba(0,170,255,0.5)] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="liquid-glass-strong group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-medium transition-transform hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {submitting ? 'Sending…' : 'Send message'}
                <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </form>

            {/* Sidebar */}
            <div className="space-y-4">
              {[
                { icon: <Chat className="h-5 w-5 text-white" />, title: "Talk to SCOPE Club", copy: "Questions about CodeStats or joining the club.", value: "scopeclub@mlrinstitutions.ac.in" },
                { icon: <Email className="h-5 w-5 text-white" />, title: "Help & support", copy: "Trouble with your account or an assessment.", value: "scopeclub@mlrinstitutions.ac.in" },
              ].map((c) => (
                <a
                  key={c.title}
                  href="mailto:scopeclub@mlrinstitutions.ac.in"
                  className="liquid-glass group flex items-start gap-4 rounded-[1.25rem] p-6 transition-all duration-300 hover:border-[rgba(0,170,255,0.35)]"
                >
                  <div className="liquid-glass flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                    {c.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg">{c.title}</div>
                    <div className="text-xs text-white/55">{c.copy}</div>
                    <div className="mt-2 text-sm text-[rgb(120,200,255)]">{c.value}</div>
                  </div>
                  <ArrowForward className="mt-1 h-4 w-4 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                </a>
              ))}

              <div className="liquid-glass rounded-[1.25rem] p-6">
                <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/55">
                  <Business className="h-3.5 w-3.5" />
                  Where to find us
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    { city: "MLR Institute of Technology", line: "Dundigal, Hyderabad, Telangana" },
                    { city: "SCOPE Club", line: "On campus · MLRIT" },
                  ].map((o) => (
                    <div key={o.city} className="flex items-start gap-3">
                      <LocationOn className="mt-0.5 h-4 w-4 text-white/55" />
                      <div>
                        <div className="text-sm font-medium">{o.city}</div>
                        <div className="text-xs text-white/55">{o.line}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default Contact;
