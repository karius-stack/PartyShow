import '@fontsource/grenze-gotisch/700.css';
import '@fontsource/grenze/400.css';
import '@fontsource/grenze/600.css';
import '@fontsource/grenze/800.css';
import './halloween.css';
import type { Theme } from '../types.ts';
import { Background } from './Background.tsx';
import { Celebration } from './Celebration.tsx';
import { Pumpkin } from './Pumpkin.tsx';

export const halloweenTheme: Theme = {
  id: 'halloween',
  name: 'Halloween',
  TeamAvatar: Pumpkin,
  Background,
  WinnerCelebration: Celebration,
  // Gresskaret faller ned fra himmelen og spretter på bakken.
  teamEntrance: {
    initial: { y: '-70vh', opacity: 0, rotate: -30, scale: 0.6 },
    animate: { y: 0, opacity: 1, rotate: 0, scale: 1 },
    transition: { type: 'spring', stiffness: 160, damping: 11, mass: 1.1 },
  },
  vars: {
    '--bg': '#05080c',
    '--fg': '#efe6d2',
    '--muted': '#93a8b6',
    '--accent': '#ff8a1f',
    '--panel': 'rgba(10, 17, 24, 0.72)',
    '--font-display': '"Grenze Gotisch", "Times New Roman", serif',
    '--font-body': '"Grenze", Georgia, serif',
  },
};
