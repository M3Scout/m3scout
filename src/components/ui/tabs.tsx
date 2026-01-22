import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Base: multi-layer premium console bar
      "relative flex items-center gap-0.5",
      "w-full h-[52px] px-3 md:px-6",
      // Layered gradient for depth
      "bg-gradient-to-b from-zinc-900/98 via-zinc-900/95 to-zinc-950/98",
      // Inner shadow for depth/inset feel
      "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03),inset_0_-1px_0_0_rgba(0,0,0,0.4)]",
      // Subtle bottom border with glow
      "border-b border-zinc-800/60",
      "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-zinc-700/30 after:to-transparent",
      "backdrop-blur-md",
      // Mobile: horizontal scroll with hidden scrollbar
      "overflow-x-auto scrollbar-hide",
      // Tablet/Desktop: better spacing
      "md:justify-start lg:justify-center",
      className,
    )}
    {...props}
  />
));
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Base structure
      "group relative inline-flex items-center justify-center gap-2.5",
      "h-10 px-4 md:px-5 mx-0.5",
      "whitespace-nowrap",
      "rounded-lg",
      "transition-all duration-150 ease-out",
      // Typography: refined hierarchy
      "text-[13px] md:text-[13.5px] font-medium tracking-[0.01em]",
      // Icon styling: subtle, secondary
      "[&>svg]:w-[15px] [&>svg]:h-[15px] [&>svg]:shrink-0 [&>svg]:stroke-[1.25]",
      "[&>svg]:transition-all [&>svg]:duration-150",
      // Default state: muted with clear hierarchy (icon lighter than text)
      "text-zinc-400",
      "[&>svg]:text-zinc-500/70",
      // Hover: elegant glow effect, no hard background
      "hover:text-zinc-100",
      "hover:[text-shadow:0_0_20px_rgba(255,255,255,0.15)]",
      "[&>svg]:hover:text-zinc-400",
      // Active state: glass pill effect
      "data-[state=active]:text-white",
      "data-[state=active]:bg-white/[0.04]",
      "data-[state=active]:backdrop-blur-sm",
      "data-[state=active]:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_1px_2px_0_rgba(0,0,0,0.2)]",
      "data-[state=active]:border data-[state=active]:border-white/[0.06]",
      // Active icon: slightly highlighted
      "data-[state=active]:[&>svg]:text-zinc-300",
      "data-[state=active]:[&>svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.15)]",
      // Focus state
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {props.children}
    {/* Animated underline: desaturated red, elegant */}
    <span
      className={cn(
        "absolute bottom-0 left-1/2 -translate-x-1/2",
        "h-[2px] w-0 rounded-full",
        // Desaturated red with subtle glow
        "bg-gradient-to-r from-rose-500/80 via-red-500/90 to-rose-500/80",
        "shadow-[0_0_8px_2px_rgba(220,38,38,0.25)]",
        "transition-all duration-200 ease-out",
        "group-data-[state=active]:w-[calc(100%-20px)]",
      )}
    />
  </TabsPrimitive.Trigger>
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      // Prevent horizontal overflow
      "w-full min-w-0 overflow-x-hidden",
      // Subtle fade-in animation
      "animate-fade-in",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
