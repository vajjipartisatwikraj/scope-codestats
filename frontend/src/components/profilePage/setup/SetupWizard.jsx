import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/csr/ArrowRight';
import { CheckIcon } from '@phosphor-icons/react/dist/csr/Check';
import { Button, Card, Notice, Stepper } from '../../ui';
import { completionOf } from '../completion';
import AboutForm from '../forms/AboutForm';
import BasicsForm from '../forms/BasicsForm';
import InterestsForm from '../forms/InterestsForm';
import LinksForm from '../forms/LinksForm';
import PlatformsForm from '../forms/PlatformsForm';
import SkillsForm from '../forms/SkillsForm';
import { hasErrors } from '../parts/SectionEditor';
import SetupProgress from './SetupProgress';
import { SETUP_STEPS, draftAsProfile, setupDraft, setupFinalPayload } from './setupSteps';

/**
 * The first-time setup: four short steps instead of one long form. The first two are required (what
 * the leaderboard and the score need); the other two are optional and say so. Each step is saved when
 * the student moves on, so closing the tab loses nothing, and the last one finishes the setup and goes
 * to the dashboard.
 *
 *   - Errors sit under the field, update as the student types, and the first one takes focus.
 *   - A failed save keeps everything typed and says why at the top of the step.
 *   - The completion tile on the side moves as the student fills things in.
 *
 *   data   everything useProfileData returns
 */
export default function SetupWizard({ data }) {
  const { profile, achievements, saveProfile, finishSetup } = data;
  const navigate = useNavigate();
  const bodyRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState(() => setupDraft(profile));
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [done, setDone] = useState([]);

  const step = SETUP_STEPS[index];
  const last = index === SETUP_STEPS.length - 1;
  const errors = useMemo(() => (attempted ? step.validate(draft) : {}), [attempted, step, draft]);
  const completion = useMemo(() => completionOf(draftAsProfile(draft, profile), achievements), [draft, profile, achievements]);

  const set = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setFailure('');
  };

  const go = (target) => {
    setIndex(target);
    setAttempted(false);
    setFailure('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const next = async () => {
    if (busy) return;
    setAttempted(true);
    const found = step.validate(draft);
    // Optional steps may still have a problem to fix (a bad link); required ones must be valid
    if (hasErrors(found)) {
      window.requestAnimationFrame(() => {
        const field = bodyRef.current ? bodyRef.current.querySelector('[aria-invalid="true"]') : null;
        if (field) field.focus();
      });
      return;
    }

    setBusy(true);
    setFailure('');
    try {
      if (last) {
        await finishSetup(setupFinalPayload(draft));
        toast.success('Your profile is ready. Welcome to CodeStats.');
        navigate('/dashboard', { replace: true });
        return;
      }
      await saveProfile(step.payload(draft));
      setDone((list) => (list.includes(step.key) ? list : [...list, step.key]));
      go(index + 1);
    } catch (error) {
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  };

  const renderStep = () => {
    const props = { draft, set, errors };
    if (step.key === 'basics') return <BasicsForm {...props} rollEditable email={profile.email} />;
    if (step.key === 'platforms') return <PlatformsForm {...props} required />;
    if (step.key === 'skills')
      return (
        <div className="pf-stack">
          <SkillsForm {...props} />
          <InterestsForm {...props} />
        </div>
      );
    return (
      <div className="pf-stack">
        <AboutForm {...props} />
        <LinksForm {...props} />
      </div>
    );
  };

  return (
    <div className="pf-setup">
      <header className="pf-setup__header">
        <h1 className="pf-setup__title">Set up your profile</h1>
        <p className="pf-setup__lead">Four short steps. The first two are required, the rest are up to you, and you can change everything later.</p>
      </header>

      <Stepper steps={SETUP_STEPS.map(({ key, label }) => ({ key, label }))} current={step.key} completed={done} onStepClick={(key) => go(SETUP_STEPS.findIndex((entry) => entry.key === key))} label="Setup progress" />

      <div className="pf-setup__grid">
        <Card as="section" className="pf-card pf-setup__card" aria-labelledby="pf-step-title">
          <div className="pf-setup__intro">
            <h2 className="pf-setup__step" id="pf-step-title">
              {step.title}
            </h2>
            <p className="pf-muted">{step.why}</p>
          </div>

          <div ref={bodyRef} className="pf-setup__body">
            {failure ? (
              <Notice tone="danger" title="This step was not saved">
                {failure}
              </Notice>
            ) : null}
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                next();
              }}
            >
              {renderStep()}
            </form>
          </div>

          <footer className="pf-setup__footer">
            {index > 0 ? (
              <Button startIcon={<ArrowLeftIcon size={18} aria-hidden="true" />} onClick={() => go(index - 1)} disabled={busy}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button
              variant="primary"
              loading={busy}
              onClick={next}
              startIcon={last ? <CheckIcon size={18} weight="bold" aria-hidden="true" /> : undefined}
              endIcon={last ? undefined : <ArrowRightIcon size={18} aria-hidden="true" />}
            >
              {last ? 'Finish setup' : 'Save and continue'}
            </Button>
          </footer>
        </Card>

        <aside className="pf-setup__aside" aria-label="Your progress">
          <SetupProgress completion={completion} />
          <p className="pf-muted pf-setup__note">Your email and mobile number are never shown on your public profile.</p>
        </aside>
      </div>
    </div>
  );
}
