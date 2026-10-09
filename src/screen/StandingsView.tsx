import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { standings } from '../../shared/scoring.ts';
import { CountUp } from './CountUp.tsx';
import { listFontSize } from './listFontSize.ts';
import type { ViewProps } from './ScreenRoot.tsx';
import { winnerLayoutId, WinnerSpotlight } from './WinnerSpotlight.tsx';

/** Hvor lenge forrige stilling vises før lagene flytter seg til ny plassering. */
const HOLD_MS = 2000;
/** Etter siste spill: hvor lenge ny stilling vises før vi zoomer inn på vinneren. */
const WINNER_DELAY_MS = 4500;

/** previous → revealed (lagene flytter seg) → winner (kun etter siste spill). */
type Stage = 'previous' | 'revealed' | 'winner';

export function StandingsView({ state, theme }: ViewProps) {
  const isFinal = state.revealedGameIds.length >= state.gameCount;
  const [stage, setStage] = useState<Stage>('previous');

  useEffect(() => {
    const timers = [setTimeout(() => setStage('revealed'), HOLD_MS)];
    if (isFinal) timers.push(setTimeout(() => setStage('winner'), HOLD_MS + WINNER_DELAY_MS));
    return () => timers.forEach(clearTimeout);
  }, [isFinal]);

  const revealed = stage !== 'previous';
  const rows = standings(state.teams, state.scores, state.revealedGameIds);
  const ordered = revealed
    ? rows
    : [...rows].sort((a, b) => a.prevRank - b.prevRank || a.team.sortOrder - b.team.sortOrder);
  const winners = rows.filter((r) => r.rank === 1);
  const teamIndex = new Map(state.teams.map((t, i) => [t.id, i]));
  const { TeamAvatar } = theme;

  return (
    <div className="standings">
      {/* Tavla «zoomes forbi» mot toppen mens vinneren løftes ut. */}
      <motion.div
        className="standings-board"
        style={{ transformOrigin: '50% 34%' }}
        animate={stage === 'winner' ? { scale: 1.35, opacity: 0, filter: 'blur(12px)' } : { scale: 1, opacity: 1, filter: 'blur(0px)' }}
        transition={{ duration: 1.3, ease: [0.5, 0, 0.2, 1] }}
      >
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
                  {/* Vinnerens avatar flyttes til spotlighten via felles layoutId. */}
                  {!(winner && stage === 'winner') && (
                    <motion.div className="avatar-fill" layoutId={winner ? winnerLayoutId(row.team.id) : undefined}>
                      <TeamAvatar team={row.team} index={teamIndex.get(row.team.id) ?? 0} size="small" />
                    </motion.div>
                  )}
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
      </motion.div>

      <AnimatePresence>
        {stage === 'winner' && winners.length > 0 && <WinnerSpotlight winners={winners} theme={theme} teamIndex={teamIndex} />}
      </AnimatePresence>
    </div>
  );
}
