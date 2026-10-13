import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { Participant } from '../../../shared/types.ts';
import { joinNames } from '../../lib/format.ts';
import type { AwardsViewProps } from '../ScreenRoot.tsx';
import { PortraitCard } from './PortraitCard.tsx';

/** Hvor lenge alle står i halvmørket før vinneren lyses opp. */
const SUSPENSE_MS = 1800;

/** voting → suspense (alle dempes) → winner (vinneren trer fram, de andre blir mørkere). */
type Stage = 'voting' | 'suspense' | 'winner';

function useRevealStage(revealed: boolean): Stage {
  // Ved innlasting midt i en avsløring hopper vi rett til vinneren.
  const [stage, setStage] = useState<Stage>(revealed ? 'winner' : 'voting');
  const wasRevealed = useRef(revealed);

  useEffect(() => {
    if (revealed === wasRevealed.current) return;
    wasRevealed.current = revealed;
    if (!revealed) {
      setStage('voting');
      return;
    }
    setStage('suspense');
    const id = setTimeout(() => setStage('winner'), SUSPENSE_MS);
    return () => clearTimeout(id);
  }, [revealed]);

  return stage;
}

/** Vinnerne plasseres i midten, de andre fordeles på hver side. */
function centerWinners(finalists: Participant[], winnerIds: Set<number>): Participant[] {
  const others = finalists.filter((p) => !winnerIds.has(p.id));
  const winners = finalists.filter((p) => winnerIds.has(p.id));
  const half = Math.ceil(others.length / 2);
  return [...others.slice(0, half), ...winners, ...others.slice(half)];
}

function CeremonyIntro({ state }: AwardsViewProps) {
  return (
    <div className="ceremony-intro">
      <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Nominasjonene er klare
      </motion.p>
      <motion.h1
        className="screen-title"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.4 }}
      >
        Kåringen starter
      </motion.h1>
      <ol className="ceremony-agenda">
        {state.categories.map((c, i) => (
          <motion.li key={c.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1 + i * 0.15 }}>
            {c.title}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

export function CeremonyView(props: AwardsViewProps) {
  const { state, theme } = props;
  const category = state.categories.find((c) => c.id === state.currentCategoryId);
  const stage = useRevealStage(state.step === 'revealed');

  if (!category) return <CeremonyIntro {...props} />;

  const finalists = (category.finalistIds ?? [])
    .map((id) => state.participants.find((p) => p.id === id))
    .filter((p): p is Participant => p !== undefined);
  const winnerIds = new Set(stage === 'winner' ? (category.winnerIds ?? []) : []);
  const winners = finalists.filter((p) => winnerIds.has(p.id));
  const ordered = stage === 'winner' ? centerWinners(finalists, winnerIds) : finalists;
  const number = state.categories.findIndex((c) => c.id === category.id) + 1;
  const voted = state.finalVoterIds.length;
  const voters = state.participants.length;

  return (
    <div className={`ceremony ceremony-${stage}`}>
      {stage === 'winner' && theme.WinnerCelebration && <theme.WinnerCelebration />}

      <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Nominasjon {number} av {state.categories.length}
      </motion.p>
      <motion.h1
        className="screen-title ceremony-title"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14, delay: 0.4 }}
      >
        {category.title}
      </motion.h1>

      <motion.ul className="finalists" layout>
        {ordered.map((participant, i) => {
          const isWinner = winnerIds.has(participant.id);
          const dimmed = stage === 'suspense' || (stage === 'winner' && !isWinner);
          return (
            <motion.li
              key={participant.id}
              layout
              className={`finalist${isWinner ? ' finalist-winner' : ''}`}
              initial={{ y: 80, opacity: 0, scale: 0.8 }}
              animate={{
                y: 0,
                opacity: 1,
                scale: isWinner ? 1.2 : stage === 'winner' ? 0.82 : 1,
                filter: dimmed
                  ? `brightness(${stage === 'winner' ? 0.3 : 0.55}) blur(${stage === 'winner' ? 2 : 0}px)`
                  : 'brightness(1) blur(0px)',
              }}
              transition={{
                layout: { type: 'spring', stiffness: 70, damping: 16, mass: 1.2 },
                default: { delay: stage === 'voting' ? 0.8 + i * 0.35 : 0, type: 'spring', stiffness: 90, damping: 15 },
                filter: { duration: stage === 'suspense' ? 1.2 : 0.9 },
              }}
            >
              <PortraitCard participant={participant} />
            </motion.li>
          );
        })}
      </motion.ul>

      <AnimatePresence mode="wait">
        {stage === 'voting' && (
          <motion.div
            key="voting"
            className="vote-progress"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.6 }}
          >
            <span className="vote-progress-text">
              Stem på mobilen! <strong>{voted}</strong> av {voters} har stemt
            </span>
            <div className="vote-progress-bar">
              <motion.div className="vote-progress-fill" animate={{ width: `${voters ? (voted / voters) * 100 : 0}%` }} />
            </div>
          </motion.div>
        )}
        {stage === 'suspense' && (
          <motion.p key="suspense" className="screen-subtitle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            Og vinneren er …
          </motion.p>
        )}
        {stage === 'winner' && (
          <motion.h2
            key="winner"
            className="screen-title winner-name ceremony-winner-name"
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, type: 'spring', stiffness: 140, damping: 12 }}
          >
            {joinNames(winners.map((w) => w.name))}
          </motion.h2>
        )}
      </AnimatePresence>
    </div>
  );
}
