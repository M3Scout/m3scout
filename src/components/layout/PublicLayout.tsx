import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { SmartHeader } from "./SmartHeader";
import { PublicFooter } from "./PublicFooter";
import { PageTransition } from "./PageTransition";

export function PublicLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Smart header with transparent variant on home page */}
      <SmartHeader variant={isHomePage ? "transparent" : "default"} />
      <main className="flex-1">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <PublicFooter />
    </div>
  );
}
