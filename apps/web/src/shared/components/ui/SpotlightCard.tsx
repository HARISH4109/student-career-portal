import React, { type HTMLAttributes } from 'react';
import { cn } from '@/shared/lib/utils';

export interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Size of the radial spotlight circle in pixels (retained for backward compatibility) */
  spotlightSize?: number;
  /** Spotlight color overlay (retained for backward compatibility) */
  spotlightColor?: string;
  /** Border glow color overlay (retained for backward compatibility) */
  borderColor?: string;
}

/**
 * Disciplined card container with quiet chrome, clear surface elevation,
 * and deliberate hairline border focus/hover states.
 */
export function SpotlightCard({
  children,
  className,
  spotlightSize: _spotlightSize,
  spotlightColor: _spotlightColor,
  borderColor: _borderColor,
  ...props
}: SpotlightCardProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-xs',
        'transition-colors duration-150 ease-out hover:border-primary/30',
        className,
      )}
      {...props}
    >
      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
