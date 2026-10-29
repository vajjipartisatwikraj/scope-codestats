import React from 'react';
import { BriefcaseIcon } from '@phosphor-icons/react/dist/csr/Briefcase';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { CheckCircleIcon } from '@phosphor-icons/react/dist/csr/CheckCircle';
import { CompassIcon } from '@phosphor-icons/react/dist/csr/Compass';
import { GraduationCapIcon } from '@phosphor-icons/react/dist/csr/GraduationCap';
import { IdentificationCardIcon } from '@phosphor-icons/react/dist/csr/IdentificationCard';
import { LinkSimpleIcon } from '@phosphor-icons/react/dist/csr/LinkSimple';
import { UserCircleIcon } from '@phosphor-icons/react/dist/csr/UserCircle';
import { WrenchIcon } from '@phosphor-icons/react/dist/csr/Wrench';
import { Badge, Card } from '../../ui';

const ICONS = {
  basics: IdentificationCardIcon,
  platforms: LinkSimpleIcon,
  about: UserCircleIcon,
  skills: WrenchIcon,
  education: GraduationCapIcon,
  portfolio: BriefcaseIcon,
  interests: CompassIcon,
  links: LinkSimpleIcon,
};

/**
 * What is left to do, biggest gain first. Each row says what to do, why it helps, how much it adds
 * and how long it takes, and is one button that opens the right editor. When nothing is left, the
 * card says so instead of disappearing, so finishing feels like finishing.
 *
 *   completion   from completionOf()
 *   onOpen(key)  opens the editor for that part
 */
export default function NextSteps({ completion, onOpen }) {
  const { next, percent } = completion;

  if (next.length === 0) {
    return (
      <Card as="section" className="pf-card" title="Finish your profile">
        <div className="pf-done">
          <span className="pf-mark pf-mark--success" aria-hidden="true">
            <CheckCircleIcon size={24} weight="fill" />
          </span>
          <div>
            <p className="pf-done__title">Your profile is complete</p>
            <p className="pf-muted">Everything visitors look for is here. Come back when you finish a new project or earn a certificate, and add it to your portfolio.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card as="section" className="pf-card" title="Finish your profile" description={`You are ${percent}% of the way there. Start with the step that adds the most.`}>
      <ul className="pf-steps">
        {next.map((step) => {
          const Icon = ICONS[step.key] || CheckCircleIcon;
          const gain = Math.max(1, Math.round(step.weight - step.earned));
          return (
            <li key={step.key}>
              <button type="button" className="pf-step" onClick={() => onOpen(step.key)}>
                <span className="pf-mark" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className="pf-step__text">
                  <span className="pf-step__title">{step.title}</span>
                  <span className="pf-step__hint">{step.hint}</span>
                  <span className="pf-step__detail">{step.detail}</span>
                </span>
                <span className="pf-step__meta">
                  <Badge tone="info">+{gain}%</Badge>
                  <span className="pf-step__time">{step.minutes} min</span>
                </span>
                <CaretRightIcon size={16} weight="bold" aria-hidden="true" className="pf-step__caret" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
