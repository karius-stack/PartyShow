import { AnimatePresence, motion } from 'motion/react';
import { useLayoutEffect, useRef } from 'react';
import type { Participant } from '../../../shared/types.ts';
import { fitPortraitWidth } from './fitPortraits.ts';

/**
 * Deltakerens bilde i en buet ramme med navneskilt. Mens bakgrunnen fjernes vises
 * originalbildet med en «trylle»-effekt; ferdig utklipp (uten bakgrunn) stikker
 * litt opp av rammen.
 */
export function PortraitCard({ participant, showName = true }: { participant: Participant; showName?: boolean }) {
  const src = participant.aiUrl ?? participant.originalUrl;
  const isAi = participant.aiUrl !== null;
  const conjuring = participant.imageStatus === 'pending' && !isAi;

  return (
    <div className={`portrait ${isAi ? 'portrait-ai' : 'portrait-photo'}${conjuring ? ' portrait-conjuring' : ''}`}>
      <div className="portrait-frame">
        <AnimatePresence initial={false}>
          <motion.img
            key={src}
            src={src}
            alt=""
            className="portrait-img"
            initial={{ opacity: 0, scale: 1.1, filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, transition: { duration: 0.8 } }}
            transition={{ duration: 1.4, ease: 'easeOut' }}
          />
        </AnimatePresence>
        {conjuring && <div className="portrait-magic" aria-hidden />}
      </div>
      {showName && <span className="portrait-name">{participant.name}</span>}
    </div>
  );
}

/**
 * Setter `--portrait-w` på rutenettet slik at alle portrettene får plass i
 * området det har. Måler med clientWidth/-Height så overgangsanimasjonen
 * (scale) ikke påvirker resultatet.
 */
export function useFittedPortraits<T extends HTMLElement>(count: number, maxWidth: number) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => el.style.setProperty('--portrait-w', `${fitPortraitWidth(count, el.clientWidth, el.clientHeight, maxWidth)}px`);
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, [count, maxWidth]);
  return ref;
}
