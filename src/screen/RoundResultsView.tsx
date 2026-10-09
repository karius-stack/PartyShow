import { motion } from 'motion/react';
import { roundResults } from '../../shared/scoring.ts';
import { CountUp } from './CountUp.tsx';
import { listFontSize } from './listFontSize.ts';
import type { ViewProps } from './ScreenRoot.tsx';

const STEP_SECONDS = 0.8;

export function RoundResultsView({ state, theme }: ViewProps) {
  const game = state.games.find((g) => g.id === state.currentGameId);
  if (!game) return null;

  const results = roundResults(state.teams, state.scores, game.id);
  const teamIndex = new Map(state.teams.map((t, i) => [t.id, i]));
  const { TeamAvatar } = theme;

  return (
    <div className="results">
      <p className="screen-kicker">Resultater</p>
      <h1 className="screen-title">{game.title}</h1>
      <ol className="result-list" style={{ fontSize: listFontSize(results.length) }}>
        {results.map(({ team, points, rank }, i) => {
          // Avsløres nedenfra og opp – vinneren kommer sist.
          const delay = 0.8 + (results.length - 1 - i) * STEP_SECONDS;
          return (
            <motion.li
              key={team.id}
              className={`result-row${rank === 1 ? ' result-row-top' : ''}`}
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay, type: 'spring', stiffness: 220, damping: 20 }}
            >
              <span className="result-rank">{rank}.</span>
              <span className="result-avatar">
                <TeamAvatar team={team} index={teamIndex.get(team.id) ?? 0} size="small" />
              </span>
              <span className="result-name">{team.name}</span>
              <span className="result-points">
                <CountUp from={0} value={points} delay={delay} duration={0.6} />
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
