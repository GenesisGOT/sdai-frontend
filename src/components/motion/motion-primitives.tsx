"use client"

/**
 * motion-primitives.tsx
 *
 * A small set of reusable, declarative animation wrappers built on the
 * `motion` package (the modern successor to framer-motion). These are the
 * building blocks used across the landing page and dashboard for consistent
 * entrance animations, staggered lists, and hover/tap affordances.
 *
 * All components:
 *  - respect the user's `prefers-reduced-motion` setting (animations collapse
 *    to a simple opacity change, or no movement at all)
 *  - accept a `className` so callers can style with Tailwind
 *  - forward arbitrary motion props for one-off overrides
 *
 * Usage:
 *   <FadeIn>...</FadeIn>
 *   <FadeIn direction="up" delay={0.1}>...</FadeIn>
 *   <Stagger><FadeIn asItem>a</FadeIn><FadeIn asItem>b</FadeIn></Stagger>
 *   <Reveal>scroll-triggered content</Reveal>
 */

import * as React from "react"
import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants,
  type Transition,
} from "motion/react"

import { cn } from "@/lib/utils"

type Direction = "up" | "down" | "left" | "right" | "none"

const DEFAULT_DISTANCE = 16

const DEFAULT_TRANSITION: Transition = {
  duration: 0.5,
  ease: [0.16, 1, 0.3, 1], // easeOutExpo-ish; snappy but settled
}

function offsetFor(direction: Direction, distance: number) {
  switch (direction) {
    case "up":
      return { x: 0, y: distance }
    case "down":
      return { x: 0, y: -distance }
    case "left":
      return { x: distance, y: 0 }
    case "right":
      return { x: -distance, y: 0 }
    case "none":
    default:
      return { x: 0, y: 0 }
  }
}

/* -------------------------------------------------------------------------- */
/*  FadeIn                                                                     */
/* -------------------------------------------------------------------------- */

export interface FadeInProps extends HTMLMotionProps<"div"> {
  /** Direction the element travels in from. Defaults to "up". */
  direction?: Direction
  /** Travel distance in px. Defaults to 16. */
  distance?: number
  /** Delay before the animation starts, in seconds. */
  delay?: number
  /** Override the default duration, in seconds. */
  duration?: number
  /** Render as a child of <Stagger> (uses parent's orchestration). */
  asItem?: boolean
}

/**
 * Fades + slides content into view on mount. When wrapped in <Stagger>, pass
 * `asItem` so the parent controls timing.
 */
export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  function FadeIn(
    {
      direction = "up",
      distance = DEFAULT_DISTANCE,
      delay = 0,
      duration,
      asItem = false,
      className,
      children,
      transition,
      ...props
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion()
    const offset = reduceMotion ? { x: 0, y: 0 } : offsetFor(direction, distance)

    const mergedTransition: Transition = {
      ...DEFAULT_TRANSITION,
      ...(duration != null ? { duration } : null),
      delay,
      ...transition,
    }

    if (asItem) {
      // Timing is orchestrated by the parent <Stagger>; we only declare the
      // hidden/visible shapes via variants.
      const variants: Variants = {
        hidden: { opacity: 0, ...offset },
        visible: { opacity: 1, x: 0, y: 0, transition: mergedTransition },
      }
      return (
        <motion.div
          ref={ref}
          variants={variants}
          className={cn(className)}
          {...props}
        >
          {children}
        </motion.div>
      )
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...offset }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={mergedTransition}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

/* -------------------------------------------------------------------------- */
/*  Stagger                                                                    */
/* -------------------------------------------------------------------------- */

export interface StaggerProps extends HTMLMotionProps<"div"> {
  /** Seconds between each child's animation. Defaults to 0.08. */
  stagger?: number
  /** Delay before the first child animates. Defaults to 0. */
  delayChildren?: number
  /** Animate on mount (true) or when scrolled into view (false). */
  onMount?: boolean
  /** viewport "once" behavior when onMount is false. Defaults to true. */
  once?: boolean
}

/**
 * Orchestrates a sequence of child animations. Children should be
 * <FadeIn asItem> (or any motion element exposing hidden/visible variants).
 */
export const Stagger = React.forwardRef<HTMLDivElement, StaggerProps>(
  function Stagger(
    {
      stagger = 0.08,
      delayChildren = 0,
      onMount = true,
      once = true,
      className,
      children,
      ...props
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion()

    const container: Variants = {
      hidden: {},
      visible: {
        transition: {
          staggerChildren: reduceMotion ? 0 : stagger,
          delayChildren,
        },
      },
    }

    const animationProps = onMount
      ? { initial: "hidden" as const, animate: "visible" as const }
      : {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: { once, amount: 0.2 },
        }

    return (
      <motion.div
        ref={ref}
        variants={container}
        className={cn(className)}
        {...animationProps}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

/* -------------------------------------------------------------------------- */
/*  Reveal (scroll-triggered single element)                                  */
/* -------------------------------------------------------------------------- */

export interface RevealProps extends FadeInProps {
  /** Fraction of the element that must be visible to trigger. Defaults 0.2. */
  amount?: number
  /** Only animate the first time it enters the viewport. Defaults true. */
  once?: boolean
}

/**
 * Like <FadeIn> but triggers when the element scrolls into view instead of on
 * mount. Ideal for long landing pages.
 */
export const Reveal = React.forwardRef<HTMLDivElement, RevealProps>(
  function Reveal(
    {
      direction = "up",
      distance = DEFAULT_DISTANCE,
      delay = 0,
      duration,
      amount = 0.2,
      once = true,
      className,
      children,
      transition,
      ...props
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion()
    const offset = reduceMotion ? { x: 0, y: 0 } : offsetFor(direction, distance)

    const mergedTransition: Transition = {
      ...DEFAULT_TRANSITION,
      ...(duration != null ? { duration } : null),
      delay,
      ...transition,
    }

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, ...offset }}
        whileInView={{ opacity: 1, x: 0, y: 0 }}
        viewport={{ once, amount }}
        transition={mergedTransition}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

/* -------------------------------------------------------------------------- */
/*  HoverScale (interactive affordance)                                       */
/* -------------------------------------------------------------------------- */

export interface HoverScaleProps extends HTMLMotionProps<"div"> {
  /** Scale on hover. Defaults to 1.03. */
  scale?: number
  /** Scale on tap/press. Defaults to 0.98. */
  tapScale?: number
}

/**
 * Adds a subtle scale on hover and press. Disabled under reduced-motion.
 */
export const HoverScale = React.forwardRef<HTMLDivElement, HoverScaleProps>(
  function HoverScale(
    { scale = 1.03, tapScale = 0.98, className, children, ...props },
    ref,
  ) {
    const reduceMotion = useReducedMotion()

    return (
      <motion.div
        ref={ref}
        whileHover={reduceMotion ? undefined : { scale }}
        whileTap={reduceMotion ? undefined : { scale: tapScale }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)

/* -------------------------------------------------------------------------- */
/*  Re-exports for convenience                                                 */
/* -------------------------------------------------------------------------- */

export { motion, useReducedMotion }
export type { Variants, Transition, HTMLMotionProps }
