import { AnimatePresence, motion } from 'motion/react';
import type { ViewProps } from './ScreenRoot.tsx';

export function LobbyView({ state, theme }: ViewProps) {
  const { TeamAvatar } = theme;

  return (
    <div className="lobby">
      <motion.h1 className="screen-title" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        {state.show.name}
      </motion.h1>
      {state.teams.length === 0 && <p className="screen-subtitle">Venter på lag …</p>}
      <motion.ul className="team-grid" layout>
        <AnimatePresence>
          {state.teams.map((team, index) => (
            <motion.li
              key={team.id}
              layout
              className="team-card"
              initial={{ scale: 0, opacity: 0, y: 60, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            >
              <div className="team-avatar">
                <TeamAvatar team={team} index={index} />
              </div>
              <span className="team-name">{team.name}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
