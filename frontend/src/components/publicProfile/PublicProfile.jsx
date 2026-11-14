import brand from '../../brand';
import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import './publicProfile.css';
import AchievementsCard from './AchievementsCard';
import ActivityPlatformsCard from './ActivityPlatformsCard';
import { AboutCard, DetailsCard, EducationCard, SkillsCard } from './AsideCards';
import GitHubCard from './GitHubCard';
import ProfileHero from './ProfileHero';
import { ProfileError, ProfileNotFound, ProfileRateLimited, ProfileSkeleton } from './ProfileStates';
import ProfileTopBar from './ProfileTopBar';
import ShareDialog from './ShareDialog';
import { StatTiles } from './StatTiles';
import { platformsOf, profileUrl, titleCase } from './profileModel';
import usePublicProfile from './usePublicProfile';

/** The tab title names the student while their profile is open, and goes back afterwards */
function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    if (title) document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/**
 * The public profile of a student (route /public-profile/:username). It is the only profile page of
 * the app: the leaderboard, the search and every shared link open it, for visitors and signed-in
 * users alike, and it shows only what the server chooses to make public.
 *
 * One request is made per visit (see usePublicProfile; the server allows 2 per second per IP and
 * blocks an IP for a minute beyond that). The page is built from small parts, each in its own file:
 *
 *   ProfileTopBar    brand, theme switch, sign in / open dashboard
 *   ProfileHero      picture, name, who they are, links and Share
 *   StatTiles        college rank, department rank, problems solved, consistency
 *   ActivityPlatformsCard  one card, tabs on top: all platforms, then one per platform. Each tab has its
 *                    year heatmap with streaks (custom Heatmap), then the platform's numbers (custom
 *                    PieChart, BarChart, Gauge)
 *   GitHubCard       under it: the GitHub heatmap and the GitHub numbers
 *   AchievementsCard projects, internships, certifications, achievements, with a DetailPanel
 *   AsideCards       about, details, skills and interests, education
 *   ShareDialog      QR code, copy link, LinkedIn
 *   ProfileStates    skeleton, not found, rate limited, error
 *
 * Layout: a 12 column grid from 1000px (the hero across, the tiles, then the main column 8 and the
 * side column 4); 2 columns of tiles from 600px; one column below. Both themes, no Material UI.
 */
export default function PublicProfile() {
  const { username } = useParams();
  const { status, profile, message, retryAt, reload } = usePublicProfile(username);
  const [shareOpen, setShareOpen] = useState(false);

  const ready = status === 'ready' && profile;
  useDocumentTitle(ready ? `${titleCase(profile.name)} | ${brand.names.platform}` : undefined);

  const platforms = useMemo(() => (ready ? platformsOf(profile.codingProfiles) : []), [ready, profile]);
  const github = platforms.find((platform) => platform.key === 'github');

  let body;
  if (status === 'loading') {
    body = <ProfileSkeleton />;
  } else if (status === 'notfound') {
    body = <ProfileNotFound message={message} />;
  } else if (status === 'limited') {
    body = <ProfileRateLimited retryAt={retryAt} onRetry={reload} />;
  } else if (!ready) {
    body = <ProfileError message={message} onRetry={reload} />;
  } else {
    body = (
      <div className="pp-grid">
        <ProfileHero profile={profile} onShare={() => setShareOpen(true)} />
        <StatTiles profile={profile} />

        <div className="pp-main-col">
          <ActivityPlatformsCard activity={profile.activity} platforms={platforms} />
          <GitHubCard platform={github} activity={profile.activity} />
          <AchievementsCard achievements={profile.achievements} />
        </div>

        <aside className="pp-aside" aria-label="More about this student">
          <AboutCard about={profile.about} />
          <DetailsCard profile={profile} />
          <SkillsCard skills={profile.skills} interests={profile.interests} />
          <EducationCard education={profile.education} />
        </aside>

        <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} url={profileUrl(username)} name={titleCase(profile.name)} />
      </div>
    );
  }

  return (
    <div className="pp">
      <ProfileTopBar />
      <main className="pp-main">{body}</main>
      <footer className="pp-footer">
        <p>Public profile on {brand.names.platform}. Platform
 numbers come from the student&rsquo;s linked accounts and may be a little behind.</p>
      </footer>
    </div>
  );
}

/** Old links to /user-view/:username go to the one profile page */
export function PublicProfileRedirect() {
  const { username } = useParams();
  return <Navigate to={`/public-profile/${encodeURIComponent(username || '')}`} replace />;
}
