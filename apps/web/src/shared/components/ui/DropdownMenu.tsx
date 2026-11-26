import { AnimatePresence, motion } from 'framer-motion';
import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/shared/lib/utils';

/* ── Context ───────────────────────────────────────────── */
interface DropdownContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}
const DropdownContext = createContext<DropdownContextValue>({
  open: false,
  onOpenChange: () => {},
  triggerRef: { current: null },
});

/* ── Root ──────────────────────────────────────────────── */
interface DropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

function DropdownMenu({ open: controlledOpen, onOpenChange, children }: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange],
  );

  return (
    <DropdownContext.Provider value={{ open, onOpenChange: handleOpenChange, triggerRef }}>
      <div className="relative inline-block text-left">{children}</div>
    </DropdownContext.Provider>
  );
}

/* ── Trigger ───────────────────────────────────────────── */
const DropdownMenuTrigger = forwardRef<HTMLButtonElement, HTMLAttributes<HTMLButtonElement>>(
  ({ onClick, children, ...props }, ref) => {
    const { open, onOpenChange, triggerRef } = useContext(DropdownContext);
    return (
      <button
        ref={(node) => {
          (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
        }}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={(e) => {
          onOpenChange(!open);
          onClick?.(e);
        }}
        className="cursor-pointer"
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

/* ── Content ───────────────────────────────────────────── */
interface DropdownMenuContentProps {
  className?: string;
  align?: 'start' | 'end';
  children?: ReactNode;
}
const DropdownMenuContent = forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, align = 'end', children }, ref) => {
    const { open, onOpenChange } = useContext(DropdownContext);
    const contentRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
      if (!open) return;
      const handleClick = (e: MouseEvent) => {
        if (contentRef.current && !contentRef.current.contains(e.target as Node)) {
          onOpenChange(false);
        }
      };
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onOpenChange(false);
      };
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }, [open, onOpenChange]);

    return (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={ref || contentRef}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            role="menu"
            className={cn(
              'absolute z-50 mt-2 min-w-[10rem] overflow-hidden rounded-xl border border-border bg-popover p-1 shadow-lg',
              align === 'end' ? 'right-0' : 'left-0',
              className,
            )}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  },
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

/* ── Item ──────────────────────────────────────────────── */
interface DropdownMenuItemProps extends HTMLAttributes<HTMLDivElement> {
  disabled?: boolean;
  destructive?: boolean;
}
const DropdownMenuItem = forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, disabled, destructive, onClick, ...props }, ref) => {
    const { onOpenChange } = useContext(DropdownContext);
    return (
      <div
        ref={ref}
        role="menuitem"
        tabIndex={disabled ? -1 : 0}
        onClick={(e) => {
          if (disabled) return;
          onClick?.(e);
          onOpenChange(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!disabled) {
              onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
              onOpenChange(false);
            }
          }
        }}
        className={cn(
          'relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none transition-colors cursor-pointer',
          'focus-visible:bg-accent focus-visible:text-accent-foreground',
          destructive
            ? 'text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10'
            : 'hover:bg-accent hover:text-accent-foreground',
          disabled && 'pointer-events-none opacity-50',
          className,
        )}
        aria-disabled={disabled}
        {...props}
      />
    );
  },
);
DropdownMenuItem.displayName = 'DropdownMenuItem';

/* ── Separator ─────────────────────────────────────────── */
function DropdownMenuSeparator({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('-mx-1 my-1 h-px bg-border', className)} role="separator" {...props} />;
}

/* ── Label ─────────────────────────────────────────────── */
function DropdownMenuLabel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-3 py-1.5 text-xs font-semibold text-muted-foreground', className)} {...props} />;
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
};
