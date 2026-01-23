import { AlertTriangle, User, Mail } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PlayerAccountUnlinkedProps {
  userEmail?: string;
}

/**
 * Component shown when a player role user has no linked athlete.
 * This prevents them from seeing any data until an admin links their account.
 */
export function PlayerAccountUnlinked({ userEmail }: PlayerAccountUnlinkedProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-zinc-900/50 border-zinc-800/50">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <CardTitle className="text-xl">Conta Não Vinculada</CardTitle>
          <CardDescription className="text-zinc-400">
            Sua conta de jogador ainda não está vinculada a um perfil de atleta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-zinc-800/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                <User className="w-5 h-5 text-zinc-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-200">Perfil de Jogador</p>
                <p className="text-xs text-zinc-500">Aguardando vinculação</p>
              </div>
            </div>
            {userEmail && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-700/50 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{userEmail}</p>
                  <p className="text-xs text-zinc-500">Seu email de acesso</p>
                </div>
              </div>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-sm text-zinc-400">
              Entre em contato com o administrador do sistema para vincular sua conta ao seu perfil de atleta.
            </p>
          </div>

          <div className="pt-2">
            <Button 
              variant="outline" 
              className="w-full bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-700/50"
              onClick={() => window.location.reload()}
            >
              Atualizar página
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
