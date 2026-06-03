import { Link } from "react-router-dom";
import { Lock } from "lucide-react";

interface MobilePageHeaderProps {
  title: string;
}

export function MobilePageHeader({ title }: MobilePageHeaderProps) {
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b"
      style={{
        height: "56px",
        background: "#000000",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <span
        style={{
          fontFamily: "'Basis Grotesque Pro', sans-serif",
          fontWeight: 600,
          fontSize: 21,
          color: "#ffffff",
          letterSpacing: "-0.01em",
          paddingLeft: "clamp(24px, 5.625vw, 72px)",
        }}
      >
        {title}
      </span>

      <Link
        to="/dashboard/auth"
        className="flex items-center justify-center h-9 text-white hover:text-white transition-colors"
        style={{ paddingRight: "clamp(24px, 5.625vw, 72px)" }}
      >
        <Lock size={17} strokeWidth={2} />
      </Link>
    </div>
  );
}
