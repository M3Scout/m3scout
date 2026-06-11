import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCompetitionSelect } from "@/components/ui/searchable-competition-select";
import { toast } from "sonner";
import { 
  Radio, Play, Loader2, MapPin, Clock, Trophy, Calendar, 
  FileText, Zap, ArrowRight, Shield, Upload, X, Image
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function LiveMatchNew() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { teamName: globalTeamName, logoUrl: globalLogoUrl } = useTeamSettings();
  
  const currentYear = new Date().getFullYear();
  const [seasonYear, setSeasonYear] = useState(currentYear);
  const [competitionId, setCompetitionId] = useState<string>("");
  const [opponentName, setOpponentName] = useState("");
  const [venue, setVenue] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(90);
  const [notes, setNotes] = useState("");
  
  // Match date and time - default to today with current time rounded to nearest 15 min
  const getDefaultTime = () => {
    const now = new Date();
    const minutes = Math.round(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes, 0, 0);
    return now.toTimeString().slice(0, 5); // "HH:MM"
  };
  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [matchTime, setMatchTime] = useState(getDefaultTime);
  
  // Team selection from registered teams
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  
  // Team customization (manual override)
  const [teamNameDisplay, setTeamNameDisplay] = useState("");
  const [teamLogoUrl, setTeamLogoUrl] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Opponent logo
  const [opponentLogoUrl, setOpponentLogoUrl] = useState("");
  const [isUploadingOpponentLogo, setIsUploadingOpponentLogo] = useState(false);
  const opponentLogoInputRef = useRef<HTMLInputElement>(null);

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch active competitions
  const { data: competitions, isLoading: loadingCompetitions } = useQuery({
    queryKey: ["competitions-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("competitions")
        .select("id, name, display_name, type, tier")
        .eq("is_active", true)
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch registered teams
  const { data: teams, isLoading: loadingTeams } = useQuery({
    queryKey: ["teams"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, short_name, logo_url, primary_color")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // When a team is selected, populate the fields
  useEffect(() => {
    if (selectedTeamId && teams) {
      const team = teams.find(t => t.id === selectedTeamId);
      if (team) {
        setTeamNameDisplay(team.name);
        setTeamLogoUrl(team.logo_url || "");
      }
    } else if (selectedTeamId === "") {
      // Reset to empty when "custom" is selected
      setTeamNameDisplay("");
      setTeamLogoUrl("");
    }
  }, [selectedTeamId, teams]);

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
      const fileName = `match-team-${Date.now()}.${fileExt}`;
      const filePath = `match-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-logos")
        .getPublicUrl(filePath);

      setTeamLogoUrl(urlData.publicUrl);
      toast.success("Logo carregado!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setTeamLogoUrl("");
  };

  // Handle opponent logo upload
  const handleOpponentLogoUpload = async (file: File) => {
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5MB)");
      return;
    }

    setIsUploadingOpponentLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `opponent-${Date.now()}.${fileExt}`;
      const filePath = `match-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("team-logos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("team-logos")
        .getPublicUrl(filePath);

      setOpponentLogoUrl(urlData.publicUrl);
      toast.success("Logo do adversário carregado!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setIsUploadingOpponentLogo(false);
    }
  };

  const handleRemoveOpponentLogo = () => {
    setOpponentLogoUrl("");
  };

  // Create match mutation (draft mode)
  const createMatch = useMutation({
    mutationFn: async (startImmediately: boolean) => {
      if (!user) throw new Error("Usuário não autenticado");
      
      // Validate
      const newErrors: Record<string, string> = {};
      if (!competitionId) newErrors.competition = "Selecione uma competição";
      if (!opponentName.trim()) newErrors.opponent = "Informe o adversário";
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        throw new Error("Preencha os campos obrigatórios");
      }

      // Combine date and time into a proper timestamp
      const matchDateTime = new Date(`${matchDate}T${matchTime}:00`);
      
      // Always create match in draft status first
      // The clock will only start when user explicitly clicks "Iniciar"
      const { data, error } = await supabase
        .from("matches")
        .insert({
          created_by: user.id,
          competition_id: competitionId,
          season_year: seasonYear,
          opponent_name: opponentName.trim(),
          match_date: matchDateTime.toISOString(),
          venue: venue.trim() || null,
          duration_minutes: durationMinutes,
          notes: notes.trim() || null,
          status: "draft", // Always start as draft - RPC start_first_half will set to live
          // Explicitly set timer fields to ensure clean state
          clock_status: "stopped",
          half: 1,
          elapsed_seconds_in_half: 0,
          half_start_time: null,
          match_start_time: null,
          // Team reference (if selected from registered teams)
          home_team_id: selectedTeamId && selectedTeamId !== "custom" ? selectedTeamId : null,
          // Team customization - manual override values
          team_name_display: teamNameDisplay.trim() || null,
          team_logo_url: teamLogoUrl || null,
          opponent_logo_url: opponentLogoUrl || null,
        })
        .select("id")
        .limit(1);

      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) throw new Error("Falha ao criar jogo");
      return { id: row.id, startImmediately };
    },
    onSuccess: (data) => {
      if (data.startImmediately) {
        toast.success("Jogo iniciado! Modo ao vivo ativado.");
      } else {
        toast.success("Jogo criado em modo pré-jogo.");
      }
      navigate(`/dashboard/aovivo/${data.id}`);
    },
    onError: (error) => {
      if (error.message !== "Preencha os campos obrigatórios") {
        toast.error(error.message || "Erro ao criar jogo");
      }
    },
  });

  const handleCreate = (startImmediately: boolean) => {
    setErrors({});
    createMatch.mutate(startImmediately);
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const seasonOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const isFormValid = competitionId && opponentName.trim();

  // Display values: custom or fallback to global
  const displayTeamName = teamNameDisplay.trim() || globalTeamName;
  const displayLogoUrl = teamLogoUrl || globalLogoUrl;

  return (
    <div className="container max-w-2xl py-6 space-y-6">
      {/* Page Header */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center border border-green-500/20">
            <Radio className="h-6 w-6 text-green-400" />
          </div>
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Novo Jogo Ao Vivo</h1>
          <p className="text-sm text-zinc-500">
            Configure o jogo e registre estatísticas em tempo real
          </p>
        </div>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-sm"
      >
        {/* Card glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-transparent pointer-events-none" />
        
        {/* Card Header */}
        <div className="relative px-6 py-5 border-b border-zinc-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/60 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">Informações do Jogo</h2>
              <p className="text-xs text-zinc-500">Preencha os dados para começar</p>
            </div>
          </div>
        </div>
        
        {/* Card Body */}
        <div className="relative p-6 space-y-6">
          {/* Team Selection Section */}
          <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Shield className="h-4 w-4 text-emerald-400" />
              Time Principal
            </div>
            
            {/* Team Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-zinc-400">
                Selecionar Time Cadastrado
              </Label>
              <Select
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
                disabled={loadingTeams}
              >
                <SelectTrigger className="h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200">
                  <SelectValue placeholder="Escolha um time ou personalize abaixo..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  <SelectItem value="custom">
                    <span className="flex items-center gap-2">
                      <Upload className="h-3.5 w-3.5 text-zinc-500" />
                      Personalizar manualmente
                    </span>
                  </SelectItem>
                  {teams?.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      <span className="flex items-center gap-2">
                        {team.logo_url ? (
                          <img src={team.logo_url} alt="" className="w-4 h-4 object-contain" width={16} height={16} />
                        ) : (
                          <div 
                            className="w-4 h-4 rounded" 
                            style={{ backgroundColor: team.primary_color || '#22c55e' }} 
                          />
                        )}
                        {team.name}
                        {team.short_name && (
                          <span className="text-zinc-500 text-xs">({team.short_name})</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-500">
                Selecione um time cadastrado ou personalize manualmente
              </p>
            </div>

            {/* Manual customization fields (always visible for override) */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-zinc-700/20">
              {/* Team Name */}
              <div className="space-y-2">
                <Label 
                  htmlFor="teamName" 
                  className="text-xs font-medium text-zinc-400"
                >
                  Nome do Time
                </Label>
                <Input
                  id="teamName"
                  placeholder={globalTeamName}
                  value={teamNameDisplay}
                  onChange={(e) => setTeamNameDisplay(e.target.value)}
                  className="h-10 bg-zinc-900/60 border-zinc-700/50 rounded-lg text-zinc-200 placeholder:text-zinc-600"
                />
                <p className="text-[10px] text-zinc-500">
                  Deixe vazio para usar: {globalTeamName}
                </p>
              </div>

              {/* Team Logo */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">
                  Logo do Time
                </Label>
                <div className="flex items-center gap-3">
                  {/* Logo preview */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center overflow-hidden">
                    {displayLogoUrl ? (
                      <img 
                        src={displayLogoUrl} 
                        alt="Logo" 
                        className="w-full h-full object-contain" width={48} height={48}
                      />
                    ) : (
                      <Image className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  
                  {/* Upload/Remove buttons */}
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
                      className="h-8 text-xs gap-1.5"
                    >
                      {isUploadingLogo ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Upload
                    </Button>
                    {teamLogoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="h-6 text-[10px] text-zinc-500 hover:text-red-400 gap-1 px-2"
                      >
                        <X className="h-3 w-3" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div className="pt-3 border-t border-zinc-700/30">
              <p className="text-[10px] text-zinc-500 mb-2">Preview do card:</p>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-700/30">
                {/* Home team logo */}
                {displayLogoUrl ? (
                  <img 
                    src={displayLogoUrl} 
                    alt={displayTeamName} 
                    className="w-8 h-8 object-contain rounded bg-zinc-800/50 p-0.5" width={32} height={32}
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-emerald-400" />
                  </div>
                )}
                
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium text-zinc-200">
                    {displayTeamName} <span className="text-zinc-500 font-normal">vs</span> {opponentName || "Adversário"}
                  </p>
                </div>
                
                {/* Opponent logo */}
                {opponentLogoUrl ? (
                  <img 
                    src={opponentLogoUrl} 
                    alt={opponentName || "Adversário"} 
                    className="w-8 h-8 object-contain rounded bg-zinc-800/50 p-0.5" width={32} height={32}
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center">
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 1: Season + Competition */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label 
                htmlFor="season" 
                className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                Temporada
              </Label>
              <Select
                value={seasonYear.toString()}
                onValueChange={(v) => setSeasonYear(parseInt(v))}
              >
                <SelectTrigger 
                  id="season"
                  className="h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800">
                  {seasonOptions.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="competition" 
                className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
              >
                <Trophy className="h-3.5 w-3.5" />
                Competição <span className="text-red-400">*</span>
              </Label>
              <SearchableCompetitionSelect
                competitions={competitions || []}
                value={competitionId}
                onValueChange={(v) => { setCompetitionId(v); clearError("competition"); }}
                disabled={loadingCompetitions}
                placeholder="Selecione a competição..."
                triggerClassName={cn(
                  "h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all",
                  errors.competition && "border-red-500/50 focus:ring-red-500/30 focus:border-red-500/50"
                )}
              />
              {errors.competition && (
                <p className="text-xs text-red-400 mt-1">{errors.competition}</p>
              )}
            </div>
          </div>

          {/* Row 2: Opponent Section */}
          <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/30 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Zap className="h-4 w-4 text-red-400" />
              Adversário
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Opponent Name */}
              <div className="space-y-2">
                <Label 
                  htmlFor="opponent"
                  className="text-xs font-medium text-zinc-400"
                >
                  Nome do Time <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="opponent"
                  placeholder="Nome do time adversário"
                  value={opponentName}
                  onChange={(e) => { setOpponentName(e.target.value); clearError("opponent"); }}
                  className={cn(
                    "h-10 bg-zinc-900/60 border-zinc-700/50 rounded-lg text-zinc-200 placeholder:text-zinc-600",
                    errors.opponent && "border-red-500/50"
                  )}
                />
                {errors.opponent && (
                  <p className="text-xs text-red-400 mt-1">{errors.opponent}</p>
                )}
              </div>

              {/* Opponent Logo */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-zinc-400">
                  Logo do Adversário
                </Label>
                <div className="flex items-center gap-3">
                  {/* Logo preview */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700/50 flex items-center justify-center overflow-hidden">
                    {opponentLogoUrl ? (
                      <img 
                        src={opponentLogoUrl} 
                        alt="Logo adversário" 
                        className="w-full h-full object-contain" width={48} height={48}
                      />
                    ) : (
                      <Image className="w-5 h-5 text-zinc-600" />
                    )}
                  </div>
                  
                  {/* Upload/Remove buttons */}
                  <div className="flex flex-col gap-1">
                    <input
                      ref={opponentLogoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleOpponentLogoUpload(e.target.files[0])}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => opponentLogoInputRef.current?.click()}
                      disabled={isUploadingOpponentLogo}
                      className="h-8 text-xs gap-1.5"
                    >
                      {isUploadingOpponentLogo ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                      Upload
                    </Button>
                    {opponentLogoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveOpponentLogo}
                        className="h-6 text-[10px] text-zinc-500 hover:text-red-400 gap-1 px-2"
                      >
                        <X className="h-3 w-3" />
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Date + Time */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label 
                htmlFor="matchDate" 
                className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" />
                Data do Jogo
              </Label>
              <Input
                id="matchDate"
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="matchTime" 
                className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Horário
              </Label>
              <Input
                id="matchTime"
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all"
              />
            </div>
          </div>

          {/* Row 4: Venue + Duration */}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label 
                htmlFor="venue" 
                className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
              >
                <MapPin className="h-3.5 w-3.5" />
                Local
              </Label>
              <Input
                id="venue"
                placeholder="Estádio / Campo"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all"
              />
            </div>

            <div className="space-y-2">
              <Label 
                htmlFor="duration" 
                className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                Duração (min)
              </Label>
              <Input
                id="duration"
                type="number"
                min={1}
                max={150}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 90)}
                className="h-11 bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all"
              />
            </div>
          </div>

          {/* Row 4: Notes */}
          <div className="space-y-2">
            <Label 
              htmlFor="notes"
              className="text-xs font-medium text-zinc-400 flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Observações
            </Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o jogo, condições climáticas, formação tática..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-zinc-900/60 border-zinc-700/50 rounded-xl text-zinc-200 placeholder:text-zinc-600 hover:border-zinc-600/60 focus:ring-1 focus:ring-green-500/30 focus:border-green-500/50 transition-all resize-none"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-zinc-800/40">
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Secondary: Create in pre-game mode */}
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => handleCreate(false)}
                disabled={createMatch.isPending || !isFormValid}
                className="h-12 gap-2 border-zinc-700 text-zinc-300 hover:bg-zinc-800/60 hover:border-zinc-600 rounded-xl transition-all"
              >
                {createMatch.isPending && !createMatch.variables ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                Criar Jogo
              </Button>
              
              {/* Primary: Create and start immediately */}
              <Button
                type="button"
                variant="success"
                size="lg"
                onClick={() => handleCreate(true)}
                disabled={createMatch.isPending || !isFormValid}
                className="h-12 gap-2 rounded-xl font-semibold transition-all"
              >
                {createMatch.isPending && createMatch.variables ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Criar e Iniciar
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            
            <p className="text-[11px] text-zinc-600 text-center mt-3">
              <strong className="text-zinc-500">Criar Jogo:</strong> modo pré-jogo (monte escalação antes)
              <span className="mx-2">•</span>
              <strong className="text-zinc-500">Criar e Iniciar:</strong> inicia imediatamente
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
