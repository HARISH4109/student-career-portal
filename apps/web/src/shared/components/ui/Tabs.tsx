import { createContext, forwardRef, useContext, useId, useState, type HTMLAttributes, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { cn } from '@/shared/lib/utils';

/* ── Context ───────────────────────────────────────────── */
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  tabsId: string;
}
const TabsContext = createContext<TabsContextValue>({ value: '', onValueChange: () => {}, tabsId: '' });

/* ── Root ──────────────────────────────────────────────── */
interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  children: ReactNode;
}

function Tabs({ value: controlledValue, onValueChange, defaultValue = '', className, children, ...props }: TabsProps) {
  const generatedId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleChange = (newValue: string) => {
    if (!isControlled) setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange, tabsId: generatedId }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/* ── List ──────────────────────────────────────────────── */
const TabsList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'relative inline-flex h-10 items-center justify-start gap-1 rounded-lg border border-border/80 bg-muted/40 p-1 text-muted-foreground backdrop-blur-xs',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

/* ── Trigger ───────────────────────────────────────────── */
interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}
const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, disabled, children, ...props }, ref) => {
    const ctx = useContext(TabsContext);
    const isActive = ctx.value === value;
    const shouldReduceMotion = useReducedMotion();

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        disabled={disabled}
        onClick={() => ctx.onValueChange(value)}
        className={cn(
          'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-3.5 py-1.5 text-xs sm:text-sm font-medium transition-colors duration-150 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          isActive
            ? 'text-foreground font-semibold shadow-xs'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/30',
          className,
        )}
        {...props}
      >
        {isActive && (
          <motion.div
            layoutId={`${ctx.tabsId}-tab-glider`}
            className="absolute inset-0 rounded-md bg-card border border-border shadow-xs"
            transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
          />
        )}
        <span className="relative z-10">{children}</span>
      </button>
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

/* ── Content ───────────────────────────────────────────── */
interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}
const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, children, ...props }, ref) => {
    const ctx = useContext(TabsContext);
    if (ctx.value !== value) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={cn('mt-3 animate-fade-in focus-visible:outline-none', className)}
        tabIndex={0}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
