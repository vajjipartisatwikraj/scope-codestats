/**
 * speechX/setup: the pre-test flow (route /speech-tests/:id/setup), rebuilt without Material UI.
 *
 *   import { SpeechTestSetup } from "./components/speechX/setup";
 *
 * Steps (same order and gating as before): Instructions (acknowledge to continue) -> Speaker check
 * (confirm you heard the sound) -> Audio check (record, check, then Start exam). Built on
 * speechX/shared (FocusHeader, FocusPage, SpeechCard, Reveal), the ui kit and custom-components
 * (AudioWaveform, LevelMeter, SegmentedProgress). Plain CSS with the prefix sxs- in setup.css.
 *
 *   SpeechTestSetup   the flow (default export of SpeechTestSetup.jsx)
 *   InstructionsStep, SpeakerCheckStep, AudioCheckStep, TestSummaryCard, TipsCarousel, TipCard,
 *   AcknowledgeBar, TranscriptPanel, CheckList, RecordButton, StepHead, StepNav, StepTransition
 *   instructionTips, useAudioCheck, useClipPlayback, useSpeakerCheck, useInputLevel
 */
import "./setup.css";

export { default as SpeechTestSetup } from "./SpeechTestSetup";
export { default as InstructionsStep } from "./InstructionsStep";
export { default as SpeakerCheckStep } from "./SpeakerCheckStep";
export { default as AudioCheckStep } from "./AudioCheckStep";
export { default as TestSummaryCard } from "./TestSummaryCard";
export { default as TipsCarousel } from "./TipsCarousel";
export { default as TipCard } from "./TipCard";
export { default as AcknowledgeBar } from "./AcknowledgeBar";
export { default as TranscriptPanel } from "./TranscriptPanel";
export { default as CheckList } from "./CheckList";
export { default as RecordButton } from "./RecordButton";
export { default as StepHead } from "./StepHead";
export { default as StepNav } from "./StepNav";
export { default as StepTransition } from "./StepTransition";
export { default as instructionTips } from "./instructionTips";
export { default as useAudioCheck, MAX_CHECK_SECONDS } from "./useAudioCheck";
export { default as useClipPlayback } from "./useClipPlayback";
export { default as useSpeakerCheck, SPEAKER_PHRASE } from "./useSpeakerCheck";
export { default as useInputLevel } from "./useInputLevel";
