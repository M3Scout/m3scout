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
 * Uses CSS variables for consistent alignment across all pages:
 * - --page-max-width: 1280px (unified site width)
 * - --page-gutter: 16px mobile, 20px md, 24px lg
 * 
 * All public page content (hero, sections, grids) should use this container
 * to ensure the left edge of content aligns exactly with the header logo.
 */
export function PageContainer({ 
  children, 
  className, 
  as: Component = "div" 
}: PageContainerProps) {
  return (
    <Component 
      className={cn("w-full mx-auto", className)}
      style={{ 
        maxWidth: 'var(--page-max-width)', 
        paddingLeft: 'var(--page-gutter)', 
        paddingRight: 'var(--page-gutter)' 
      }}
    >
      {children}
    </Component>
  );
}
