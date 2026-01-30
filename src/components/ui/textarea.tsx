import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        // Base styles
        "flex min-h-[80px] w-full rounded-md px-3 py-2 text-sm",
        // Premium charcoal background - NO blue tint
        "bg-zinc-900/80 border border-zinc-800/60",
        // Text and placeholder
        "text-foreground placeholder:text-zinc-500",
        // Focus: orange/primary ring, no blue glow
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/40",
        "focus-visible:bg-zinc-900",
        // Hover state
        "hover:border-zinc-700/60 hover:bg-zinc-900/90",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Transition
        "transition-colors duration-150",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
