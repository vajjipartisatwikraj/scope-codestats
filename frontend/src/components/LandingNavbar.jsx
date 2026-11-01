import brand from '../brand';
import BrandLogo from './custom-components/BrandLogo';
import useMediaQuery from '../hooks/useMediaQuery';
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ListIcon } from '@phosphor-icons/react/dist/csr/List';
import { XIcon } from '@phosphor-icons/react/dist/csr/X';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/docs', label: 'Docs' },
  { to: '/contact', label: 'Contact' },
];

const MENU_ID = 'landing-mobile-menu';

// The landing pages keep a black page behind them while the navbar is mounted, and for a moment after it
// leaves, so a page fading out never shows the light theme background through it (the white flash).
let releaseTimer = null;

const LandingNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // The logo is drawn as large as the room allows. The two pictures (icon, name) share one height.
  const narrow = useMediaQuery('(max-width: 479.95px)');
  // On a tablet only the icon fits beside the centred menu; from 1024px the name picture joins it
  const tablet = useMediaQuery('(min-width: 768px) and (max-width: 1023.95px)');
  const laptop = useMediaQuery('(min-width: 1024px) and (max-width: 1279.95px)');
  const wide = useMediaQuery('(min-width: 1280px)');
  const logoHeight = narrow ? 'min(36px, 9vw)' : tablet ? 44 : laptop ? 34 : wide ? 40 : 44;

  // Black page behind the landing pages
  useEffect(() => {
    clearTimeout(releaseTimer);
    document.body.classList.add('landing-shell');
    return () => {
      releaseTimer = setTimeout(() => document.body.classList.remove('landing-shell'), 900);
    };
  }, []);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // While the menu is open the page behind it does not scroll, and Escape closes it
  useEffect(() => {
    if (!mobileMenuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileMenuOpen]);

  const isActive = (to) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4 md:px-10 md:pt-8">
      <header
        data-scrolled={scrolled ? 'true' : 'false'}
        className="landing-navbar-header pointer-events-auto relative flex w-full max-w-7xl items-center justify-between gap-4 px-2 md:gap-6"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 pl-2 md:pl-3 relative z-[60] min-w-0" aria-label={`${brand.names.platform} home`}>
          <BrandLogo
            height={logoHeight}
            part={tablet ? 'left' : 'both'}
            theme="dark"
            keepName
            fallback={
              <>
                <img
                  src={brand.platform.logo}
                  alt=""
                  className="h-7 w-7 object-contain md:h-8 md:w-8"
                />
                <span className="font-display text-2xl italic tracking-tight text-white md:text-3xl">
                  {brand.names.platform}
                </span>
              </>
            }
          />
        </Link>

        {/* Desktop Navigation - Absolutely centered pill with glass effect */}
        <nav className="landing-navbar liquid-glass-strong hidden items-center gap-1.5 rounded-full px-3 py-2 md:flex absolute left-1/2 transform -translate-x-1/2" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-full px-5 py-2 text-[15px] transition-colors ${
                isActive(link.to)
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
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

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="md:hidden relative z-[60] liquid-glass-strong inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          aria-label="Open menu"
          aria-expanded={mobileMenuOpen}
          aria-controls={MENU_ID}
        >
          <ListIcon size={22} weight="bold" aria-hidden="true" />
        </button>

        {/* Mobile menu: a dimmed page and a panel that slides in from the right */}
        <div
          className={`fixed inset-0 z-[65] bg-black/70 transition-opacity duration-300 md:hidden ${
            mobileMenuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />

        <div
          id={MENU_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`fixed inset-y-0 right-0 z-[70] flex h-[100dvh] w-[min(21rem,88vw)] transform flex-col md:hidden ${
            mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          style={{
            background: '#08080a',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            // A closed menu is out of the tab order and away from screen readers, once it has slid out
            visibility: mobileMenuOpen ? 'visible' : 'hidden',
            transition: mobileMenuOpen
              ? 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1), visibility 0s linear 300ms',
          }}
        >
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <span className="text-xs uppercase tracking-[0.2em] text-white/55">Menu</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="liquid-glass-strong inline-flex h-11 w-11 items-center justify-center rounded-full text-white"
              aria-label="Close menu"
            >
              <XIcon size={22} weight="bold" aria-hidden="true" />
            </button>
          </div>

          <nav className="flex flex-col gap-1 px-3 py-3" aria-label="Main">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive(link.to) ? 'page' : undefined}
                className={`rounded-2xl px-4 py-3.5 text-base font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-3 border-t border-white/10 px-5 pb-6 pt-5">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-full bg-white px-6 py-3.5 text-sm font-medium text-black transition-colors hover:bg-white/90"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="liquid-glass rounded-full px-6 py-3.5 text-sm text-white/85 transition-colors hover:text-white"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>
    </div>
  );
};

export default LandingNavbar;
