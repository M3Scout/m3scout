import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";

interface MobilePageHeaderProps {
  title: string;
}

export function MobilePageHeader({ title }: MobilePageHeaderProps) {
  const { user } = useAuth();

  const initial = (() => {
    if (!user) return "";
    const name =
      (user.user_metadata as { name?: string; full_name?: string } | null)?.name ??
      (user.user_metadata as { full_name?: string } | null)?.full_name ??
      user.email ??
      "";
    return name.trim().charAt(0).toUpperCase();
  })();

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

      {user && (
        <Link
          to="/dashboard"
          className="flex items-center"
          style={{ paddingRight: "clamp(24px, 5.625vw, 72px)" }}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{
              width: 32,
              height: 32,
              background: "#353535",
              color: "#ffffff",
              fontFamily: "'Basis Grotesque Pro', sans-serif",
              fontWeight: 600,
              fontSize: 14,
              letterSpacing: "-0.01em",
            }}
          >
            {initial}
          </span>
        </Link>
      )}
    </div>
  );
}
