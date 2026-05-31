import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LandingNav } from "@/components/home/LandingNav";
import { LandingFooter } from "@/components/home/LandingFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageTransition } from "./PageTransition";

export function PublicLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      <LandingNav />
      <main className="flex-1 lg:pb-0">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <div className="hidden lg:block">
        <LandingFooter />
      </div>
      <MobileBottomNav />
    </div>
  );
}
