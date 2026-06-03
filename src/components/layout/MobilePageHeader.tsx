import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";

interface MobilePageHeaderProps {
  title: string;
}

export function MobilePageHeader({ title }: MobilePageHeaderProps) {
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 border-b"
      style={{
        height: "52px",
        background: "#141414",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      {/* Left: back to home */}
      <Link to="/" className="flex items-center justify-center w-9 h-9 -ml-1 text-white/60 hover:text-white transition-colors">
        <ArrowLeft size={20} strokeWidth={2} />
      </Link>

      {/* Center: page title */}
      <span
        style={{
          fontFamily: "'Basis Grotesque Pro', sans-serif",
          fontWeight: 600,
          fontSize: 17,
          color: "#F2EDE4",
          letterSpacing: "-0.01em",
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
        }}
      >
        {title}
      </span>

      {/* Right: restricted area */}
      <Link to="/dashboard/auth" className="flex items-center justify-center w-9 h-9 -mr-1 text-white/60 hover:text-white transition-colors">
        <Lock size={17} strokeWidth={2} />
      </Link>
    </div>
  );
}
