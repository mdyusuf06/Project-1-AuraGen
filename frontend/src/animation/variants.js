/**
 * AuraGen Reusable Framer Motion Variants
 *
 * Provides standardized, design-system compliant animations for:
 * - Fade in / Fade out
 * - Scale down
 * - Slide in (Up, Down, Left, Right)
 * - Spring transitions
 * - Dynamic Form to Wizard Morphing & overlay transitions
 */

/**
 * Standard spring transition matching modern fluid interface conventions.
 */
export const springTransition = {
  type: "spring",
  stiffness: 320,
  damping: 26,
  mass: 0.85
};

/**
 * Gentle ease-out transition for smooth UI morphing.
 */
export const smoothTransition = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1]
};

/**
 * Reusable Fade In variant
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

/**
 * Reusable Fade Out variant
 */
export const fadeOut = {
  initial: { opacity: 1 },
  animate: {
    opacity: 0,
    transition: { duration: 0.25, ease: "easeIn" }
  }
};

/**
 * Reusable Scale Down variant (for shrinking original forms or modal backdrops)
 */
export const scaleDown = {
  initial: { opacity: 1, scale: 1 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: smoothTransition
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    transition: { duration: 0.35, ease: [0.32, 0, 0.67, 0] } // 350ms duration (within 300-400ms range)
  }
};

/**
 * Directional Slide In variants
 */
export const slideInUp = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export const slideInDown = {
  initial: { opacity: 0, y: -24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export const slideInLeft = {
  initial: { opacity: 0, x: -32 },
  animate: {
    opacity: 1,
    x: 0,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    x: 24,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

export const slideInRight = {
  initial: { opacity: 0, x: 32 },
  animate: {
    opacity: 1,
    x: 0,
    transition: springTransition
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: 0.2, ease: "easeIn" }
  }
};

/**
 * Default slideIn variant (slides in upward from bottom)
 */
export const slideIn = slideInUp;

/**
 * Form Morph variant (combines scale, subtle slide and opacity for seamless form substitution)
 */
export const formMorphVariant = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 12
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      opacity: { duration: 0.32 },
      scale: springTransition,
      y: springTransition
    }
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -12,
    transition: {
      duration: 0.35, // 350ms: perfectly within the 300-400ms requirement
      ease: [0.32, 0, 0.67, 0]
    }
  }
};

/**
 * Original Complex Form Exit Variant:
 * Fades out and scales down with a calibrated 350ms duration (approx 300-400ms).
 */
export const originalFormMorphVariant = {
  initial: {
    opacity: 1,
    scale: 1,
    y: 0
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] }
  },
  exit: {
    opacity: 0,
    scale: 0.94,
    y: -8,
    transition: {
      duration: 0.35, // 350ms: perfectly within the 300-400ms requirement
      ease: [0.32, 0, 0.67, 0]
    }
  }
};

/**
 * Generated Conversational Wizard Enter Variant:
 * Fades in and slides into view using a fluid spring transition.
 */
export const wizardMorphVariant = {
  initial: {
    opacity: 0,
    scale: 0.96,
    y: 24
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      opacity: { duration: 0.3, ease: "easeOut" },
      scale: springTransition,
      y: springTransition
    }
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 20,
    transition: { duration: 0.25, ease: "easeIn" }
  }
};

/**
 * "Simplifying this for you..." short modal overlay variant
 */
export const simplifyingOverlayVariant = {
  initial: {
    opacity: 0,
    scale: 0.92
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.28, ease: "easeOut" }
  },
  exit: {
    opacity: 0,
    scale: 1.04,
    transition: { duration: 0.22, ease: "easeIn" }
  }
};

export const overlayVariant = simplifyingOverlayVariant;

/**
 * Staggered container variant for multi-field lists and cards
 */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 16 },
  animate: {
    opacity: 1,
    y: 0,
    transition: springTransition
  }
};
