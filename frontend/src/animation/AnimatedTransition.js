"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  fadeIn,
  fadeOut,
  scaleDown,
  slideIn,
  slideInUp,
  slideInDown,
  slideInLeft,
  slideInRight,
  formMorphVariant,
  overlayVariant
} from "./variants.js";

export { AnimatePresence, motion };

/**
 * AnimatedTransition manages component mount/unmount and replacement transitions using AnimatePresence.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string|number} [props.transitionKey] Key to trigger transition on change
 * @param {Object} [props.variant=formMorphVariant] Framer Motion animation variant
 * @param {"wait"|"sync"|"popLayout"} [props.mode="wait"] AnimatePresence transition mode
 * @param {string} [props.className=""] Optional CSS class names
 * @param {boolean} [props.initial=true] Whether to run initial animation on first render
 */
export function AnimatedTransition({
  children,
  transitionKey,
  variant = formMorphVariant,
  mode = "wait",
  className = "",
  initial = true,
  ...rest
}) {
  return React.createElement(
    AnimatePresence,
    { mode },
    React.createElement(
      motion.div,
      {
        key: transitionKey,
        variants: variant,
        initial: initial ? "initial" : false,
        animate: "animate",
        exit: "exit",
        className,
        ...rest
      },
      children
    )
  );
}

/**
 * Dedicated Fade Transition wrapper
 */
export function FadeTransition({
  children,
  transitionKey,
  mode = "wait",
  className = "",
  ...rest
}) {
  return React.createElement(
    AnimatedTransition,
    {
      transitionKey,
      variant: fadeIn,
      mode,
      className,
      ...rest
    },
    children
  );
}

/**
 * Dedicated Slide In Transition wrapper
 */
export function SlideTransition({
  children,
  transitionKey,
  direction = "up",
  mode = "wait",
  className = "",
  ...rest
}) {
  let chosenVariant = slideInUp;
  if (direction === "down") chosenVariant = slideInDown;
  if (direction === "left") chosenVariant = slideInLeft;
  if (direction === "right") chosenVariant = slideInRight;

  return React.createElement(
    AnimatedTransition,
    {
      transitionKey,
      variant: chosenVariant,
      mode,
      className,
      ...rest
    },
    children
  );
}

/**
 * Dedicated Scale Transition wrapper
 */
export function ScaleTransition({
  children,
  transitionKey,
  mode = "wait",
  className = "",
  ...rest
}) {
  return React.createElement(
    AnimatedTransition,
    {
      transitionKey,
      variant: scaleDown,
      mode,
      className,
      ...rest
    },
    children
  );
}

/**
 * Form Morphing Transition wrapper (for smooth swapping between complex and simplified forms)
 */
export function MorphTransition({
  children,
  transitionKey,
  mode = "wait",
  className = "",
  ...rest
}) {
  return React.createElement(
    AnimatedTransition,
    {
      transitionKey,
      variant: formMorphVariant,
      mode,
      className,
      ...rest
    },
    children
  );
}

export default AnimatedTransition;
