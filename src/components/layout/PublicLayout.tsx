import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { SmartHeader } from "./SmartHeader";
import { PublicFooter } from "./PublicFooter";
import { PageTransition } from "./PageTransition";
import { MobileStickyCTA } from "./MobileStickyCTA";

export function PublicLayout() {
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  return (
    <div className="min-h-screen flex flex-col bg-black">
      {/* Smart header with transparent variant on home page */}
      <SmartHeader variant={isHomePage ? "transparent" : "default"} />
      <main className="flex-1 pb-20 lg:pb-0">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <PublicFooter />
      
      {/* Mobile sticky CTA */}
      <MobileStickyCTA />
    </div>
  );
}
