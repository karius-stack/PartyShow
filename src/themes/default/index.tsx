import { motion } from 'motion/react';
import type { Theme, TeamAvatarProps } from '../types.ts';

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function TeamAvatar({ team, index }: TeamAvatarProps) {
  return (
    <motion.svg viewBox="0 0 100 100" width="100%" height="100%" whileHover={{ scale: 1.05 }}>
      <circle cx="50" cy="50" r="46" fill={COLORS[index % COLORS.length]} />
      <text x="50" y="50" dy="0.35em" textAnchor="middle" fontSize="44" fontWeight="700" fill="#fff">
        {team.name.charAt(0).toUpperCase()}
      </text>
    </motion.svg>
  );
}

export const defaultTheme: Theme = {
  id: 'default',
  name: 'Standard',
  TeamAvatar,
  vars: {
    '--bg': '#0f172a',
    '--fg': '#f8fafc',
    '--muted': '#94a3b8',
    '--accent': '#38bdf8',
    '--panel': 'rgba(255, 255, 255, 0.06)',
    '--font': 'system-ui, sans-serif',
  },
};
