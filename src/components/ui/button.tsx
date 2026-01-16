import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25 focus-visible:ring-primary",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-lg shadow-destructive/25 focus-visible:ring-destructive",
        outline: "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-ring",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 focus-visible:ring-ring",
        ghost: "hover:bg-secondary hover:text-secondary-foreground focus-visible:ring-ring",
        link: "text-primary underline-offset-4 hover:underline focus-visible:ring-primary",
        gradient: "bg-gradient-to-r from-emerald to-emerald-light text-primary-foreground font-semibold shadow-lg shadow-emerald/25 hover:shadow-xl hover:shadow-emerald/30 focus-visible:ring-emerald",
        gold: "bg-gradient-to-r from-accent to-amber-500 text-accent-foreground font-semibold shadow-lg shadow-amber-500/25 hover:shadow-xl focus-visible:ring-amber-500",
        hero: "bg-primary text-primary-foreground font-semibold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] focus-visible:ring-primary",
        heroOutline: "border-2 border-primary/50 text-foreground bg-transparent hover:bg-primary/10 hover:border-primary font-semibold focus-visible:ring-primary",
        // New semantic variants with matching glows
        success: "bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-600/25 hover:shadow-xl hover:shadow-green-600/30 focus-visible:ring-green-500",
        warning: "bg-amber-600 text-white hover:bg-amber-700 shadow-lg shadow-amber-600/25 hover:shadow-xl hover:shadow-amber-600/30 focus-visible:ring-amber-500",
        info: "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 focus-visible:ring-blue-500",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
