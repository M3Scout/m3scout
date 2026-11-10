import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/hooks/useSidebar";
import { DashShell } from "@/components/dash/DashShell";

/** Layout do painel: casca nova (painel.html) em volta das telas. */
export function AppLayout() {
  return (
    <SidebarProvider>
      <DashShell>
        <Outlet />
      </DashShell>
    </SidebarProvider>
  );
}
