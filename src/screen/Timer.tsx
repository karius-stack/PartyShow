import { motion } from 'motion/react';
import { timerRemainingMs } from '../../shared/scoring.ts';
import type { TimerState } from '../../shared/types.ts';
import { formatTime } from '../lib/format.ts';
import { useServerNow } from '../lib/serverClock.ts';

const WARNING_MS = 10_000;

export function Timer({ timer }: { timer: TimerState }) {
  const running = timer.endsAt !== null;
  const now = useServerNow(running);
  const remaining = timerRemainingMs(timer, now);
  const done = remaining === 0;
  const warning = !done && remaining <= WARNING_MS;
  const progress = timer.durationMs > 0 ? remaining / timer.durationMs : 0;

  return (
    <div className={`timer${warning ? ' timer-warning' : ''}${done ? ' timer-done' : ''}`}>
      <motion.div
        className="timer-value"
        animate={warning && running ? { scale: [1, 1.12, 1] } : { scale: 1 }}
        transition={warning && running ? { duration: 1, repeat: Infinity } : undefined}
      >
        {done ? 'Tiden er ute!' : formatTime(remaining)}
      </motion.div>
      <div className="timer-bar">
        <div className="timer-bar-fill" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
