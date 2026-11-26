import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import {
  cloneElement,
  createContext,
  forwardRef,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react';

import { cn } from '@/shared/lib/utils';

/* ── Context ───────────────────────────────────────────── */
interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
const DialogContext = createContext<DialogContextValue>({
  open: false,
  onOpenChange: () => { },
});

/* ── Root ──────────────────────────────────────────────── */
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children: ReactNode;
}

function Dialog({ open: controlledOpen, onOpenChange, defaultOpen = false, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
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
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

/* ── Trigger ───────────────────────────────────────────── */
interface DialogTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}
const DialogTrigger = forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ asChild = false, onClick, children, ...props }, ref) => {
    const { onOpenChange } = useContext(DialogContext);
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      onOpenChange(true);
      onClick?.(e);
    };

    if (asChild && isValidElement(children)) {
      const child = children as ReactElement<{ onClick?: (e: MouseEvent<HTMLButtonElement>) => void }>;
      return cloneElement(child, {
        ...props,
        onClick: (e: MouseEvent<HTMLButtonElement>) => {
          child.props?.onClick?.(e);
          handleClick(e);
        },
        ...(ref ? { ref } : {}),
      } as Record<string, unknown>);
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DialogTrigger.displayName = 'DialogTrigger';

/* ── Content ───────────────────────────────────────────── */
interface DialogContentProps {
  className?: string;
  children?: ReactNode;
  onClose?: () => void;
}
const DialogContent = forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose }, ref) => {
    const { open, onOpenChange } = useContext(DialogContext);
    const contentRef = useRef<HTMLDivElement>(null);

    // Focus trap and Escape key
    useEffect(() => {
      if (!open) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
          onClose?.();
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Auto-focus first focusable element
      const timer = setTimeout(() => {
        const firstFocusable = contentRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }, 50);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
        clearTimeout(timer);
      };
    }, [open, onOpenChange, onClose]);

    return (
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
              onClick={() => {
                onOpenChange(false);
                onClose?.();
              }}
              aria-hidden="true"
            />
            {/* Content */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                ref={ref || contentRef}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                role="dialog"
                aria-modal="true"
                className={cn(
                  'relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl',
                  className,
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onClose?.();
                  }}
                  className="absolute right-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
                {children}
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    );
  },
);
DialogContent.displayName = 'DialogContent';

/* ── Header ────────────────────────────────────────────── */
function DialogHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 pb-4', className)} {...props} />;
}

/* ── Title ─────────────────────────────────────────────── */
function DialogTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight text-foreground', className)} {...props} />;
}

/* ── Description ───────────────────────────────────────── */
function DialogDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

/* ── Footer ────────────────────────────────────────────── */
function DialogFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};
