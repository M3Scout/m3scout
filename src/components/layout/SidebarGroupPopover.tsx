import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarGroupPopoverProps {
  label: string;
  items: NavItem[];
  isActive: boolean;
}

export function SidebarGroupPopover({ label, items, isActive }: SidebarGroupPopoverProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  
  // Use first item's icon as group icon
  const GroupIcon = items[0]?.icon;
  
  const isItemActive = (href: string) => {
    if (href === "/app") return location.pathname === "/app";
    return location.pathname.startsWith(href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center justify-center py-2.5 rounded-lg transition-all duration-150",
                "relative group",
                isActive
                  ? "bg-gradient-to-r from-primary/12 to-primary/6 text-white"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-primary rounded-full" />
              )}
              {GroupIcon && (
                <GroupIcon 
                  className={cn(
                    "w-[18px] h-[18px] transition-colors duration-150",
                    isActive ? "text-primary" : "text-zinc-500 group-hover:text-zinc-300"
                  )} 
                  strokeWidth={1.5}
                />
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          sideOffset={12}
          className="bg-zinc-900 border-zinc-800 text-zinc-100 text-xs font-medium"
        >
          {label}
        </TooltipContent>
      </Tooltip>
      
      <PopoverContent 
        side="right" 
        align="start"
        sideOffset={8}
        className="w-48 p-1 bg-zinc-900 border-zinc-800"
      >
        <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
          {label}
        </p>
        <div className="space-y-0.5">
          {items.map((item) => {
            const active = isItemActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-2 py-2 rounded-md transition-all duration-150",
                  active
                    ? "bg-primary/10 text-white"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-white/5"
                )}
              >
                <item.icon 
                  className={cn(
                    "w-4 h-4 shrink-0",
                    active ? "text-primary" : "text-zinc-500"
                  )} 
                  strokeWidth={1.5}
                />
                <span className="text-[13px]">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
