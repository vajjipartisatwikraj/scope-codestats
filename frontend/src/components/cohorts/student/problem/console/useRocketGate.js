import { useCallback, useEffect, useState } from 'react';

/**
 * Holds a result back until the rocket has played it. The rocket launches while the code is judged,
 * then flies away (all passed) or tumbles (something failed), and only then does the result show.
 *
 *   launching   a submit is being judged: the rocket launches
 *   outcome     the finished result: anything that is a new value for every run (an object or an id),
 *               or null when there is none
 *   failed      the result is a failure
 *
 * Returns { state, playing, onComplete }
 *   state       'idle' | 'submitting' | 'success' | 'failure': for RocketAnimation
 *   playing     the rocket is on screen, so the result waits
 *   onComplete  RocketAnimation calls it when the flight is over
 *
 * If the animation never reports back, the result is released after the flight's own length plus a
 * margin, so a student is never left looking at a rocket.
 */
export default function useRocketGate({ launching, outcome, failed }) {
  const [shown, setShown] = useState(null);
  const pending = outcome !== null && outcome !== undefined && shown !== outcome;

  const onComplete = useCallback(() => setShown(outcome), [outcome]);

  useEffect(() => {
    if (!pending) return undefined;
    const timer = setTimeout(() => setShown(outcome), failed ? 2600 : 2800);
    return () => clearTimeout(timer);
  }, [pending, outcome, failed]);

  const state = pending ? (failed ? 'failure' : 'success') : launching ? 'submitting' : 'idle';
  return { state, playing: state !== 'idle', onComplete };
}
