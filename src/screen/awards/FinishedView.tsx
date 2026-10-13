import { motion } from 'motion/react';
import type { Participant } from '../../../shared/types.ts';
import { joinNames } from '../../lib/format.ts';
import type { AwardsViewProps } from '../ScreenRoot.tsx';
import { PortraitCard } from './PortraitCard.tsx';

export function FinishedView({ state, show }: AwardsViewProps) {
  const awarded = state.categories
    .map((category) => ({
      category,
      winners: (category.winnerIds ?? [])
        .map((id) => state.participants.find((p) => p.id === id))
        .filter((p): p is Participant => p !== undefined),
    }))
    .filter((entry) => entry.winners.length > 0);

  return (
    <div className="awards-finished">
      <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {show.name}
      </motion.p>
      <motion.h1 className="screen-title" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        Kveldens vinnere
      </motion.h1>
      <ul className="hall-of-fame">
        {awarded.map(({ category, winners }, i) => (
          <motion.li
            key={category.id}
            initial={{ y: 60, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 + i * 0.4, type: 'spring', stiffness: 120, damping: 14 }}
          >
            <span className="hall-of-fame-category">{category.title}</span>
            <div className="hall-of-fame-portraits">
              {winners.map((w) => (
                <PortraitCard key={w.id} participant={w} showName={false} />
              ))}
            </div>
            <span className="hall-of-fame-name">{joinNames(winners.map((w) => w.name))}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
