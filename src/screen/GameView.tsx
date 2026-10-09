import { motion } from 'motion/react';
import type { ViewProps } from './ScreenRoot.tsx';
import { Timer } from './Timer.tsx';

export function GameView({ state }: ViewProps) {
  const game = state.games.find((g) => g.id === state.currentGameId);
  if (!game) return null;

  const gameNumber = state.revealedGameIds.filter((id) => id !== game.id).length + 1;

  return (
    <div className="game">
      <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Spill {gameNumber} av {state.gameCount}
      </motion.p>
      <motion.h1
        className="screen-title"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.4 }}
      >
        {game.title}
      </motion.h1>
      {game.description && (
        <motion.p className="game-description" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
          {game.description}
        </motion.p>
      )}
      {game.mediaUrl && (
        <motion.div className="game-media" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          {game.mediaType === 'video' ? (
            <video src={game.mediaUrl} autoPlay loop muted playsInline />
          ) : (
            <img src={game.mediaUrl} alt="" />
          )}
        </motion.div>
      )}
      {state.timer && (
        <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1 }}>
          <Timer timer={state.timer} />
        </motion.div>
      )}
    </div>
  );
}
