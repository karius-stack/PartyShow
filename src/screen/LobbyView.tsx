import { AnimatePresence, motion } from 'motion/react';
import type { ViewProps } from './ScreenRoot.tsx';

export function LobbyView({ state, theme }: ViewProps) {
  const { TeamAvatar, teamEntrance } = theme;

  return (
    <div className="lobby">
      <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        {state.teams.length === 0 ? 'Velkommen' : `${state.teams.length} lag påmeldt`}
      </motion.p>
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
              initial={teamEntrance.initial}
              animate={teamEntrance.animate}
              exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
              transition={teamEntrance.transition}
            >
              <div className="team-avatar">
                <TeamAvatar team={team} index={index} size="large" />
              </div>
              <span className="team-name">{team.name}</span>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}
