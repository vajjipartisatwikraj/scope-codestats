import React from 'react';
import { Link } from 'react-router-dom';
import { Email, LinkedIn } from '@mui/icons-material';
import brand, { fill } from '../../../brand';

// The footer links that lead somewhere. The others are shown as plain text until their pages exist.
const FOOTER_ROUTES = {
  About: '/about',
  Contact: '/contact',
  Docs: '/docs',
  Login: '/login',
  Register: '/register',
};

/**
 * The footer of a landing page. The name at the top is the platform's, unless the institution sets
 * its own in brand.json ("landing.footerTitle").
 */
export default function LandingFooter() {
  const landing = brand.institution.landing || {};
  const footerColumns = [
    { title: 'Platform', links: ['Assessments', 'Cohorts', 'Practice Arena', 'Leaderboard'] },
    { title: brand.names.club, links: ['About', 'Contact', 'Workshops', 'Hackathons'] },
    { title: 'Institution', links: [brand.names.institution, 'Docs', 'Login', 'Register'] },
  ];

  return (
    <footer className="lp-foot lp-pad bg-black border-t border-white/10">
      <div className="mx-auto max-w-6xl">
        <div className="lp-foot-grid">
          <div className="lp-foot-brand">
            <span className="font-display text-2xl italic tracking-tight">{fill(landing.footerTitle || '{platform}')}</span>
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
  );
}
