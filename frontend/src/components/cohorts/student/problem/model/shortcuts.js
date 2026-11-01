/** The modifier key to name in a shortcut hint: Command on a Mac, Ctrl elsewhere */
export const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
export const MOD_KEY = IS_MAC ? '\u2318' : 'Ctrl';

export const RUN_HINT = `Run code (${MOD_KEY} + ')`;
export const SUBMIT_HINT = `Submit (${MOD_KEY} + Enter)`;
