import { motion } from 'motion/react';

/** Stor fremdriftsring med «X av Y» i midten. */
export function ProgressRing({ value, total, label }: { value: number; total: number; label: string }) {
  const fraction = total === 0 ? 0 : value / total;
  const radius = 44;

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 100 100" aria-hidden>
        <circle className="progress-ring-track" cx="50" cy="50" r={radius} />
        <motion.circle
          className="progress-ring-fill"
          cx="50"
          cy="50"
          r={radius}
          pathLength={1}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: fraction }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </svg>
      <div className="progress-ring-text">
        <motion.span key={value} className="progress-ring-value" initial={{ scale: 1.4, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}>
          {value}
        </motion.span>
        <span className="progress-ring-total">av {total}</span>
        <span className="progress-ring-label">{label}</span>
      </div>
    </div>
  );
}
