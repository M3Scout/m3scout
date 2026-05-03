import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, ArrowLeft, Loader2 } from "lucide-react";
import logoM3 from "@/assets/logo-m3.png";
import { useState } from "react";

export default function PendingAccess() {
  const { signOut, user } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    console.log("[AUTH] signOut start");
    setLoggingOut(true);
    
    try {
      await signOut();
      console.log("[AUTH] signOut success");
    } catch (error) {
      console.error("[AUTH] signOut error:", error);
    } finally {
      // Fallback garantido - força navegação mesmo se signOut falhar
      console.log("[AUTH] signOut redirect fallback");
      window.location.href = "/app/auth";
    }
  };

  const handleBack = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-950 to-black flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logoM3} alt="M3 Agency" className="h-10 w-auto" width={100} height={40} />
        </div>

        {/* Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center backdrop-blur-sm">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
            <Clock className="w-8 h-8 text-amber-500" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-semibold text-white mb-2">
            Aguardando Liberação
          </h1>

          {/* Description */}
          <p className="text-zinc-400 mb-2">
            Sua conta foi criada com sucesso!
          </p>
          <p className="text-zinc-500 text-sm mb-6">
            Um administrador precisa liberar seu acesso ao sistema. 
            Você receberá uma notificação quando sua conta estiver ativa.
          </p>

          {/* User email */}
          {user?.email && (
            <div className="bg-zinc-800/50 rounded-lg px-4 py-3 mb-6">
              <p className="text-xs text-zinc-500 mb-1">Conta registrada</p>
              <p className="text-sm text-zinc-300 font-medium">{user.email}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleLogout}
              variant="default"
              className="w-full gap-2"
              disabled={loggingOut}
            >
              {loggingOut ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              {loggingOut ? "Saindo..." : "Sair da Conta"}
            </Button>
            
            <Button
              onClick={handleBack}
              variant="ghost"
              className="w-full gap-2 text-zinc-400 hover:text-zinc-200"
              disabled={loggingOut}
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Site
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-zinc-600 text-xs mt-6">
          Dúvidas? Entre em contato com o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
