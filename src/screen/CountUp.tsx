import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { useEffect } from 'react';

/** Viser et tall som teller animert fra forrige verdi til `value`. */
export function CountUp({ from, value, duration = 1.2, delay = 0 }: { from?: number; value: number; duration?: number; delay?: number }) {
  const motionValue = useMotionValue(from ?? value);
  const rounded = useTransform(motionValue, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionValue, value, { duration, delay, ease: 'easeOut' });
    return () => controls.stop();
  }, [motionValue, value, duration, delay]);

  return <motion.span>{rounded}</motion.span>;
}
