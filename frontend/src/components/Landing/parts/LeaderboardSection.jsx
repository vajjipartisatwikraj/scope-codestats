import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmojiEvents } from '@mui/icons-material';
import brand from '../../../brand';
import { apiUrl } from '../../../config/apiConfig';
import landingConfig from '../landingConfig';
import { BackdropVideo } from './Videos';

const ITEMS_PER_PAGE = 5;

/** The top students, five to a page, from the public leaderboard endpoint. */
export default function LeaderboardSection() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const response = await fetch(`${apiUrl}/leaderboard/public/top10`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        if (Array.isArray(data)) setLeaderboard(data);
      } catch (error) {
        // Not reachable: there is no leaderboard to show, and none is made up
      }
    })();
    return () => controller.abort();
  }, []);
  const totalPages = Math.ceil(leaderboard.length / ITEMS_PER_PAGE);
  const paginatedLeaderboard = leaderboard.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // No students yet, or the server cannot be reached: no section, rather than made-up names
  if (leaderboard.length === 0) return null;

  return (
    <section className="lp-sec lp-pad relative overflow-hidden">
      <BackdropVideo src={landingConfig.media.leaderboard} parallax />
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
              <div className="liquid-glass lp-lb-rank font-display">{p.rank}</div>
              <div className="lp-lb-who">
                <div className="lp-lb-name font-display">{p.name}</div>
                <div className="lp-lb-sub">
                  {p.department} {p.graduatingYear ? `'${p.graduatingYear.toString().slice(-2)}` : ''} • {brand.names.institution}
                </div>
              </div>
              <div className="liquid-glass lp-lb-score rounded-full">{p.score} pts</div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="lp-pg">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
              disabled={currentPage === 0}
              className={`liquid-glass lp-pg-btn rounded-full font-medium transition-all duration-300 ${
                currentPage === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[rgba(0,136,204,0.2)] cursor-pointer'
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
              onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))}
              disabled={currentPage === totalPages - 1}
              className={`liquid-glass lp-pg-btn rounded-full font-medium transition-all duration-300 ${
                currentPage === totalPages - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[rgba(0,136,204,0.2)] cursor-pointer'
              }`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
