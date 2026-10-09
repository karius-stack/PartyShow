import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { standings } from '../../shared/scoring.ts';
import { CountUp } from './CountUp.tsx';
import { listFontSize } from './listFontSize.ts';
import type { ViewProps } from './ScreenRoot.tsx';

/** Hvor lenge forrige stilling vises før lagene flytter seg til ny plassering. */
const HOLD_MS = 2000;

export function StandingsView({ state, theme }: ViewProps) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setRevealed(true), HOLD_MS);
    return () => clearTimeout(id);
  }, []);

  const rows = standings(state.teams, state.scores, state.revealedGameIds);
  const ordered = revealed
    ? rows
    : [...rows].sort((a, b) => a.prevRank - b.prevRank || a.team.sortOrder - b.team.sortOrder);
  const teamIndex = new Map(state.teams.map((t, i) => [t.id, i]));
  const isFinal = state.revealedGameIds.length >= state.gameCount;
  const { TeamAvatar } = theme;

  return (
    <div className="standings">
      <p className="screen-kicker">
        {isFinal ? 'Endelig resultat' : `Etter ${state.revealedGameIds.length} av ${state.gameCount} spill`}
      </p>
      <h1 className="screen-title">Sammenlagt</h1>
      <ol className="result-list" style={{ fontSize: listFontSize(rows.length) }}>
        {ordered.map((row) => {
          const winner = isFinal && revealed && row.rank === 1;
          return (
            <motion.li
              key={row.team.id}
              layout
              className={`result-row${winner ? ' result-row-top result-row-winner' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, scale: winner ? 1.06 : 1 }}
              transition={{ layout: { type: 'spring', stiffness: 120, damping: 18 } }}
            >
              <span className="result-rank">{revealed ? row.rank : row.prevRank}.</span>
              <span className="result-avatar">
                <TeamAvatar team={row.team} index={teamIndex.get(row.team.id) ?? 0} size="small" />
              </span>
              <span className="result-name">{row.team.name}</span>
              <span className="result-change">
                <AnimatePresence>
                  {revealed && row.rankChange !== 0 && (
                    <motion.span
                      className={row.rankChange > 0 ? 'change-up' : 'change-down'}
                      initial={{ opacity: 0, y: row.rankChange > 0 ? 12 : -12 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {row.rankChange > 0 ? '▲' : '▼'} {Math.abs(row.rankChange)}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
              <span className="result-round">
                {revealed && row.roundPoints !== 0 && (
                  <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}>
                    {row.roundPoints > 0 ? '+' : ''}
                    {row.roundPoints}
                  </motion.span>
                )}
              </span>
              <span className="result-points">
                <CountUp value={revealed ? row.total : row.prevTotal} from={row.prevTotal} />
              </span>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}
