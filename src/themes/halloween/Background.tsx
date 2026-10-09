import { motion } from 'motion/react';
import type { CSSProperties } from 'react';

/** Enkel deterministisk tilfeldighetsgenerator, så bakgrunnen ser lik ut ved hver innlasting. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(31);
const STARS = Array.from({ length: 70 }, () => ({
  x: rand() * 100,
  y: rand() * 55,
  r: 0.6 + rand() * 1.4,
  delay: rand() * 6,
  duration: 2.5 + rand() * 4,
}));
const EMBERS = Array.from({ length: 18 }, () => ({
  x: 5 + rand() * 90,
  drift: (rand() - 0.5) * 12,
  delay: rand() * 14,
  duration: 9 + rand() * 8,
  size: 3 + rand() * 4,
}));

const BAT_PATH =
  'M30 13 C27 6 19 2 7 6 C11 8 12 12 11 16 C15 13 20 14 22 19 C24 16 27 16 30 20 ' +
  'C33 16 36 16 38 19 C40 14 45 13 49 16 C48 12 49 8 53 6 C41 2 33 6 30 13 Z';

function Bat({ top, duration, delay, scale, reverse }: { top: string; duration: number; delay: number; scale: number; reverse?: boolean }) {
  return (
    <motion.div
      className="hw-bat"
      style={{ top, scaleX: reverse ? -scale : scale, scaleY: scale }}
      initial={{ x: reverse ? '110vw' : '-10vw' }}
      animate={{ x: reverse ? '-10vw' : '110vw', y: [0, -40, 20, -30, 0] }}
      transition={{ duration, delay, repeat: Infinity, repeatDelay: duration * 0.8, ease: 'linear' }}
    >
      <motion.svg
        viewBox="0 0 60 26"
        animate={{ scaleY: [1, 0.35, 1] }}
        transition={{ duration: 0.32, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path d={BAT_PATH} />
      </motion.svg>
    </motion.div>
  );
}

const TOMBSTONES = [
  { x: 340, y: 168, w: 34, h: 46, tilt: -4 },
  { x: 420, y: 176, w: 26, h: 36, tilt: 3 },
  { x: 610, y: 182, w: 40, h: 52, tilt: -2 },
  { x: 1180, y: 168, w: 30, h: 42, tilt: 5 },
  { x: 1300, y: 160, w: 44, h: 58, tilt: -3 },
  { x: 1390, y: 170, w: 24, h: 32, tilt: 2 },
];
const CROSSES = [
  { x: 520, y: 150, h: 62, tilt: 6 },
  { x: 1250, y: 148, h: 54, tilt: -5 },
];

function Graveyard() {
  return (
    <svg className="hw-graveyard" viewBox="0 0 1920 300" preserveAspectRatio="xMidYMax slice">
      {/* Bakre ås med gravsteiner */}
      <path d="M0 215 Q260 150 620 196 T1240 172 T1920 205 V300 H0 Z" fill="#070d12" />
      <g fill="#070d12">
        {TOMBSTONES.map((t, i) => (
          <path
            key={i}
            transform={`rotate(${t.tilt} ${t.x + t.w / 2} ${t.y + t.h})`}
            d={`M${t.x} ${t.y + t.h} V${t.y + t.w / 2} A${t.w / 2} ${t.w / 2} 0 0 1 ${t.x + t.w} ${t.y + t.w / 2} V${t.y + t.h} Z`}
          />
        ))}
        {CROSSES.map((c, i) => (
          <g key={i} transform={`rotate(${c.tilt} ${c.x} ${c.y + c.h})`}>
            <rect x={c.x - 4} y={c.y} width="8" height={c.h} />
            <rect x={c.x - 18} y={c.y + 14} width="36" height="8" />
          </g>
        ))}
      </g>

      {/* Nakent tre */}
      <g stroke="#03070b" strokeLinecap="round" fill="none">
        <path d="M190 300 C200 230 186 170 214 96" strokeWidth="22" />
        <path d="M205 150 C170 130 140 132 104 104" strokeWidth="9" />
        <path d="M150 128 C140 108 142 92 128 72" strokeWidth="5" />
        <path d="M210 120 C240 96 276 96 300 70" strokeWidth="8" />
        <path d="M262 92 C272 74 268 58 282 44" strokeWidth="4" />
        <path d="M214 98 C220 70 210 52 222 26" strokeWidth="6" />
        <path d="M118 112 C104 112 92 120 78 116" strokeWidth="4" />
        <path d="M290 78 C310 78 322 66 340 68" strokeWidth="3" />
      </g>

      {/* Smijernsgjerde */}
      <g fill="#03070b">
        <rect x="1500" y="196" width="420" height="5" />
        <rect x="1500" y="232" width="420" height="5" />
        {Array.from({ length: 22 }, (_, i) => (
          <path key={i} d={`M${1506 + i * 19} 300 V188 l-5 0 l5 -12 l5 12 l-5 0`} stroke="#03070b" strokeWidth="4" />
        ))}
      </g>

      {/* Forgrunn */}
      <path d="M0 252 Q420 214 940 242 T1920 232 V300 H0 Z" fill="#03060a" />
    </svg>
  );
}

export function Background() {
  return (
    <div className="theme-bg hw-bg" aria-hidden>
      <div className="hw-sky" />
      <svg className="hw-stars" viewBox="0 0 100 100" preserveAspectRatio="none">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x}
            cy={s.y}
            r={s.r / 10}
            style={{ animationDelay: `${s.delay}s`, animationDuration: `${s.duration}s` }}
          />
        ))}
      </svg>
      <div className="hw-moon">
        <div className="hw-cloud hw-cloud-1" />
        <div className="hw-cloud hw-cloud-2" />
      </div>
      <Bat top="18vh" duration={16} delay={2} scale={1} />
      <Bat top="28vh" duration={21} delay={9} scale={0.7} reverse />
      <Bat top="12vh" duration={18} delay={15} scale={0.55} />
      <Graveyard />
      <div className="hw-fog hw-fog-back" />
      <div className="hw-fog hw-fog-front" />
      {EMBERS.map((e, i) => (
        <span
          key={i}
          className="hw-ember"
          style={
            {
              left: `${e.x}%`,
              width: e.size,
              height: e.size,
              animationDelay: `${e.delay}s`,
              animationDuration: `${e.duration}s`,
              '--drift': `${e.drift}vw`,
            } as CSSProperties
          }
        />
      ))}
      <div className="hw-grain" />
      <div className="hw-vignette" />
    </div>
  );
}
