import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

const LETTERS = 'PartyShow'.split('');

/** Hvor ofte logoen toner ut og animeres inn på nytt, så skjermen ikke står stille. */
const REPLAY_MS = 60_000;

function Logo({ showName }: { showName: string }) {
  return (
    <>
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
      <motion.p
        className="landing-show"
        initial={{ opacity: 0, y: '0.6em' }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
      >
        {showName}
      </motion.p>
    </>
  );
}

/** Vises før admin har valgt en modus. */
export function LandingView({ showName }: { showName: string }) {
  // Ny nøkkel hvert minutt: logoen toner ut og spiller inn-animasjonen på nytt.
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), REPLAY_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="landing">
      <AnimatePresence mode="wait">
        <motion.div
          key={cycle}
          className="landing-logo"
          aria-label="PartyShow"
          exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
          transition={{ duration: 0.8, ease: 'easeIn' }}
        >
          <Logo showName={showName} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
