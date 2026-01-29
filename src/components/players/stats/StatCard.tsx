import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  total?: number;
  showPercentage?: boolean;
  icon?: React.ReactNode;
  highlight?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

/**
 * Reusable stat card component
 * Supports format "X/Y (Z%)" when total is provided
 * 
 * REGRA MATEMÁTICA:
 * - percentage = (value / total) * 100
 * - Nunca exibe percentual > 100%
 * - Never renders undefined or NaN - shows 0 instead
 */
export function StatCard({
  label,
  value,
  total,
  showPercentage = true,
  icon,
  highlight = false,
  variant = "default",
  size = "md",
}: StatCardProps) {
  // Ensure value is never undefined/NaN
  const safeValue = typeof value === "number" && !isNaN(value) ? Math.max(0, value) : 0;
  const safeTotal = typeof total === "number" && !isNaN(total) ? Math.max(0, total) : 0;

  // Calculate percentage if total provided - CAPPED AT 100%
  const percentage = safeTotal > 0 ? Math.min(Math.round((safeValue / safeTotal) * 100), 100) : 0;

  // Format display value
  const displayValue = total !== undefined 
    ? `${safeValue}/${safeTotal}${showPercentage ? ` (${percentage}%)` : ""}`
    : (typeof value === "string" ? value : safeValue.toString());

  const variantStyles = {
    default: "text-foreground",
    success: "text-emerald-500",
    warning: "text-amber-500",
    danger: "text-destructive",
  };

  const sizeStyles = {
    sm: "p-2",
    md: "p-3",
    lg: "p-4",
  };

  const valueSizeStyles = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card transition-colors",
        sizeStyles[size],
        highlight && "border-primary/50 bg-primary/5"
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        {icon && <span className="opacity-70">{icon}</span>}
        <span>{label}</span>
      </div>
      <div
        className={cn(
          "font-bold tabular-nums",
          valueSizeStyles[size],
          variantStyles[variant]
        )}
      >
        {displayValue}
      </div>
    </div>
  );
}

interface StatGroupProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Groups related stats together with a title
 */
export function StatGroup({ title, icon, children }: StatGroupProps) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wide">
        {icon}
        {title}
      </h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {children}
      </div>
    </div>
  );
}
