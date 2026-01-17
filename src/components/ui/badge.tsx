import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  // Base: pill shape with consistent height, no square corners
  "inline-flex items-center justify-center gap-1.5 rounded-full border font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground border-border bg-transparent",
        // Glass pill variant - modern glassmorphism
        glass: "border-white/10 bg-white/5 text-zinc-300 backdrop-blur-sm hover:bg-white/10",
        // Status variants with soft backgrounds
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        warning: "border-amber-500/30 bg-amber-500/15 text-amber-400",
        info: "border-blue-500/30 bg-blue-500/15 text-blue-400",
        error: "border-red-500/30 bg-red-500/15 text-red-400",
        // Live game status badges
        live: "border-green-500/30 bg-green-500/15 text-green-400",
        paused: "border-amber-500/30 bg-amber-500/15 text-amber-400",
        draft: "border-zinc-600/30 bg-zinc-700/40 text-zinc-400",
      },
      size: {
        default: "h-6 px-2.5 text-xs",
        sm: "h-5 px-2 text-[10px]",
        lg: "h-8 px-3.5 text-sm",
        // Mobile-optimized size with tap target
        mobile: "h-9 min-h-[36px] px-4 text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
