import { motion } from 'motion/react';
import { BAT_PATH } from './Background.tsx';

// Flaggermusene spres i en ring fra vinneren og ut av bildet.
const BATS = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 16) * Math.PI * 2 + (i % 2) * 0.2;
  const distance = 70 + (i % 3) * 12;
  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance * 0.7,
    delay: 0.9 + (i % 4) * 0.12,
    scale: 0.6 + (i % 3) * 0.25,
    flip: Math.cos(angle) < 0,
  };
});

const SPARKS = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2;
  const distance = 18 + (i % 5) * 6;
  return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, delay: 1.2 + (i % 7) * 0.05 };
});

export function Celebration() {
  return (
    <div className="hw-celebration" aria-hidden>
      {/* Månestråle som faller ned på vinneren */}
      <motion.div
        className="hw-beam"
        initial={{ opacity: 0, scaleX: 0.2 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.4, duration: 1.4, ease: 'easeOut' }}
      />
      <motion.div
        className="hw-ground-glow"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8, duration: 1.2 }}
      />

      {SPARKS.map((s, i) => (
        <motion.span
          key={`s${i}`}
          className="hw-burst-spark"
          initial={{ x: 0, y: 0, opacity: 0, scale: 1 }}
          animate={{ x: `${s.x}vmin`, y: `${s.y}vmin`, opacity: [0, 1, 0], scale: [1, 1, 0.3] }}
          transition={{ delay: s.delay, duration: 1.6, ease: 'easeOut' }}
        />
      ))}

      {BATS.map((b, i) => (
        <motion.div
          key={`b${i}`}
          className="hw-burst-bat"
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.1 }}
          animate={{ x: `${b.x}vw`, y: `${b.y}vh`, opacity: [0, 1, 1, 0], scale: b.scale }}
          transition={{ delay: b.delay, duration: 2.6, ease: [0.2, 0.6, 0.4, 1] }}
        >
          <div style={b.flip ? { transform: 'scaleX(-1)' } : undefined}>
            <motion.svg
              viewBox="0 0 60 26"
              animate={{ scaleY: [1, 0.3, 1] }}
              transition={{ duration: 0.28, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d={BAT_PATH} />
            </motion.svg>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
