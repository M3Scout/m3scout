import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";
import { PageTransition } from "./PageTransition";
import { cn } from "@/lib/utils";

function AppLayoutContent() {
  const { isCollapsed } = useSidebar();
  const location = useLocation();

  return (
    <div className="min-h-screen flex w-full max-w-full overflow-x-hidden bg-background">
      <AppSidebar />
      {/* Main content with dynamic margin based on sidebar state */}
      <main 
        className={cn(
          "flex-1 pt-14 lg:pt-0 min-h-screen transition-[margin] duration-200 ease-out overflow-x-hidden max-w-full",
          // Desktop: dynamic margin based on sidebar state
          isCollapsed ? "lg:ml-[60px]" : "lg:ml-56"
        )}
      >
        <div className="p-[var(--padding-mobile)] md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export function AppLayout() {
  return (
    <SidebarProvider>
      <AppLayoutContent />
    </SidebarProvider>
  );
}