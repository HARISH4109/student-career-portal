import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/shared/lib/utils';

interface TooltipProps extends HTMLAttributes<HTMLDivElement> {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
}

/**
 * Lightweight CSS-only tooltip.
 * Uses group-hover for zero JS overhead. No portal needed.
 */
const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ children, content, side = 'top', className, ...props }, ref) => {
    const positionClasses: Record<string, string> = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
      <div ref={ref} className={cn('group relative inline-flex', className)} {...props}>
        {children}
        <span
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs text-background shadow-md',
            'opacity-0 transition-opacity duration-150 group-hover:opacity-100',
            positionClasses[side],
          )}
        >
          {content}
        </span>
      </div>
    );
  },
);
Tooltip.displayName = 'Tooltip';

export { Tooltip };
