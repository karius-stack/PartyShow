import { motion } from 'motion/react';

const LETTERS = 'PartyShow'.split('');

/** Vises før admin har valgt en modus. */
export function LandingView({ showName }: { showName: string }) {
  return (
    <div className="landing">
      <div className="landing-logo" aria-label="PartyShow">
        <motion.div
          className="landing-glow"
          initial={{ opacity: 0, scale: 0.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: 'easeOut' }}
        />
        <h1 className="landing-wordmark">
          {LETTERS.map((letter, i) => (
            <motion.span
              key={i}
              className={i >= 5 ? 'landing-accent' : undefined}
              initial={{ y: '-0.6em', opacity: 0, filter: 'blur(10px)' }}
              animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.4 + i * 0.09, type: 'spring', stiffness: 140, damping: 12 }}
            >
              {letter}
            </motion.span>
          ))}
        </h1>
        <motion.div
          className="landing-rule"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 1.4, duration: 0.9, ease: 'easeOut' }}
        />
      </div>
      <motion.p className="landing-show" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2, duration: 1 }}>
        {showName}
      </motion.p>
    </div>
  );
}
