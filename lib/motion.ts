export const MOTION = {
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.6,
    countUp: 0.8,
    gaugeFill: 0.9,
  },
  ease: {
    out: [0.16, 1, 0.3, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
    spring: { stiffness: 50, damping: 20 },
  },
  stagger: {
    fast: 0.03,
    normal: 0.05,
    slow: 0.08,
  },
} as const;

export const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: MOTION.duration.normal, ease: MOTION.ease.out },
} as const;

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: MOTION.stagger.normal,
    },
  },
} as const;

export const cardHover = {
  whileHover: {
    y: -1,
    transition: { duration: MOTION.duration.fast, ease: "easeOut" },
  },
} as const;
