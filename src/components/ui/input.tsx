import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex h-10 w-full rounded-md px-3 py-2 text-base md:text-sm",
          // Premium charcoal background - NO blue tint
          "bg-zinc-900/80 border border-zinc-800/60",
          // Text and placeholder
          "text-foreground placeholder:text-zinc-500",
          // Focus: orange/primary ring, no blue glow
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary/40",
          "focus-visible:bg-zinc-900",
          // Hover state
          "hover:border-zinc-700/60 hover:bg-zinc-900/90",
          // File input styles
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
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
  },
);
Input.displayName = "Input";

export { Input };
