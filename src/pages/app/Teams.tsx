import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Plus,
  Shield,
  Upload,
  X,
  Loader2,
  MoreVertical,
  Trash2,
  Edit2,
  Palette,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Team {
  id: string;
  name: string;
  short_name: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  created_at: string;
}

export default function Teams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#22c55e");
  const [secondaryColor, setSecondaryColor] = useState("#ffffff");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Fetch teams
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Team[];
    },
  });

  // Handle logo upload
  const handleLogoUpload = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `team-${Date.now()}.${fileExt}`;
      const filePath = `teams/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-logos")
        .getPublicUrl(filePath);

      setLogoUrl(urlData.publicUrl);
      toast.success("Logo carregado!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Nome é obrigatório");
      
      const teamData = {
        name: name.trim(),
        short_name: shortName.trim() || null,
        logo_url: logoUrl || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        created_by: user?.id,
      };

      if (editingTeam) {
        const { error } = await supabase
          .from("teams")
          .update(teamData)
          .eq("id", editingTeam.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("teams").insert(teamData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success(editingTeam ? "Time atualizado!" : "Time criado!");
      handleCloseDialog();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao salvar time");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Time excluído!");
      setDeleteTeam(null);
    },
    onError: () => {
      toast.error("Erro ao excluir time");
    },
  });

  const handleOpenCreate = () => {
    setEditingTeam(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (team: Team) => {
    setEditingTeam(team);
    setName(team.name);
    setShortName(team.short_name || "");
    setLogoUrl(team.logo_url || "");
    setPrimaryColor(team.primary_color);
    setSecondaryColor(team.secondary_color);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTeam(null);
    resetForm();
  };

  const resetForm = () => {
    setName("");
    setShortName("");
    setLogoUrl("");
    setPrimaryColor("#22c55e");
    setSecondaryColor("#ffffff");
  };

  return (
    <div className="container max-w-4xl py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Times</h1>
            <p className="text-sm text-zinc-500">Cadastre times para reutilizar na criação de jogos</p>
          </div>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Time
        </Button>
      </div>

      {/* Teams Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 rounded-xl bg-zinc-900/40 border border-zinc-800/60">
          <Shield className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-zinc-300 mb-1">Nenhum time cadastrado</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Cadastre times para usar rapidamente ao criar jogos
          </p>
          <Button onClick={handleOpenCreate} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Criar primeiro time
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {teams.map((team, index) => (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="group relative"
              >
                <div
                  className="rounded-xl border bg-zinc-900/60 p-4 hover:bg-zinc-900/80 transition-colors"
                  style={{
                    borderColor: `${team.primary_color}30`,
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {team.logo_url ? (
                        <img
                          src={team.logo_url}
                          alt={team.name}
                          className="w-12 h-12 rounded-lg object-contain bg-zinc-800"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold"
                          style={{
                            backgroundColor: `${team.primary_color}20`,
                            color: team.primary_color,
                          }}
                        >
                          {team.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-zinc-100">{team.name}</h3>
                        {team.short_name && (
                          <p className="text-xs text-zinc-500">{team.short_name}</p>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                        <DropdownMenuItem onClick={() => handleOpenEdit(team)}>
                          <Edit2 className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTeam(team)}
                          className="text-red-400 focus:text-red-400"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Color indicators */}
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                      <Palette className="w-3 h-3" />
                      Cores:
                    </div>
                    <div
                      className="w-5 h-5 rounded-full border-2 border-zinc-700"
                      style={{ backgroundColor: team.primary_color }}
                      title="Cor primária"
                    />
                    <div
                      className="w-5 h-5 rounded-full border-2 border-zinc-700"
                      style={{ backgroundColor: team.secondary_color }}
                      title="Cor secundária"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              {editingTeam ? "Editar Time" : "Novo Time"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Logo Upload */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">Logo do Time</Label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" width={40} height={40} />
                  ) : (
                    <Shield className="w-6 h-6 text-zinc-600" />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={isUploadingLogo}
                    className="gap-2"
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="h-3 w-3" />
                    )}
                    Upload
                  </Button>
                  {logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl("")}
                      className="text-xs text-zinc-500 hover:text-red-400 gap-1"
                    >
                      <X className="h-3 w-3" />
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs text-zinc-400">
                Nome do Time <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: São Gabriel EC"
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Short Name */}
            <div className="space-y-2">
              <Label htmlFor="shortName" className="text-xs text-zinc-400">
                Sigla / Nome Curto
              </Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="Ex: SGE"
                maxLength={5}
                className="bg-zinc-800 border-zinc-700"
              />
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primaryColor" className="text-xs text-zinc-400">
                  Cor Primária
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor" className="text-xs text-zinc-400">
                  Cor Secundária
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    id="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
              <p className="text-[10px] text-zinc-500 mb-2">Preview:</p>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img src={logoUrl} alt="Preview" className="w-10 h-10 object-contain" width={40} height={40} />
                ) : (
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center font-bold"
                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                  >
                    {name.charAt(0) || "?"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-zinc-200">{name || "Nome do Time"}</p>
                  {shortName && <p className="text-xs text-zinc-500">{shortName}</p>}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={!name.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingTeam ? "Salvar" : "Criar Time"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTeam} onOpenChange={() => setDeleteTeam(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir time?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Tem certeza que deseja excluir "{deleteTeam?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTeam && deleteMutation.mutate(deleteTeam.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
