import { AnimatePresence, motion } from 'motion/react';
import { useJoinUrl } from '../../lib/joinUrl.ts';
import type { AwardsViewProps } from '../ScreenRoot.tsx';
import { PortraitCard, useFittedPortraits } from './PortraitCard.tsx';
import { QrCode } from './QrCode.tsx';

export function RegistrationView({ state, show, theme }: AwardsViewProps) {
  const joinUrl = useJoinUrl();
  const { participants } = state;
  const gridRef = useFittedPortraits<HTMLUListElement>(participants.length, 260);

  return (
    <div className="awards-registration">
      <motion.aside
        className="join-card"
        initial={{ x: -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 120, damping: 18 }}
      >
        <p className="join-heading">Skann og bli med!</p>
        {joinUrl && <QrCode value={joinUrl} />}
        <p className="join-url">{joinUrl?.replace(/^https?:\/\//, '')}</p>
      </motion.aside>

      <div className="awards-registration-main">
        <motion.p className="screen-kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          {show.name}
        </motion.p>
        <motion.h1 className="screen-title" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          Kåringen
        </motion.h1>
        <p className="screen-subtitle">
          {participants.length === 0
            ? 'Venter på registrering av deltakere …'
            : `${participants.length} ${participants.length === 1 ? 'deltaker' : 'deltakere'} registrert`}
        </p>
        <motion.ul ref={gridRef} className="portrait-grid" layout>
          <AnimatePresence>
            {participants.map((participant) => (
              <motion.li
                key={participant.id}
                layout
                initial={theme.teamEntrance.initial}
                animate={theme.teamEntrance.animate}
                exit={{ scale: 0, opacity: 0, transition: { duration: 0.3 } }}
                transition={theme.teamEntrance.transition}
              >
                <PortraitCard participant={participant} />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>
    </div>
  );
}
