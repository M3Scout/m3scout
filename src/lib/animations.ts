/**
 * Framer Motion Animation Variants and Utilities
 * Consistent animations for hover, active, and expanded states
 */

import { Variants, Transition } from "framer-motion";

// ============= TRANSITIONS =============

export const springTransition: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

export const smoothTransition: Transition = {
  type: "tween",
  ease: [0.25, 0.1, 0.25, 1],
  duration: 0.3,
};

export const quickTransition: Transition = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
};

// ============= PAGE TRANSITIONS =============

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
};

// ============= STAGGER CONTAINER =============

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ============= INTERACTIVE STATES =============

export const cardHover = {
  scale: 1.02,
  y: -4,
  transition: springTransition,
};

export const cardTap = {
  scale: 0.98,
  transition: quickTransition,
};

export const buttonHover = {
  scale: 1.02,
  transition: springTransition,
};

export const buttonTap = {
  scale: 0.96,
  transition: quickTransition,
};

export const pillHover = {
  scale: 1.05,
  transition: springTransition,
};

export const pillTap = {
  scale: 0.95,
  transition: quickTransition,
};

// ============= ACCORDION / EXPAND =============

export const accordionVariants: Variants = {
  collapsed: { 
    height: 0, 
    opacity: 0,
    transition: smoothTransition,
  },
  expanded: { 
    height: "auto", 
    opacity: 1,
    transition: {
      height: { ...smoothTransition, duration: 0.4 },
      opacity: { ...smoothTransition, delay: 0.1 },
    },
  },
};

export const expandIconVariants: Variants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 180 },
};

// ============= SLIDE ANIMATIONS =============

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
};

export const slideInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export const slideInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0 },
};

// ============= MOBILE OPTIMIZED =============

export const mobileCardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: quickTransition,
  },
  tap: {
    scale: 0.98,
    transition: quickTransition,
  },
};

export const mobileButtonTap = {
  scale: 0.95,
  transition: { duration: 0.1 },
};

// ============= GLOW / PULSE EFFECTS =============

export const glowPulse: Variants = {
  initial: { boxShadow: "0 0 0 0 rgba(229, 36, 33, 0)" },
  animate: {
    boxShadow: [
      "0 0 0 0 rgba(229, 36, 33, 0.4)",
      "0 0 0 20px rgba(229, 36, 33, 0)",
      "0 0 0 0 rgba(229, 36, 33, 0)",
    ],
    transition: {
      duration: 2,
      repeat: Infinity,
    },
  },
};

// ============= LIST ANIMATIONS =============

export const listItemVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      ...quickTransition,
    },
  }),
};

// ============= DASHBOARD CARD ANIMATIONS =============

export const dashboardCardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  }),
};

export const insightItemVariants: Variants = {
  hidden: { opacity: 0, x: -15, scale: 0.98 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: i * 0.06,
      duration: 0.35,
      ease: "easeOut" as const,
    },
  }),
};

export const kpiCardVariants: Variants = {
  hidden: { opacity: 0, y: 25, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      ease: [0.34, 1.56, 0.64, 1] as [number, number, number, number], // bounce effect
    },
  }),
};

export const playerRankItemVariants: Variants = {
  hidden: { opacity: 0, x: 20, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      delay: i * 0.05,
      duration: 0.3,
      ease: "easeOut" as const,
    },
  }),
};

// ============= TAB ANIMATIONS =============

export const tabContentVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ============= NOTIFICATION / BADGE =============

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: springTransition,
  },
};

// ============= SUBTLE HOVER EFFECTS =============

export const subtleHover = {
  scale: 1.01,
  transition: { duration: 0.15, ease: "easeOut" as const },
};

export const subtleTap = {
  scale: 0.99,
  transition: { duration: 0.1, ease: "easeOut" as const },
};
