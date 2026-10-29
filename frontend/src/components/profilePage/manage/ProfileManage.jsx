import React, { useCallback, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../../ui';
import { completionOf } from '../completion';
import SectionEditor from '../parts/SectionEditor';
import AboutForm from '../forms/AboutForm';
import BasicsForm from '../forms/BasicsForm';
import EducationForm from '../forms/EducationForm';
import InterestsForm from '../forms/InterestsForm';
import LinksForm from '../forms/LinksForm';
import PlatformsForm from '../forms/PlatformsForm';
import PortfolioForm from '../forms/PortfolioForm';
import SkillsForm from '../forms/SkillsForm';
import AboutSection from '../sections/AboutSection';
import BasicsSection from '../sections/BasicsSection';
import EducationSection from '../sections/EducationSection';
import LinksSection from '../sections/LinksSection';
import PlatformsSection from '../sections/PlatformsSection';
import PortfolioSection from '../sections/PortfolioSection';
import { InterestsSection, SkillsSection } from '../sections/SkillsSection';
import {
  aboutDraft,
  aboutPayload,
  achievementDraft,
  achievementPayload,
  basicsDraft,
  basicsPayload,
  educationDraft,
  educationPayload,
  emptyAchievement,
  interestsDraft,
  interestsPayload,
  linksDraft,
  linksPayload,
  platformsDraft,
  platformsPayload,
  skillsDraft,
  skillsPayload,
  typeInfo,
  validateAchievement,
  validateBasics,
  validateEducationDraft,
  validateLinks,
  validatePlatforms,
  validateSkills,
} from '../profileModel';
import NextSteps from './NextSteps';
import ProfileHeader from './ProfileHeader';
import VisibilityCard from './VisibilityCard';

/** What the toast says after each part is saved */
const SAVED = {
  basics: 'Personal details saved.',
  about: 'Your bio is saved.',
  platforms: 'Platforms saved. Your stats appear after the next nightly update.',
  links: 'Links saved.',
  skills: 'Skills saved.',
  interests: 'Interests saved.',
  education: 'Education saved.',
  portfolio: 'Portfolio saved.',
};

/**
 * The profile of a student who has finished setting up: the person and their completion at the top,
 * what to do next, then each part of the profile as a card with its own editor. Every edit happens in
 * the same kind of drawer (SectionEditor), so there is one way to change anything.
 *
 *   data   everything useProfileData returns
 */
export default function ProfileManage({ data }) {
  const { profile, achievements, catalog, saveProfile, unlinkPlatform, saveAchievement, deleteAchievement, loadCatalog } = data;
  const [editor, setEditor] = useState(null); // { section, item?, type? }
  const [unlinking, setUnlinking] = useState(null); // a platform
  const [deleting, setDeleting] = useState(null); // an achievement
  const [busy, setBusy] = useState(false);

  const completion = useMemo(() => completionOf(profile, achievements), [profile, achievements]);

  const open = useCallback((section, extra = {}) => setEditor({ section, ...extra }), []);
  const close = useCallback(
    (saved) => {
      const section = editor?.section;
      setEditor(null);
      if (saved === true && section) toast.success(SAVED[section]);
    },
    [editor]
  );

  /** A next step opens the editor; the portfolio opens it on a new item */
  const openStep = (key) => (key === 'portfolio' ? open('portfolio', { item: null, type: 'project' }) : open(key));

  const confirmUnlink = async () => {
    setBusy(true);
    try {
      await unlinkPlatform(unlinking.key);
      toast.success(`${unlinking.name} unlinked.`);
      setUnlinking(null);
      setEditor(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteAchievement(deleting._id);
      toast.success('Deleted from your portfolio.');
      setDeleting(null);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  // The editor that is open, described once: what it shows, how it checks, what it sends
  const editors = {
    basics: {
      title: 'Edit personal details',
      description: 'Your roll number and email are fixed. You can change the rest.',
      initial: basicsDraft(profile),
      validate: (draft) => validateBasics(draft),
      toPayload: (draft) => basicsPayload(draft),
      render: (props) => <BasicsForm {...props} email={profile.email} picture={profile.profilePicture} />,
    },
    about: {
      title: 'Edit your bio',
      description: 'Write it the way you would say it to someone you have just met.',
      initial: aboutDraft(profile),
      toPayload: aboutPayload,
      render: (props) => <AboutForm {...props} />,
    },
    platforms: {
      title: 'Manage coding platforms',
      description: 'Add or change the usernames behind your score.',
      initial: platformsDraft(profile),
      validate: (draft) => validatePlatforms(draft),
      toPayload: platformsPayload,
      render: (props) => (
        <PlatformsForm
          {...props}
          saved={Object.fromEntries(Object.entries(profile.profiles || {}).map(([key, value]) => [key, value.username]))}
          onUnlink={(platform) => setUnlinking(platform)}
        />
      ),
    },
    links: {
      title: 'Edit links',
      description: 'These appear as buttons on your public profile.',
      initial: linksDraft(profile),
      validate: validateLinks,
      toPayload: linksPayload,
      render: (props) => <LinksForm {...props} />,
    },
    skills: {
      title: 'Edit skills',
      description: 'Group your skills into sets so they are easy to scan.',
      initial: skillsDraft(profile),
      validate: validateSkills,
      toPayload: skillsPayload,
      render: (props) => <SkillsForm {...props} />,
    },
    interests: {
      title: 'Edit interests',
      description: 'The areas you want to grow in.',
      initial: interestsDraft(profile),
      toPayload: interestsPayload,
      render: (props) => <InterestsForm {...props} />,
    },
    education: {
      title: 'Edit education',
      description: 'Add your college first. Your school or intermediate is optional.',
      width: 'lg',
      initial: educationDraft(profile),
      validate: validateEducationDraft,
      toPayload: educationPayload,
      render: (props) => <EducationForm {...props} department={profile.department} />,
    },
  };

  const current = editor && editor.section !== 'portfolio' ? editors[editor.section] : null;
  const item = editor && editor.section === 'portfolio' ? editor.item : null;

  return (
    <div className="pf-grid">
      <div className="pf-hero">
        <ProfileHeader profile={profile} completion={completion} />
      </div>

      <div className="pf-main-col">
        <NextSteps completion={completion} onOpen={openStep} />
        <BasicsSection profile={profile} onEdit={() => open('basics')} />
        <AboutSection profile={profile} onEdit={() => open('about')} />
        <PlatformsSection profile={profile} onEdit={() => open('platforms')} />
        <PortfolioSection achievements={achievements} onAdd={(type) => open('portfolio', { item: null, type })} onEdit={(entry) => open('portfolio', { item: entry })} onDelete={setDeleting} />
        <EducationSection profile={profile} onEdit={() => open('education')} />
      </div>

      <aside className="pf-aside" aria-label="More about your profile">
        <VisibilityCard profile={profile} />
        <LinksSection profile={profile} onEdit={() => open('links')} />
        <SkillsSection profile={profile} onEdit={() => open('skills')} />
        <InterestsSection profile={profile} onEdit={() => open('interests')} />
      </aside>

      {current ? <SectionEditor key={editor.section} {...current} onSave={saveProfile} onClose={close} /> : null}

      {editor && editor.section === 'portfolio' ? (
        <SectionEditor
          key={item ? item._id : `new-${editor.type}`}
          title={item ? `Edit ${typeInfo(item.type).single.toLowerCase()}` : 'Add to your portfolio'}
          description={item ? 'Change anything, then save.' : 'Pick what you are adding, then fill in the details.'}
          width="lg"
          initial={item ? achievementDraft(item) : { ...emptyAchievement(editor.type) }}
          validate={validateAchievement}
          toPayload={achievementPayload}
          alwaysSavable={!item}
          saveLabel={item ? 'Save changes' : 'Add to portfolio'}
          onSave={(payload) => saveAchievement(item ? item._id : null, payload)}
          onClose={close}
          render={(props) => <PortfolioForm {...props} locked={Boolean(item)} catalog={catalog} loadCatalog={loadCatalog} />}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(unlinking)}
        onClose={() => setUnlinking(null)}
        title={unlinking ? `Unlink ${unlinking.name}?` : 'Unlink platform?'}
        description="This removes your username and the progress history we saved for it, so your score changes. Your other platforms are not affected. Anything you typed but did not save here is lost."
        confirmLabel={unlinking ? `Unlink ${unlinking.name}` : 'Unlink'}
        danger
        busy={busy}
        onConfirm={confirmUnlink}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title={deleting ? `Delete \u201C${deleting.title}\u201D?` : 'Delete item?'}
        description="It will disappear from your portfolio and your public profile. This cannot be undone."
        confirmLabel="Delete item"
        danger
        busy={busy}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
