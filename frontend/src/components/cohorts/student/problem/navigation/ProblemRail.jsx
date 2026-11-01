import React from 'react';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/csr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight';
import { HouseIcon } from '@phosphor-icons/react/dist/csr/House';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/csr/ArrowLeft';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';
import brand from '../../../../../brand';
import { IconButton } from '../../../../ui';
import { MOD_KEY } from '../model/shortcuts';
import './navigation.css';

/**
 * The 60px rail at the left of the problem screen, drawn on the accent: the logo, the way out (the
 * dashboard, or the question list during an exam, which keeps the exam's fullscreen), the previous
 * and next question of the module, and the theme switch. Its buttons carry the Daylight palette so
 * they are white with dark icons on the accent in both themes.
 *
 *   nav            the result of useProblemNavigation
 *   examSession    this tab is an exam: the way out goes back to the questions
 *   onLeave        the way out
 *   darkMode, onToggleTheme   the theme and its switch
 */
export default function ProblemRail({ nav, examSession, onLeave, darkMode, onToggleTheme }) {
  return (
    <nav className="ps-rail" aria-label="Question navigation">
      <div className="ps-rail__group" data-theme="daylight">
        <span className="ps-rail__logo">
          <img src={brand.platform.logo} alt={brand.platform.name} />
        </span>
        <IconButton label={examSession ? 'Back to the questions' : 'Back to the dashboard'} size="sm" onClick={onLeave}>
          {examSession ? <ArrowLeftIcon size={18} weight="regular" aria-hidden="true" /> : <HouseIcon size={18} weight="regular" aria-hidden="true" />}
        </IconButton>
      </div>
      <div className="ps-rail__group" data-theme="daylight">
        <IconButton label={nav.hasPrevious ? `Previous question (${MOD_KEY} + Shift + ,)` : 'No previous question'} size="sm" onClick={nav.goPrevious} disabled={!nav.hasPrevious}>
          <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
        </IconButton>
        <IconButton label={nav.hasNext ? `Next question (${MOD_KEY} + Shift + .)` : 'No next question'} size="sm" onClick={nav.goNext} disabled={!nav.hasNext}>
          <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
        </IconButton>
        <IconButton label={darkMode ? 'Switch to the light theme' : 'Switch to the dark theme'} size="sm" onClick={onToggleTheme}>
          {darkMode ? <SunIcon size={18} weight="regular" aria-hidden="true" /> : <MoonIcon size={18} weight="regular" aria-hidden="true" />}
        </IconButton>
      </div>
    </nav>
  );
}
