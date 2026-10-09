import { motion } from 'motion/react';
import type { Theme, TeamAvatarProps } from '../types.ts';

const GLOW = '#ffd23f';

// Tre ansiktsvarianter slik at gresskarene ikke ser like ut.
const FACES = [
  // Klassisk: trekantøyne og tagget munn
  <g key="classic" fill={GLOW}>
    <path d="M30 48 L40 36 L48 48 Z" />
    <path d="M52 48 L60 36 L70 48 Z" />
    <path d="M28 62 L36 70 L42 64 L50 72 L58 64 L64 70 L72 62 L66 80 L34 80 Z" />
  </g>,
  // Glad: runde øyne og bredt smil
  <g key="happy" fill={GLOW}>
    <circle cx="38" cy="46" r="6" />
    <circle cx="62" cy="46" r="6" />
    <path d="M28 60 Q50 86 72 60 Q50 72 28 60 Z" />
  </g>,
  // Sint: skrå øyne og huggtenner
  <g key="angry" fill={GLOW}>
    <path d="M28 40 L46 46 L40 52 Z" />
    <path d="M72 40 L54 46 L60 52 Z" />
    <path d="M30 64 L70 64 L64 78 L58 70 L50 80 L42 70 L36 78 Z" />
  </g>,
];

function Pumpkin({ index }: TeamAvatarProps) {
  return (
    <motion.svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      style={{ originY: 1, overflow: 'visible' }}
      animate={{ rotate: [-3, 3, -3] }}
      transition={{ duration: 3 + (index % 3) * 0.4, repeat: Infinity, ease: 'easeInOut', delay: (index % 5) * 0.3 }}
    >
      <path d="M50 22 C48 14 50 8 56 4" stroke="#4d7c0f" strokeWidth="6" fill="none" strokeLinecap="round" />
      <ellipse cx="30" cy="58" rx="22" ry="32" fill="#c2410c" />
      <ellipse cx="70" cy="58" rx="22" ry="32" fill="#c2410c" />
      <ellipse cx="50" cy="58" rx="26" ry="34" fill="#ea580c" />
      <ellipse cx="40" cy="58" rx="14" ry="33" fill="#f97316" opacity="0.5" />
      <ellipse cx="60" cy="58" rx="14" ry="33" fill="#f97316" opacity="0.5" />
      <motion.g animate={{ opacity: [0.85, 1, 0.85] }} transition={{ duration: 1.6, repeat: Infinity, delay: index * 0.2 }}>
        {FACES[index % FACES.length]}
      </motion.g>
    </motion.svg>
  );
}

function Background() {
  return (
    <div className="theme-bg" aria-hidden>
      <div className="halloween-moon" />
    </div>
  );
}

export const halloweenTheme: Theme = {
  id: 'halloween',
  name: 'Halloween',
  TeamAvatar: Pumpkin,
  Background,
  vars: {
    '--bg': 'radial-gradient(ellipse at top, #3b1d5e 0%, #12061f 70%)',
    '--fg': '#fff7ed',
    '--muted': '#c4b5fd',
    '--accent': '#fb923c',
    '--panel': 'rgba(251, 146, 60, 0.08)',
    '--font': '"Creepster", "Chiller", system-ui, sans-serif',
  },
};
