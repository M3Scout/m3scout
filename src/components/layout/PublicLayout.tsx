import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { LandingNav } from "@/components/home/LandingNav";
import { LandingFooter } from "@/components/home/LandingFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { PageTransition } from "./PageTransition";

const MOBILE_HEADER_ROUTES: { path: string; title: string }[] = [
  { path: "/sobre",     title: "Sobre"     },
  { path: "/atletas",   title: "Atletas"   },
  { path: "/players",   title: "Atletas"   },
  { path: "/imprensa",  title: "Imprensa"  },
  { path: "/contato",   title: "Contato"   },
  { path: "/contact",   title: "Contato"   },
];

export function PublicLayout() {
  const location = useLocation();

  const mobileHeader = MOBILE_HEADER_ROUTES.find(r =>
    location.pathname === r.path || location.pathname.startsWith(r.path + "/")
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0A]">
      <LandingNav />

      {/* Fixed mobile header — only on specific routes */}
      {mobileHeader && <MobilePageHeader title={mobileHeader.title} />}

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
