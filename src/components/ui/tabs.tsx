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
      // Mobile-first: vertical stack or horizontal scroll with proper containment
      "inline-flex items-center justify-start gap-1 p-1 text-muted-foreground",
      // Mobile: wrap into rows if needed, full width container
      "flex-wrap w-full",
      // Desktop: horizontal layout with rounded container
      "md:flex-nowrap md:w-auto md:rounded-xl md:bg-zinc-800/50 md:backdrop-blur-sm md:border md:border-white/5",
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
      // Base styles - compact on mobile
      "inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background transition-all",
      // Mobile: smaller, squared corners, minimal padding
      "rounded-lg px-3 py-2 min-h-[40px] min-w-0",
      // Mobile: add background to each tab for clarity
      "bg-zinc-800/50 border border-white/5",
      // Desktop: pill style
      "md:rounded-full md:px-4 md:bg-transparent md:border-0",
      // Active state - contained background, no overflow
      "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
      // Inactive hover
      "hover:bg-white/5 data-[state=active]:hover:bg-primary",
      // Focus state
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-3 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      // Prevent horizontal overflow
      "w-full min-w-0 overflow-x-hidden",
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
