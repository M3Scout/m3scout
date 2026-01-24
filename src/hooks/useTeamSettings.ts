import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoM3Icon from "@/assets/logo-m3-icon.png";

export interface TeamSettings {
  id: string;
  team_name: string;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

// Default values when no settings exist
const DEFAULT_TEAM_NAME = "M3 Scouting";
const DEFAULT_LOGO = logoM3Icon;

export function useTeamSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["team-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_settings")
        .select("*")
        .limit(1);

      if (error) throw error;
      // Handle 0..N rows - pick first or null
      const row = Array.isArray(data) ? data[0] ?? null : null;
      return row as TeamSettings | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<Pick<TeamSettings, "team_name" | "logo_url">>) => {
      // Get the current settings ID (handle 0..N rows)
      const { data: currentRows } = await supabase
        .from("team_settings")
        .select("id")
        .limit(1);

      const current = Array.isArray(currentRows) ? currentRows[0] ?? null : null;

      if (current) {
        // Update existing
        const { data, error } = await supabase
          .from("team_settings")
          .update(updates)
          .eq("id", current.id)
          .select()
          .limit(1);

        if (error) throw error;
        return Array.isArray(data) ? data[0] ?? null : null;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("team_settings")
          .insert({
            team_name: updates.team_name || DEFAULT_TEAM_NAME,
            logo_url: updates.logo_url || null,
          })
          .select()
          .limit(1);

        if (error) throw error;
        return Array.isArray(data) ? data[0] ?? null : null;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-settings"] });
      toast.success("Configurações do time atualizadas!");
    },
    onError: (error) => {
      console.error("Error updating team settings:", error);
      toast.error("Erro ao atualizar configurações");
    },
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const fileExt = file.name.split(".").pop();
      const fileName = `team-logo-${Date.now()}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("team-logos")
        .getPublicUrl(uploadData.path);

      // Update settings with new logo URL
      await updateSettings.mutateAsync({ logo_url: urlData.publicUrl });

      return urlData.publicUrl;
    },
    onError: (error) => {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload do logo");
    },
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      await updateSettings.mutateAsync({ logo_url: null });
    },
  });

  // Computed values for easy consumption
  const teamName = settings?.team_name || DEFAULT_TEAM_NAME;
  const logoUrl = settings?.logo_url || DEFAULT_LOGO;
  const hasCustomLogo = !!settings?.logo_url;

  return {
    settings,
    isLoading,
    error,
    teamName,
    logoUrl,
    hasCustomLogo,
    updateSettings,
    uploadLogo,
    removeLogo,
  };
}
