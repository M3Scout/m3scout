import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { SidebarProvider, useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";

function AppLayoutContent() {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-background flex w-full max-w-full overflow-x-hidden">
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
          <Outlet />
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