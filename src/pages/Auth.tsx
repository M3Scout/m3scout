import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoM3 from "@/assets/logo-m3.png";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const KEEP_LOGGED_IN_KEY = "m3_keep_logged_in";
const RED = "#E5173F";

// ─── SPOTLIGHT LOGO ───────────────────────────────────────────────────────────

function SpotlightLogo({
  mouseX,
  mouseY,
}: {
  mouseX: number;
  mouseY: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rel, setRel] = useState({ x: -999, y: -999 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setRel({ x: mouseX - rect.left, y: mouseY - rect.top });
  }, [mouseX, mouseY]);

  return (
    <div ref={containerRef} className="relative select-none" style={{ width: 340, maxWidth: "80vw" }}>
      {/* Base logo — dark/dim outline */}
      <img
        src={logoM3}
        alt="M3 Scout"
        draggable={false}
        className="w-full h-auto block"
        style={{ opacity: 0.12, filter: "brightness(0) invert(1)" }}
      />

      {/* Spotlight glow layer — orange gradient masked through logo pixels */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle 280px at ${rel.x}px ${rel.y}px, ${RED} 0%, #FF8C42 25%, rgba(255,107,53,0.3) 55%, transparent 70%)`,
          WebkitMaskImage: `url(${logoM3})`,
          maskImage: `url(${logoM3})`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          transition: "none",
        }}
      />

      {/* Ambient ambient bloom behind the logo */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle 200px at ${rel.x}px ${rel.y}px, rgba(255,107,53,0.07) 0%, transparent 70%)`,
          filter: "blur(24px)",
        }}
      />
    </div>
  );
}

// ─── MAIN AUTH PAGE ───────────────────────────────────────────────────────────

const Auth = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Form state
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(() => {
    try { return localStorage.getItem(KEEP_LOGGED_IN_KEY) !== "false"; }
    catch { return true; }
  });

  // Spotlight mouse tracking (page-level)
  const [mouse, setMouse] = useState({ x: -999, y: -999 });
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: e.clientX, y: e.clientY });
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !authLoading) {
      const from = (location.state as any)?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    }
  }, [user, authLoading, navigate, location]);

  // Show post-boot message
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem("m3_auth_boot_message");
      if (msg) { toast.error(msg); sessionStorage.removeItem("m3_auth_boot_message"); }
    } catch { /* ignore */ }
  }, []);

  // Persist checkbox preference
  const toggleKeepLoggedIn = () => {
    setKeepLoggedIn(prev => {
      const next = !prev;
      try { localStorage.setItem(KEEP_LOGGED_IN_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Register page-unload sign-out when keepLoggedIn = false
  useEffect(() => {
    if (keepLoggedIn) return;
    // Best-effort: sign out on tab close when user chose not to keep session
    const handler = () => { supabase.auth.signOut(); };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, [keepLoggedIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Preencha e-mail e senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        if (
          error.message.includes("Invalid login credentials") ||
          error.message.includes("invalid_credentials")
        ) {
          toast.error("E-mail ou senha incorretos. Verifique seus dados.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Confirme seu e-mail antes de entrar.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      // If user chose not to keep logged in, mark session as temporary
      if (!keepLoggedIn) {
        try { sessionStorage.setItem("m3_temp_session", "1"); } catch { /* ignore */ }
      }

      toast.success("Bem-vindo(a) de volta!");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#070910", fontFamily: "'Basis Grotesque Pro', sans-serif" }}
      >
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: RED }} />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row relative overflow-hidden"
      style={{ background: "#070910", fontFamily: "'Basis Grotesque Pro', sans-serif" }}
      onMouseMove={handleMouseMove}
    >
      {/* ── Ambient background glow ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-0 left-0 w-full h-full opacity-30"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 25% 50%, rgba(255,107,53,0.06) 0%, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.012]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "72px 72px",
          }}
        />
      </div>

      {/* ════════════════════════════════════════
          LEFT COLUMN — Logo / Branding
          ════════════════════════════════════════ */}
      <div
        className="hidden md:flex md:w-1/2 lg:w-[55%] flex-col items-center justify-center relative p-12 lg:p-16"
        style={{ opacity: 0, animation: "slideRightIn 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s forwards" }}
      >
        {/* Giant spotlight logo */}
        <SpotlightLogo mouseX={mouse.x} mouseY={mouse.y} />

        {/* Back link */}
        <a
          href="/"
          className="absolute bottom-8 left-10 text-xs uppercase tracking-[0.15em] transition-colors duration-200"
          style={{ color: "rgba(255,255,255,0.18)", fontWeight: 300 }}
          onMouseEnter={e => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.5)")}
          onMouseLeave={e => ((e.target as HTMLAnchorElement).style.color = "rgba(255,255,255,0.18)")}
        >
          ← Voltar para o site
        </a>
      </div>

      {/* ════════════════════════════════════════
          RIGHT COLUMN — Login Form
          ════════════════════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10 min-h-screen md:min-h-0">
        <div
          className="w-full"
          style={{
            maxWidth: 420,
            opacity: 0,
            animation: "fadeSlideIn 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s forwards",
          }}
        >
          {/* Mobile logo */}
          <div className="flex justify-center mb-10 md:hidden">
            <img src={logoM3} alt="M3 Scout" className="h-10 w-auto opacity-90" draggable={false} />
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-3xl sm:text-4xl text-white mb-2"
              style={{ fontWeight: 300, letterSpacing: "-0.02em", lineHeight: 1.15 }}
            >
              Bem-vindo(a)
            </h1>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.38)", fontWeight: 400 }}
            >
              Acesse sua conta e continue sua jornada conosco.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-[11px] uppercase tracking-[0.18em] mb-2"
                style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700 }}
              >
                Endereço de E-mail
              </label>
              <input
                id="auth-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email"
                className="w-full h-12 px-4 rounded-xl text-sm text-white outline-none transition-all duration-200"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  caretColor: RED,
                  fontWeight: 400,
                  fontFamily: "inherit",
                }}
                onFocus={e => { e.target.style.borderColor = `${RED}60`; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="auth-password"
                className="block text-[11px] uppercase tracking-[0.18em] mb-2"
                style={{ color: "rgba(255,255,255,0.45)", fontWeight: 700 }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-12 pl-4 pr-12 rounded-xl text-sm text-white outline-none transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    caretColor: RED,
                    fontWeight: 400,
                    fontFamily: "inherit",
                  }}
                  onFocus={e => { e.target.style.borderColor = `${RED}60`; e.target.style.background = "rgba(255,255,255,0.06)"; }}
                  onBlur={e  => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.background = "rgba(255,255,255,0.04)"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 transition-colors"
                  style={{ color: "rgba(255,255,255,0.28)" }}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye    className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {/* Keep logged in + Forgot password */}
            <div className="flex items-center justify-between">
              {/* Circular checkbox */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={keepLoggedIn}
                  onClick={toggleKeepLoggedIn}
                  className="relative flex-shrink-0 w-5 h-5 rounded-full transition-all duration-200 outline-none"
                  style={{
                    background: keepLoggedIn ? RED : "rgba(255,255,255,0.06)",
                    border: keepLoggedIn ? `2px solid ${RED}` : "2px solid rgba(255,255,255,0.15)",
                    boxShadow: keepLoggedIn ? `0 0 12px rgba(255,107,53,0.4)` : "none",
                  }}
                >
                  {keepLoggedIn && (
                    <svg
                      className="absolute inset-0 w-full h-full p-[3px]"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <span
                  className="text-xs transition-colors duration-150"
                  style={{ color: keepLoggedIn ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.35)", fontWeight: 400 }}
                >
                  Manter conectado
                </span>
              </label>

              {/* Forgot password */}
              <button
                type="button"
                className="text-xs transition-colors duration-150"
                style={{ color: "rgba(255,255,255,0.35)", fontWeight: 700 }}
                onMouseEnter={e => ((e.target as HTMLElement).style.color = RED)}
                onMouseLeave={e => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.35)")}
                onClick={() => toast.info("Entre em contato com o administrador para redefinir sua senha.")}
              >
                Esqueci a senha
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-14 flex items-center justify-center gap-2.5 rounded-full transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: loading ? "rgba(255,107,53,0.7)" : RED,
                color: "#000",
                fontSize: "1.05rem",
                fontWeight: 300,
                letterSpacing: "0.01em",
                boxShadow: loading ? "none" : "0 8px 32px rgba(255,107,53,0.25)",
                fontFamily: "inherit",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = "#FF7A45"); }}
              onMouseLeave={e => { if (!loading) (e.currentTarget.style.background = RED); }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando…
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            className="text-center text-[11px] mt-8"
            style={{ color: "rgba(255,255,255,0.15)", fontWeight: 300 }}
          >
            © {new Date().getFullYear()} M3 Agency. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
