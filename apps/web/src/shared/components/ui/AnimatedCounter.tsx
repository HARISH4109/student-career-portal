import { useEffect, useRef, useState } from 'react';
import { useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

export interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Spring-animated numerical counter honoring Swiss typographic precision
 * and prefers-reduced-motion accessibility.
 */
export function AnimatedCounter({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const [isInView, setIsInView] = useState(() => {
    return typeof window === 'undefined' || typeof IntersectionObserver === 'undefined';
  });

  const motionValue = useMotionValue(shouldReduceMotion ? value : 0);
  const springValue = useSpring(motionValue, {
    stiffness: 70,
    damping: 18,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setIsInView(true);
      return;
    }

    const currentRef = ref.current;
    if (!currentRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '-20px' },
    );

    observer.observe(currentRef);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (shouldReduceMotion) {
      if (ref.current) {
        ref.current.textContent = `${prefix}${value.toFixed(decimals)}${suffix}`;
      }
      return;
    }
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, motionValue, value, shouldReduceMotion, decimals, prefix, suffix]);

  useEffect(() => {
    if (shouldReduceMotion) return;
    return springValue.on('change', (latest) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${latest.toFixed(decimals)}${suffix}`;
      }
    });
  }, [springValue, decimals, prefix, suffix, shouldReduceMotion]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}
