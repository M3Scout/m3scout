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
      // Base: premium dark gradient bar with subtle border
      "relative flex items-center gap-1",
      "w-full h-[52px] px-2",
      "bg-gradient-to-r from-zinc-900/95 via-zinc-900/90 to-zinc-900/95",
      "border-b border-white/[0.06]",
      "backdrop-blur-sm",
      // Mobile: horizontal scroll with hidden scrollbar
      "overflow-x-auto scrollbar-hide",
      // Tablet/Desktop: centered flex
      "md:justify-start md:gap-0.5 md:px-4",
      "lg:justify-center",
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
      "group relative inline-flex items-center justify-center gap-2",
      "h-[52px] px-4 md:px-5",
      "whitespace-nowrap",
      "transition-all duration-200 ease-out",
      // Typography: clean and legible
      "text-[13px] md:text-sm font-medium tracking-wide",
      // Icon styling
      "[&>svg]:w-4 [&>svg]:h-4 [&>svg]:shrink-0 [&>svg]:stroke-[1.5]",
      // Default state: muted gray
      "text-zinc-400",
      "[&>svg]:text-zinc-500",
      // Hover state: white text with subtle lift
      "hover:text-white hover:translate-y-[-1px]",
      "[&>svg]:transition-colors [&>svg]:duration-200",
      "hover:[&>svg]:text-zinc-300",
      // Active state: white text with translucent pill background
      "data-[state=active]:text-white",
      "data-[state=active]:[&>svg]:text-white",
      "data-[state=active]:bg-white/[0.06]",
      "data-[state=active]:rounded-lg",
      // Focus state
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {props.children}
    {/* Animated red underline for active state */}
    <span
      className={cn(
        "absolute bottom-0 left-1/2 -translate-x-1/2",
        "h-[2px] w-0 bg-primary rounded-full",
        "transition-all duration-300 ease-out",
        "group-data-[state=active]:w-[calc(100%-16px)]",
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
