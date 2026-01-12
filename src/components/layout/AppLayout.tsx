import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-[hsl(222,47%,5%)]">
      <AppSidebar />
      {/* Mobile padding for fixed header */}
      <main className="lg:ml-60 pt-16 lg:pt-0 min-h-screen">
        <div className="p-5 md:p-6 lg:p-8 max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
