import { Outlet, useLocation } from "react-router-dom";
import { SmartHeader } from "./SmartHeader";
import { PublicFooter } from "./PublicFooter";

export function PublicLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Smart header with transparent variant on home page */}
      <SmartHeader variant={isHomePage ? "transparent" : "default"} />
      <main className="flex-1">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
}
