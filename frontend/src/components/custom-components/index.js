/**
 * custom-components: generic, reusable building blocks for the whole app.
 *
 * Rules for everything in this folder:
 *  - Generic names. A component is named for what it is (BarChart, Gauge), never for the page
 *    that first used it.
 *  - Data and behaviour come in through props. A component never fetches, never reads a
 *    context and never knows its caller.
 *  - Every colour has a prop (and a CSS variable) and defaults to a --ds-* design token, so each
 *    component follows Midnight and Daylight without any theme code.
 *  - No Material UI. Plain CSS next to the component, Phosphor for icons.
 *  - The props are documented in the header comment of each component.
 *
 * Import from the folder:  import { BarChart, Gauge } from '../custom-components';
 */
export { default as BarChart } from './BarChart';
export { default as MiniBars } from './MiniBars';
export { default as Gauge } from './Gauge';
export { default as Heatmap, HeatmapLegend } from './Heatmap';
export { default as LineChart } from './LineChart';
export { default as TrendChart } from './TrendChart';
export { default as PieChart } from './PieChart';
export { default as ChartLegend } from './ChartLegend';
export { default as ChartTip, TipTitle, TipValue, TipRow } from './ChartTip';
export { default as PillTabs } from './PillTabs';
export { default as TagInput } from './TagInput';
export { default as AudioWaveform } from './AudioWaveform';
export { default as WaveformBars } from './WaveformBars';
export { default as LevelMeter } from './LevelMeter';
export { default as SignalBars } from './SignalBars';
export { default as RadarChart } from './RadarChart';
export { default as StarRating } from './StarRating';
export { default as AnimatedNumber, useEntered } from './AnimatedNumber';
export { default as ProgressBar } from './ProgressBar';
export { default as SegmentedProgress } from './SegmentedProgress';
export { default as ScoreRing } from './ScoreRing';
export { default as AnimatedCheck } from './AnimatedCheck';
export { default as AudioClipPlayer } from './AudioClipPlayer';
export { default as TimelineStrip } from './TimelineStrip';