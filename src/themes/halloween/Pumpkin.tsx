import { motion } from 'motion/react';
import { useId } from 'react';
import type { TeamAvatarProps } from '../types.ts';

// Utskårne ansikter (koordinater i 120×130-boksen).
const FACES = [
  // Klassisk: trekantøyne, nese og tagget glis
  'M38 70 L48 55 L56 70 Z M64 70 L72 55 L82 70 Z M56 79 L60 72 L64 79 Z ' +
    'M33 85 L41 92 L47 86 L54 94 L60 87 L66 94 L73 86 L79 92 L87 85 Q60 116 33 85 Z',
  // Glad: halvmåneøyne og bredt smil
  'M36 72 Q46 54 56 72 Q46 65 36 72 Z M64 72 Q74 54 84 72 Q74 65 64 72 Z ' +
    'M32 84 Q60 112 88 84 Q74 92 66 90 L64 96 L56 96 L54 90 Q46 92 32 84 Z',
  // Sint: skrå øyne og huggtenner
  'M34 60 L57 70 L44 77 Z M86 60 L63 70 L76 77 Z ' +
    'M34 88 L86 88 L81 100 L73 93 L66 104 L60 95 L54 104 L47 93 L39 100 Z',
  // Forskrekket: runde øyne og åpen munn
  'M37 68 A9 10 0 1 0 55 68 A9 10 0 1 0 37 68 Z M65 68 A9 10 0 1 0 83 68 A9 10 0 1 0 65 68 Z ' +
    'M50 96 A10 13 0 1 0 70 96 A10 13 0 1 0 50 96 Z',
];

// Litt ulik farge og form så gresskarene får personlighet.
const PALETTES = [
  { light: '#ffa94d', mid: '#f0700f', dark: '#9a3412' },
  { light: '#ff8f5a', mid: '#d9480f', dark: '#7c2410' },
  { light: '#ffc35c', mid: '#f08c00', dark: '#a14a07' },
];
const SHAPES = [1, 1.08, 0.94, 1.03];

function SmokePuff() {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.circle
          key={i}
          cx={30 + i * 15}
          cy={118}
          r={10}
          fill="#b8c7cf"
          initial={{ opacity: 0.55, scale: 0.4 }}
          animate={{ opacity: 0, scale: 2.4, y: -14 - (i % 2) * 8 }}
          transition={{ duration: 1.4, delay: 0.25, ease: 'easeOut' }}
          style={{ originX: '50%', originY: '50%' }}
        />
      ))}
    </g>
  );
}

export function Pumpkin({ index, size = 'large' }: TeamAvatarProps) {
  const id = useId().replace(/:/g, '');
  const palette = PALETTES[index % PALETTES.length];
  const squash = SHAPES[index % SHAPES.length];
  const face = FACES[index % FACES.length];
  const large = size === 'large';
  const flickerDuration = 2.2 + (index % 4) * 0.35;

  return (
    <motion.svg
      viewBox="0 0 120 130"
      width="100%"
      height="100%"
      style={{ overflow: 'visible', originY: 0.95 }}
      animate={large ? { rotate: [-2.5, 2.5, -2.5] } : undefined}
      transition={large ? { duration: 3.4 + (index % 3) * 0.5, repeat: Infinity, ease: 'easeInOut', delay: (index % 5) * 0.4 } : undefined}
    >
      <defs>
        <radialGradient id={`halo-${id}`}>
          <stop offset="0%" stopColor="#ff9d2e" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#ff6a00" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`lobe-${id}`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor={palette.light} />
          <stop offset="55%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>
        <radialGradient id={`lobe-back-${id}`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.dark} />
        </radialGradient>
        <linearGradient id={`stem-${id}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#5b7a2a" />
          <stop offset="100%" stopColor="#2c3d12" />
        </linearGradient>
        <radialGradient id={`flame-${id}`} cx="50%" cy="60%" r="60%">
          <stop offset="0%" stopColor="#fff8d6" />
          <stop offset="45%" stopColor="#ffd043" />
          <stop offset="100%" stopColor="#ff7a00" />
        </radialGradient>
        <filter id={`glow-${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Lysskjær rundt gresskaret */}
      <motion.circle
        cx="60"
        cy="80"
        r="62"
        fill={`url(#halo-${id})`}
        animate={{ opacity: [0.7, 1, 0.8, 0.95, 0.7] }}
        transition={{ duration: flickerDuration, repeat: Infinity, ease: 'easeInOut' }}
      />
      <ellipse cx="60" cy="122" rx="42" ry="6" fill="#000" opacity="0.55" />
      {large && <SmokePuff />}

      {/* Stilk og slyngtråd */}
      <path d="M55 44 C54 32 58 22 68 15 L73 20 C65 26 63 34 64 44 Z" fill={`url(#stem-${id})`} />
      <path d="M64 30 C74 26 80 32 76 38 C73 42 68 38 71 35" stroke="#4d6b1f" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* Fruktkjøtt – bakre bater først */}
      <g transform={`translate(60 80) scale(${squash} 1) translate(-60 -80)`}>
        <ellipse cx="31" cy="80" rx="27" ry="37" fill={`url(#lobe-back-${id})`} />
        <ellipse cx="89" cy="80" rx="27" ry="37" fill={`url(#lobe-back-${id})`} />
        <ellipse cx="45" cy="80" rx="26" ry="41" fill={`url(#lobe-${id})`} />
        <ellipse cx="75" cy="80" rx="26" ry="41" fill={`url(#lobe-${id})`} />
        <ellipse cx="60" cy="80" rx="23" ry="42" fill={`url(#lobe-${id})`} />
        <path d="M60 40 C52 60 52 100 60 122" stroke={palette.dark} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
        <path d="M60 40 C68 60 68 100 60 122" stroke={palette.dark} strokeOpacity="0.35" strokeWidth="1.5" fill="none" />
        <ellipse cx="44" cy="58" rx="6" ry="12" fill="#fff" opacity="0.14" transform="rotate(-18 44 58)" />
      </g>

      {/* Utskjæring: mørk kant gir dybde, lyset flimrer innenfor */}
      <path d={face} fill="#3b0f02" transform="translate(1.4 2)" />
      <motion.path
        d={face}
        fill={`url(#flame-${id})`}
        filter={`url(#glow-${id})`}
        animate={{ opacity: [0.82, 1, 0.88, 1, 0.78, 0.95, 0.82] }}
        transition={{ duration: flickerDuration, repeat: Infinity, ease: 'linear' }}
      />
    </motion.svg>
  );
}
