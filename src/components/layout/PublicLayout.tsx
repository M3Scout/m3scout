import { Outlet, useLocation } from "react-router-dom";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

export function PublicLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hide default header on home page since HeaderHero has its own nav */}
      {!isHomePage && <PublicHeader />}
      <main className={`flex-1 ${!isHomePage ? "pt-16" : ""}`}>
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
