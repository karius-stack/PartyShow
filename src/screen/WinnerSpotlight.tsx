import { motion } from 'motion/react';
import type { StandingRow } from '../../shared/scoring.ts';
import { joinNames } from '../lib/format.ts';
import type { Theme } from '../themes/types.ts';
import { CountUp } from './CountUp.tsx';

export function winnerLayoutId(teamId: number): string {
  return `winner-avatar-${teamId}`;
}

interface Props {
  /** Alle lag på delt førsteplass. */
  winners: StandingRow[];
  theme: Theme;
  teamIndex: Map<number, number>;
}

export function WinnerSpotlight({ winners, theme, teamIndex }: Props) {
  const { TeamAvatar, WinnerCelebration } = theme;
  const shared = winners.length > 1;

  return (
    <motion.div className="winner-spotlight" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }}>
      {WinnerCelebration && <WinnerCelebration />}

      <motion.p
        className="screen-kicker"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1, duration: 0.6 }}
      >
        {shared ? 'Delt seier' : 'Vinneren er'}
      </motion.p>

      <div className="winner-avatars">
        {winners.map((row) => (
          <motion.div
            key={row.team.id}
            layoutId={winnerLayoutId(row.team.id)}
            className="winner-avatar"
            transition={{ type: 'spring', stiffness: 70, damping: 15, mass: 1.2 }}
          >
            <TeamAvatar team={row.team} index={teamIndex.get(row.team.id) ?? 0} size="large" />
          </motion.div>
        ))}
      </div>

      <motion.h1
        className="screen-title winner-name"
        initial={{ opacity: 0, scale: 0.4 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 140, damping: 12 }}
      >
        {joinNames(winners.map((w) => w.team.name))}
      </motion.h1>

      <motion.p
        className="winner-points"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.6 }}
      >
        <CountUp from={0} value={winners[0].total} delay={2} duration={1.4} /> poeng{shared ? ' hver' : ''}
      </motion.p>
    </motion.div>
  );
}
