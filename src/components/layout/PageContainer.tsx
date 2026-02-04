import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Use "section" when wrapping a <section>, otherwise defaults to <div> */
  as?: "div" | "section" | "main" | "article";
}

/**
 * PageContainer - Global container aligned with header logo
 * 
 * This component ensures all content starts exactly aligned with 
 * the left edge of the header logo across all pages.
 * 
 * Uses: max-w-[1400px] with responsive padding (px-4 sm:px-6 lg:px-8)
 * matching the PublicHeader container for perfect alignment.
 */
export function PageContainer({ 
  children, 
  className, 
  as: Component = "div" 
}: PageContainerProps) {
  return (
    <Component 
      className={cn(
        "w-full max-w-[1400px] mx-auto",
        "px-[var(--page-gutter)]",
        className
      )}
    >
      {children}
    </Component>
  );
}
