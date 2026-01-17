import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { Shield, Camera, Trash2, Loader2, Save } from "lucide-react";
import logoM3Icon from "@/assets/logo-m3-icon.png";

export function TeamSettingsCard() {
  const {
    settings,
    isLoading,
    teamName,
    logoUrl,
    hasCustomLogo,
    updateSettings,
    uploadLogo,
    removeLogo,
  } = useTeamSettings();

  const [editedName, setEditedName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = editedName !== null ? editedName : teamName;
  const hasChanges = editedName !== null && editedName !== teamName;

  const handleSave = async () => {
    if (editedName !== null && editedName !== teamName) {
      await updateSettings.mutateAsync({ team_name: editedName });
      setEditedName(null);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return;
    }

    await uploadLogo.mutateAsync(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    await removeLogo.mutateAsync();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Time Principal
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Time Principal
        </CardTitle>
        <CardDescription>
          Configurações do time principal exibido nos jogos ao vivo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Section */}
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/50 flex items-center justify-center overflow-hidden">
              <img
                src={logoUrl}
                alt={teamName}
                className="w-16 h-16 object-contain"
              />
            </div>
            {hasCustomLogo && (
              <div className="absolute -top-1 -right-1">
                <span className="flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium">Logo do Time</p>
            <p className="text-xs text-muted-foreground">
              {hasCustomLogo 
                ? "Logo personalizado ativo" 
                : "Usando logo padrão M3"}
            </p>
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleLogoUpload}
                accept="image/*"
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadLogo.isPending}
              >
                {uploadLogo.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {hasCustomLogo ? "Trocar" : "Enviar"}
              </Button>
              {hasCustomLogo && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={removeLogo.isPending}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Name Section */}
        <div className="space-y-2">
          <Label htmlFor="teamName">Nome do Time</Label>
          <Input
            id="teamName"
            value={displayName}
            onChange={(e) => setEditedName(e.target.value)}
            placeholder="Nome do time principal"
            className="input-dark"
          />
          <p className="text-xs text-muted-foreground">
            Este nome aparecerá nos cards e headers dos jogos ao vivo
          </p>
        </div>

        {/* Preview */}
        <div className="rounded-lg border border-zinc-700 bg-zinc-800/30 p-4">
          <p className="text-xs text-muted-foreground mb-2">Prévia</p>
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt={displayName}
              className="w-10 h-10 object-contain"
            />
            <div>
              <p className="font-bold text-zinc-100">{displayName}</p>
              <p className="text-sm text-zinc-400">vs Adversário FC</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
          variant="gradient"
          className="w-full"
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Salvar Alterações
        </Button>
      </CardContent>
    </Card>
  );
}
