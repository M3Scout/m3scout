import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      {/* Mobile padding for fixed header */}
      <main className="lg:ml-56 pt-14 lg:pt-0 min-h-screen">
        <div className="p-[var(--padding-mobile)] md:p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}