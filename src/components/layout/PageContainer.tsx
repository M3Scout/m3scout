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
 * Uses CSS variable --page-max-width (1200px) and --page-gutter for padding.
 * Ensures all content aligns perfectly with header logo across all pages.
 */
export function PageContainer({ 
  children, 
  className, 
  as: Component = "div" 
}: PageContainerProps) {
  return (
    <Component className={cn("container-main", className)}>
      {children}
    </Component>
  );
}
