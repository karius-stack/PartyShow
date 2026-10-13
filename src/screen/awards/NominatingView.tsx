import { motion } from 'motion/react';
import type { AwardsViewProps } from '../ScreenRoot.tsx';
import { ProgressRing } from './ProgressRing.tsx';
import { PortraitCard, useFittedPortraits } from './PortraitCard.tsx';

export function NominatingView({ state }: AwardsViewProps) {
  const { participants, categories } = state;
  const done = new Set(state.nominatedIds);
  const doneCount = participants.filter((p) => done.has(p.id)).length;
  const allDone = participants.length > 0 && doneCount === participants.length;
  const gridRef = useFittedPortraits<HTMLUListElement>(participants.length, 150);

  return (
    <div className="awards-nominating">
      <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {categories.length} {categories.length === 1 ? 'nominasjon' : 'nominasjoner'}
      </motion.p>
      <motion.h1 className="screen-title" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {allDone ? 'Alle har nominert!' : 'Nominer på mobilen'}
      </motion.h1>

      <div className="nominating-body">
        <ProgressRing value={doneCount} total={participants.length} label="har nominert" />
        <ul className="nominating-categories">
          {categories.map((c, i) => (
            <motion.li key={c.id} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 + i * 0.12 }}>
              {c.title}
            </motion.li>
          ))}
        </ul>
      </div>

      <ul ref={gridRef} className="portrait-grid portrait-grid-compact">
        {participants.map((participant) => (
          <motion.li
            key={participant.id}
            className={done.has(participant.id) ? 'is-done' : 'is-waiting'}
            animate={done.has(participant.id) ? { opacity: 1, scale: 1, filter: 'grayscale(0)' } : { opacity: 0.4, scale: 0.92, filter: 'grayscale(0.9)' }}
            transition={{ type: 'spring', stiffness: 180, damping: 16 }}
          >
            <PortraitCard participant={participant} />
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
