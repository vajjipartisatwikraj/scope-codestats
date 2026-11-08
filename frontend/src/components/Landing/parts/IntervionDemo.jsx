import React, { useEffect, useRef, useState } from 'react';
import { useInView, useReducedMotion } from 'framer-motion';
import WaveMesh from '../../custom-components/WaveMesh';
import './IntervionDemo.css';

/**
 * The Intervion tile (AI interviews) as a short film that loops while the tile is on screen.
 *
 * Behind everything, an AI mesh: a flowing sheet of fine triangles and glowing nodes (WaveMesh, one light
 * canvas). It answers the conversation: calm while nobody speaks, livelier while the interviewer asks, and
 * a little less so while the student answers.
 *
 * In front, an audio chat: the interviewer's question, the student's spoken answer and a follow-up come in
 * one after another, each with a live equaliser while it is being spoken.
 *
 *   0.6s  question          3.4s  answer          6.8s  follow-up          9.2s  your turn          ~13.5s  fade, again
 *
 * It starts when the tile is mostly in view and stops when it leaves. For people who asked for less motion
 * it shows the finished conversation and a still mesh. Decorative (aria-hidden): the tile's title and
 * sentence carry the meaning. The conversation is sample text.
 */

// ─── The audio chat ─────────────────────────────────────────────────────────────────────────────────────

const SCRIPT = [
  { who: 'ai', name: 'Intervion', text: 'Walk me through a project you built.', time: '0:03', bars: [0.5, 0.9, 0.6, 1, 0.45] },
  { who: 'you', name: 'You', text: 'A placement tracker in React and Node, with nightly syncs.', time: '0:08', bars: [0.7, 0.4, 1, 0.65, 0.85] },
  { who: 'ai', name: 'Intervion', text: 'How did you keep the slow queries fast?', time: '0:03', bars: [0.6, 1, 0.5, 0.85, 0.4] },
];
// Times in ms from the start of one round
const T_QUESTION = 600;
const T_ANSWER = 3400;
const T_FOLLOW_UP = 6800;
const T_YOUR_TURN = 9200; // the follow-up has been asked
const HOLD_MS = 3800; // the finished conversation stays
const FADE_MS = 500; // keep the same as the opacity transition of .fx-iv in IntervionDemo.css

// How lively the mesh is for each speaker
const ENERGY = { ai: 1, you: 0.8, idle: 0.4 };

const STATUS = {
  ai: 'Intervion is asking',
  you: 'Listening to your answer',
  idle: 'Your turn',
};
const STATUS_AT_START = 'Ready';

export default function IntervionDemo() {
  const reduced = Boolean(useReducedMotion());
  const rootRef = useRef(null);
  const inView = useInView(rootRef, { margin: '0px 0px -22% 0px' });

  const [shown, setShown] = useState(reduced ? SCRIPT.length : 0); // how many messages are in
  const [speaker, setSpeaker] = useState('idle'); // 'ai' | 'you' | 'idle'
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (reduced) {
      setShown(SCRIPT.length);
      setSpeaker('idle');
      return undefined;
    }
    const reset = () => {
      setShown(0);
      setSpeaker('idle');
      setLeaving(false);
    };
    if (!inView) {
      reset();
      return undefined;
    }

    const timers = [];
    const later = (ms, fn) => timers.push(window.setTimeout(fn, ms));
    const round = () => {
      reset();
      later(T_QUESTION, () => {
        setShown(1);
        setSpeaker('ai');
      });
      later(T_ANSWER, () => {
        setShown(2);
        setSpeaker('you');
      });
      later(T_FOLLOW_UP, () => {
        setShown(3);
        setSpeaker('ai');
      });
      later(T_YOUR_TURN, () => setSpeaker('idle'));
      later(T_YOUR_TURN + HOLD_MS, () => setLeaving(true));
      later(T_YOUR_TURN + HOLD_MS + FADE_MS, reset);
      later(T_YOUR_TURN + HOLD_MS + FADE_MS + 150, round);
    };
    round();
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [inView, reduced]);

  const status = speaker === 'idle' && shown === 0 ? STATUS_AT_START : STATUS[speaker];

  return (
    <>
      <WaveMesh className="fx-iv-mesh" energy={ENERGY[speaker]} />
      <div ref={rootRef} className="fx-iv" data-leave={leaving ? 'true' : 'false'} aria-hidden="true">
        <p className="fx-iv-status" data-mood={speaker}>
          {status}
        </p>
        <div className="fx-iv-chat">
          <ul className="fx-iv-list">
          {SCRIPT.map((message, index) => {
            const live = speaker !== 'idle' && index === shown - 1;
            return (
              <li key={index} className="fx-iv-msg" data-who={message.who} data-on={shown > index ? 'true' : 'false'} data-live={live ? 'true' : 'false'}>
                <span className="fx-iv-who">{message.name}</span>
                <div className="fx-iv-bubble">
                  <span className="fx-iv-eq">
                    {message.bars.map((height, i) => (
                      <i key={i} style={{ '--h': height, '--i': i }} />
                    ))}
                  </span>
                  <span className="fx-iv-text">{message.text}</span>
                  <span className="fx-iv-time">{message.time}</span>
                </div>
              </li>
            );
          })}
        </ul>
        </div>
      </div>
    </>
  );
}
