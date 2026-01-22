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
      // Floating container design
      "relative flex items-center gap-1",
      // Increased height for premium feel
      "w-full h-14 px-2 md:px-4",
      // Rounded container with subtle border
      "rounded-xl",
      // Premium dark gradient background
      "bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95",
      // Subtle border for definition
      "border border-zinc-800/40",
      // Multi-layer shadow for floating effect
      "shadow-[0_4px_24px_-8px_rgba(0,0,0,0.4),inset_0_1px_0_0_rgba(255,255,255,0.02)]",
      // Top highlight line
      "before:absolute before:inset-x-2 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-zinc-600/20 before:to-transparent before:rounded-t-xl",
      "backdrop-blur-xl",
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
      // Base structure with more breathing room
      "group relative inline-flex items-center justify-center gap-2",
      "h-10 px-4 md:px-5 mx-0.5",
      "whitespace-nowrap",
      "rounded-lg",
      // Smooth transition - 150ms for snappy feel
      "transition-all duration-150 ease-out",
      // Typography: refined hierarchy
      "text-[12.5px] md:text-[13px] font-medium tracking-[0.015em]",
      // Icon styling: smaller, thinner stroke, more subtle
      "[&>svg]:w-3.5 [&>svg]:h-3.5 [&>svg]:shrink-0 [&>svg]:stroke-[1.5]",
      "[&>svg]:transition-all [&>svg]:duration-150",
      // Default state: very muted, clear secondary status
      "text-zinc-500",
      "[&>svg]:text-zinc-600",
      "[&>svg]:opacity-60",
      // Hover: elegant lift without hard background
      "hover:text-zinc-300",
      "hover:[&>svg]:text-zinc-400",
      "hover:[&>svg]:opacity-80",
      "hover:bg-white/[0.02]",
      // Active state: prominent glass pill with real presence
      "data-[state=active]:text-white",
      "data-[state=active]:font-semibold",
      "data-[state=active]:bg-gradient-to-b data-[state=active]:from-white/[0.08] data-[state=active]:to-white/[0.03]",
      "data-[state=active]:backdrop-blur-sm",
      "data-[state=active]:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      "data-[state=active]:border data-[state=active]:border-white/[0.08]",
      // Active icon: more visible but still secondary
      "data-[state=active]:[&>svg]:text-zinc-200",
      "data-[state=active]:[&>svg]:opacity-90",
      // Focus state
      "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-zinc-900",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {props.children}
    {/* Bottom accent bar - appears on active */}
    <span
      className={cn(
        "absolute bottom-1 left-1/2 -translate-x-1/2",
        "h-[2px] w-0 rounded-full",
        // Primary color accent with subtle glow
        "bg-gradient-to-r from-primary/70 via-primary to-primary/70",
        "shadow-[0_0_6px_1px_rgba(var(--primary),0.3)]",
        "transition-all duration-150 ease-out",
        "group-data-[state=active]:w-[calc(100%-24px)]",
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
      // Increased top margin for clear separation
      "mt-6 ring-offset-background",
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
