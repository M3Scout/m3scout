import { Link, useLocation } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function MobileStickyCTA() {
  const location = useLocation();
  
  // Hide on contact page since user is already there
  const isContactPage = location.pathname === "/contato" || location.pathname === "/contact";
  
  if (isContactPage) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden">
      {/* Gradient fade for smooth transition */}
      <div className="h-6 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      
      {/* CTA Bar */}
      <div className="bg-black border-t border-zinc-900 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Link
          to="/contato"
          className={cn(
            "flex items-center justify-center gap-2 w-full",
            "bg-[#e52421] hover:bg-[#c91f1c] active:bg-[#b01b19]",
            "text-white text-sm font-semibold tracking-wide",
            "py-3.5 px-6",
            "transition-colors duration-200",
            "shadow-none"
          )}
        >
          <MessageCircle className="w-4 h-4" />
          FALE CONOSCO
        </Link>
      </div>
    </div>
  );
}