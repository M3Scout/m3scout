import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";
import { PageTransition } from "./PageTransition";
import { AppBottomNav } from "./AppBottomNav";
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
          "flex-1 min-h-screen transition-[margin] duration-200 ease-out overflow-x-hidden max-w-full",
          // Desktop: dynamic margin based on sidebar state (64px collapsed, 224px expanded)
          isCollapsed ? "lg:ml-16" : "lg:ml-56",
           // Mobile only: account for safe area + header height (header is md:hidden, so clear at md+)
           "pt-[calc(var(--sat)+3.5rem)] md:pt-0"
        )}
      >
        <div className="p-[var(--padding-mobile)] md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden lg:pt-8 pb-24 md:pb-6 lg:pb-8">
          <AnimatePresence mode="wait" initial={false}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </AnimatePresence>
        </div>
      </main>
      <AppBottomNav />
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