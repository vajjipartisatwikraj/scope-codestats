import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from '@mui/icons-material';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/docs', label: 'Docs' },
  { to: '/contact', label: 'Contact' },
];

const LandingNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-6 md:px-10 md:pt-8">
      <header className="landing-navbar-header pointer-events-auto relative flex w-full max-w-7xl items-center justify-between gap-6 px-2">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 pl-2 md:pl-3 relative z-[60]">
          <img
            src="/scope-blac.png"
            alt="CodeStats logo"
            className="h-7 w-7 object-contain md:h-8 md:w-8"
          />
          <span className="font-display text-2xl italic tracking-tight text-white md:text-3xl">
            CodeStats
          </span>
        </Link>

        {/* Desktop Navigation - Absolutely centered pill with glass effect */}
        <nav className="landing-navbar liquid-glass-strong hidden items-center gap-1.5 rounded-full px-3 py-2 md:flex absolute left-1/2 transform -translate-x-1/2">
          {navLinks.map((link) => {
            const active =
              link.to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full px-5 py-2 text-[15px] transition-colors ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right buttons - Desktop */}
        <div className="hidden md:flex items-center gap-2 pr-1 md:pr-1.5 relative z-[60]">
          <button
            onClick={() => navigate('/login')}
            className="hidden rounded-full px-4 py-1.5 text-sm text-white/80 transition-colors hover:text-white sm:inline-flex"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate('/login')}
            className="liquid-glass-strong inline-flex items-center rounded-full px-4 py-1.5 text-sm font-medium text-white transition-transform hover:scale-[1.02] md:px-5 md:py-2"
          >
            Login
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden relative z-[60] liquid-glass-strong rounded-full p-2 text-white"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Menu Panel */}
        <div
          className={`fixed top-0 right-0 z-[56] h-screen w-[280px] transform transition-transform duration-300 ease-in-out md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <div className="flex flex-col h-full pt-24 px-6">
            {/* Mobile Navigation Links */}
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => {
                const active =
                  link.to === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`rounded-xl px-4 py-3 text-base transition-colors ${
                      active
                        ? 'bg-white/10 text-white font-medium'
                        : 'text-white/70 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* Mobile Auth Buttons */}
            <div className="mt-8 flex flex-col gap-3">
              <button
                onClick={() => navigate('/login')}
                className="liquid-glass rounded-full px-6 py-3 text-sm text-white/80 transition-colors hover:text-white text-center"
              >
                Sign in
              </button>
              <button
                onClick={() => navigate('/login')}
                className="liquid-glass-strong rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02] text-center"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
};

export default LandingNavbar;
