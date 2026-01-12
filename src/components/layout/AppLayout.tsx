import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[hsl(222,47%,4%)]">
      <AppSidebar />
      {/* Mobile padding for fixed header */}
      <main className="lg:ml-56 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}