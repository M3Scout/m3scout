import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { 
  Settings as SettingsIcon, 
  User, 
  Shield, 
  Bell, 
  Loader2,
  Save,
  Mail,
  Calendar,
  Camera,
  Trash2,
  RefreshCw,
  Database,
  CheckCircle,
  AlertTriangle,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { format } from "date-fns";
import { recalculateAllAttributeScores } from "@/lib/attributeScores";
import { ptBR } from "date-fns/locale";

function ThemeCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const themes = [
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "light", label: "Claro", icon: Sun },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="h-5 w-5" />
          Aparência
        </CardTitle>
        <CardDescription>
          Escolha o tema do painel
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className={`
                flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200
                ${theme === value 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }
              `}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, isAdmin, isScout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [recalculatingAttributes, setRecalculatingAttributes] = useState(false);
  const [recalculateResult, setRecalculateResult] = useState<{
    total_players: number;
    ratings_changed: number;
    new_ratings: number;
  } | null>(null);
  const [attributeRecalculateResult, setAttributeRecalculateResult] = useState<{
    players_processed: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<{
    full_name: string | null;
    avatar_url: string | null;
  }>({
    full_name: "",
    avatar_url: null,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setProfile({
        full_name: data.full_name || "",
        avatar_url: data.avatar_url,
      });
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erro ao salvar perfil");
      console.error(error);
    } else {
      toast.success("Perfil atualizado com sucesso");
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setUploadingAvatar(true);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("player-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("player-photos")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: avatarUrl });
      toast.success("Foto atualizada com sucesso");
    } catch (error: any) {
      console.error("Error uploading avatar:", error);
      toast.error("Erro ao enviar foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile.avatar_url) return;

    setUploadingAvatar(true);

    try {
      // Extract file path from URL
      const urlParts = profile.avatar_url.split("/player-photos/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1].split("?")[0];
        await supabase.storage.from("player-photos").remove([filePath]);
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("user_id", user.id);

      if (error) throw error;

      setProfile({ ...profile, avatar_url: null });
      toast.success("Foto removida");
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast.error("Erro ao remover foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRecalculateRatings = async () => {
    setRecalculating(true);
    setRecalculateResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recalculate-ratings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao recalcular");
      }

      setRecalculateResult(result.summary);
      toast.success(
        `Recálculo concluído: ${result.summary.total_players} atletas processados`
      );
    } catch (error: unknown) {
      console.error("Error recalculating:", error);
      const errorMessage = error instanceof Error ? error.message : "Erro ao recalcular notas";
      toast.error(errorMessage);
    } finally {
      setRecalculating(false);
    }
  };

  const handleRecalculateAttributes = async () => {
    setRecalculatingAttributes(true);
    setAttributeRecalculateResult(null);
    try {
      const result = await recalculateAllAttributeScores();
      if (result.success) {
        setAttributeRecalculateResult({ players_processed: result.players.length });
        toast.success(`Atributos recalculados para ${result.players.length} atletas`);
      } else {
        toast.error(result.error || "Erro ao recalcular atributos");
      }
    } catch (error) {
      console.error("Error recalculating attributes:", error);
      toast.error("Erro ao recalcular atributos");
    } finally {
      setRecalculatingAttributes(false);
    }
  };

  const getRoleBadge = () => {
    if (isAdmin) {
      return <Badge className="bg-red-500 text-white">Admin</Badge>;
    }
    if (isScout) {
      return <Badge className="bg-blue-500 text-white">Scout</Badge>;
    }
    return <Badge variant="secondary">Membro</Badge>;
  };

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || "U";
    return name.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-accent" />
          Configurações
        </h1>
        <p className="text-muted-foreground">
          Gerencie seu perfil e preferências
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Perfil
            </CardTitle>
            <CardDescription>
              Suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {getInitials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                {uploadingAvatar && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-full">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <p className="font-medium text-lg">
                  {profile.full_name || "Sem nome"}
                </p>
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                  >
                    <Camera className="h-4 w-4" />
                    Alterar foto
                  </Button>
                  {profile.avatar_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  value={profile.full_name || ""}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  placeholder="Seu nome completo"
                  className="input-dark"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  className="input-dark opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  O email não pode ser alterado
                </p>
              </div>
            </div>

            <Button 
              onClick={handleSaveProfile} 
              disabled={saving}
              variant="gradient"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        {/* Account Info Card */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Conta
              </CardTitle>
              <CardDescription>
                Informações da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Função</p>
                <div>{getRoleBadge()}</div>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Membro desde
                </p>
                <p className="text-sm font-medium">
                  {user?.created_at 
                    ? format(new Date(user.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : "-"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          <ThemeCard />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Preferências de notificação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Em breve você poderá configurar suas preferências de notificação.
              </p>
            </CardContent>
          </Card>

          {/* Admin Tools */}
          {isAdmin && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Ferramentas Admin
                </CardTitle>
                <CardDescription>
                  Operações administrativas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Recalcula a nota automática (V2) de todos os atletas ativos com base nas estatísticas atuais.
                  </p>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={recalculating}
                        className="w-full"
                      >
                        {recalculating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Recalculando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Recalcular Notas (V2)
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-amber-500" />
                          Confirmar Recálculo
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>
                            Esta ação irá recalcular a nota automática de <strong>todos os atletas ativos</strong> usando o algoritmo V2.
                          </p>
                          <p>
                            O processo pode levar alguns segundos dependendo da quantidade de atletas.
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRecalculateRatings}>
                          Continuar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Result feedback */}
                  {recalculateResult && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-500">
                          Recálculo Concluído
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{recalculateResult.total_players}</p>
                          <p className="text-xs text-muted-foreground">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-primary">{recalculateResult.ratings_changed}</p>
                          <p className="text-xs text-muted-foreground">Alterados</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-accent">{recalculateResult.new_ratings}</p>
                          <p className="text-xs text-muted-foreground">Novos</p>
                        </div>
                      </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Recalculate Radar Attributes */}
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Recalcula os atributos do radar (ATA/TÉC/DEF/TÁT/CRI) de todos os atletas.
                    </p>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={recalculatingAttributes}
                          className="w-full"
                        >
                          {recalculatingAttributes ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Recalculando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4" />
                              Recalcular Atributos (Radar)
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Confirmar Recálculo
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação irá recalcular os 5 atributos do radar para todos os atletas com estatísticas registradas.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={handleRecalculateAttributes}>
                            Continuar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {attributeRecalculateResult && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-500">
                            {attributeRecalculateResult.players_processed} atletas processados
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }