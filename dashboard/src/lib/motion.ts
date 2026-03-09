import { Variants, Transition } from "framer-motion";

export const smoothTransition: Transition = {
  type: "spring",
  stiffness: 40,
  damping: 15,
  mass: 1,
};

export const slowDriftTransition: Transition = {
  type: "spring",
  stiffness: 20,
  damping: 30,
  mass: 1.5,
};

export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: smoothTransition
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};
