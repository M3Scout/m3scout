import { Outlet } from "react-router-dom";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";

export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Menu em vidro + menu mobile + transição de página (bola cruzando a tela) */}
      <SiteNav />

      <main className="flex-1">
        <Outlet />
      </main>

      <SiteFooter />
    </div>
  );
}
