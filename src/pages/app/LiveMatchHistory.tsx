import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { LiveMatchCard } from "@/components/live-match/LiveMatchCard";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { toast } from "sonner";
import {
  Radio,
  Plus,
  Calendar,
  Trophy,
  MapPin,
  Clock,
  CheckCircle2,
  Pause,
  FileText,
  Trash2,
  Pencil,
  MoreVertical,
  Eye,
  Play,
  Wifi,
  Activity,
  Search,
  Upload,
  X,
  Image,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MatchStatus = "draft" | "live" | "finished" | "applied";

interface MatchWithCompetition {
  id: string;
  opponent_name: string;
  match_date: string;
  status: MatchStatus;
  venue: string | null;
  season_year: number;
  duration_minutes: number;
  created_at: string;
  half?: number | null;
  half_start_time?: string | null;
  elapsed_seconds_in_half?: number | null;
  clock_status?: string | null;
  added_time_first_half?: number | null;
  added_time_second_half?: number | null;
  team_name_display?: string | null;
  team_logo_url?: string | null;
  opponent_logo_url?: string | null;
  competition: {
    id: string;
    name: string;
    display_name: string | null;
  } | null;
}

const statusConfig: Record<MatchStatus, { label: string; bgClass: string; textClass: string; icon: React.ReactNode }> = {
  draft: { 
    label: "Rascunho", 
    bgClass: "bg-zinc-700/60", 
    textClass: "text-zinc-400",
    icon: <FileText className="h-3 w-3" /> 
  },
  live: { 
    label: "Ao Vivo", 
    bgClass: "bg-red-500/20", 
    textClass: "text-red-400",
    icon: <Radio className="h-3 w-3 animate-pulse" /> 
  },
  finished: { 
    label: "Finalizado", 
    bgClass: "bg-amber-500/20", 
    textClass: "text-amber-400",
    icon: <Pause className="h-3 w-3" /> 
  },
  applied: { 
    label: "Aplicado", 
    bgClass: "bg-emerald-500/20", 
    textClass: "text-emerald-400",
    icon: <CheckCircle2 className="h-3 w-3" /> 
  },
};

// ── Edit Dialog ───────────────────────────────────────────────────────────────
interface EditForm {
  team_name_display: string;
  team_logo_url: string;
  opponent_name: string;
  opponent_logo_url: string;
}

interface MatchEditDialogProps {
  match: MatchWithCompetition | null;
  onClose: () => void;
  onSave: (id: string, form: EditForm) => void;
  isPending: boolean;
}

// Reusable logo upload widget
function LogoUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Apenas imagens"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Máx. 5 MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `match-logos/edit-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("team-logos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("team-logos").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Logo atualizado!");
    } catch {
      toast.error("Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="flex items-center gap-3">
        {/* Preview */}
        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-contain p-1" />
          ) : (
            <Image className="w-5 h-5 text-zinc-600" />
          )}
        </div>
        {/* Buttons */}
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="h-8 text-xs gap-1.5 border-zinc-700"
          >
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {value ? "Trocar" : "Upload"}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange("")}
              className="h-6 text-[10px] text-zinc-500 hover:text-red-400 gap-1 px-2"
            >
              <X className="h-3 w-3" />
              Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchEditDialog({ match, onClose, onSave, isPending }: MatchEditDialogProps) {
  const [form, setForm] = useState<EditForm>({
    team_name_display: "",
    team_logo_url: "",
    opponent_name: "",
    opponent_logo_url: "",
  });

  useEffect(() => {
    if (match) {
      setForm({
        team_name_display: match.team_name_display ?? "",
        team_logo_url:     match.team_logo_url     ?? "",
        opponent_name:     match.opponent_name      ?? "",
        opponent_logo_url: match.opponent_logo_url  ?? "",
      });
    }
  }, [match]);

  const set = (key: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  return (
    <Dialog open={!!match} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Informações da Partida</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Time da Casa</Label>
            <Input value={form.team_name_display} onChange={set("team_name_display")}
              placeholder="Nome do time" className="bg-zinc-800 border-zinc-700" />
          </div>
          <LogoUploadField
            label="Escudo do Time da Casa"
            value={form.team_logo_url}
            onChange={url => setForm(prev => ({ ...prev, team_logo_url: url }))}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Time Visitante</Label>
            <Input value={form.opponent_name} onChange={set("opponent_name")}
              placeholder="Nome do adversário" className="bg-zinc-800 border-zinc-700" />
          </div>
          <LogoUploadField
            label="Escudo do Time Visitante"
            value={form.opponent_logo_url}
            onChange={url => setForm(prev => ({ ...prev, opponent_logo_url: url }))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">
            Cancelar
          </Button>
          <Button
            onClick={() => match && onSave(match.id, form)}
            disabled={isPending || !form.opponent_name.trim()}
            className="bg-[#e63946] hover:bg-[#d62839] text-white"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Skeleton for loading state
function MatchCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl bg-zinc-900/60 border border-zinc-800/60 p-4"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </motion.div>
  );
}

// Live Hub Empty State Card
function LiveHubEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative"
    >
      {/* Glow effect behind card */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 via-transparent to-red-600/5 rounded-3xl blur-xl" />
      
      <div className="relative rounded-3xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900/90 via-zinc-900/80 to-zinc-950/90 p-8 sm:p-12 shadow-2xl">
        {/* Broadcast icon with animation */}
        <div className="flex flex-col items-center text-center">
          {/* Animated broadcast icon */}
          <div className="relative mb-6">
            {/* Outer ring pulse */}
            <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            {/* Middle ring */}
            <div className="absolute inset-2 rounded-full bg-red-500/10 animate-pulse" style={{ animationDuration: '1.5s' }} />
            {/* Icon container */}
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-600/20 to-red-500/10 border border-red-500/30 flex items-center justify-center">
              <Wifi className="w-8 h-8 text-red-400" />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3">
            Nenhum jogo ao vivo no momento
          </h3>

          {/* Description */}
          <p className="text-sm sm:text-base text-zinc-500 max-w-md mb-8 leading-relaxed">
            {canCreate 
              ? "Crie um jogo para registrar eventos, estatísticas e desempenho em tempo real durante as partidas."
              : "Não há jogos disponíveis para visualização no momento."}
          </p>

          {/* CTA Button with pulse - only show if user can create */}
          {canCreate && (
            <Link to="/dashboard/aovivo/novo">
              <Button 
                size="lg" 
                className="relative bg-red-600 hover:bg-red-700 text-white gap-2.5 px-8 h-12 text-base font-semibold rounded-xl shadow-lg shadow-red-600/20 transition-all hover:shadow-xl hover:shadow-red-600/30 hover:scale-[1.02]"
              >
                <span className="absolute inset-0 rounded-xl bg-red-500/20 animate-pulse" style={{ animationDuration: '2s' }} />
                <Radio className="w-5 h-5 relative z-10" />
                <span className="relative z-10">Criar primeiro jogo</span>
              </Button>
            </Link>
          )}

          {/* Features hint */}
          <div className={cn("flex items-center gap-6 pt-8 border-t border-zinc-800/60", canCreate ? "mt-8" : "mt-4")}>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Activity className="w-3.5 h-3.5 text-zinc-600" />
              Estatísticas em tempo real
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5 text-zinc-600" />
              Cronômetro automático
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Trophy className="w-3.5 h-3.5 text-zinc-600" />
              Integração com competições
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Match Card Component
interface MatchCardProps {
  match: MatchWithCompetition;
  link: string;
  onDelete?: () => void;
  onEdit?: () => void;
  canDelete?: boolean;
  index: number;
}

function MatchCard({ match, link, onDelete, onEdit, canDelete = false, index }: MatchCardProps) {
  const config = statusConfig[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const isLive = match.status === "live";
  const { teamName: globalTeamName, logoUrl: globalLogoUrl } = useTeamSettings();

  // Use match-specific team info with fallback to global settings
  const displayTeamName = match.team_name_display || globalTeamName || "Time";
  const displayLogoUrl = match.team_logo_url || globalLogoUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group"
    >
      <Link
        to={link}
        className={cn(
          "block relative rounded-xl border bg-zinc-900/60 p-4 transition-all duration-300",
          "hover:bg-zinc-900/80 hover:border-zinc-700/60 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5",
          isLive && "border-red-500/30 shadow-lg shadow-red-500/10",
          // Touch optimizations - single tap opens immediately
          "touch-action-manipulation",
          "[touch-action:manipulation]",
          "[-webkit-tap-highlight-color:transparent]"
        )}
        style={{
          // iOS touch optimization
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        {/* Live glow effect - pointer-events-none to not capture touches */}
        {isLive && (
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-600/5 via-transparent to-red-600/5 pointer-events-none" />
        )}

        <div className="flex items-center gap-4">
          {/* Team logos section */}
          <div className="shrink-0 flex items-center gap-2 pointer-events-none">
            {/* Home team logo */}
            {displayLogoUrl ? (
              <img
                src={displayLogoUrl}
                alt={displayTeamName}
                className="w-10 h-10 object-contain rounded-lg bg-zinc-800/50 p-1" width={40} height={40}
                loading="lazy" decoding="async"
              />
            ) : (
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold",
                config.bgClass, config.textClass
              )}>
                {displayTeamName.substring(0, 2).toUpperCase()}
              </div>
            )}
            
            <span className="text-zinc-500 text-xs font-medium">vs</span>
            
            {/* Away team logo */}
            {match.opponent_logo_url ? (
              <img
                src={match.opponent_logo_url}
                alt={match.opponent_name}
                className="w-10 h-10 object-contain rounded-lg bg-zinc-800/50 p-1" width={40} height={40}
                loading="lazy" decoding="async"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-zinc-700/40 flex items-center justify-center text-xs font-bold text-zinc-400">
                {match.opponent_name.substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Match info - pointer-events-none so touches pass through to link */}
          <div className="flex-1 min-w-0 pointer-events-none">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-zinc-100 truncate">
                {displayTeamName} <span className="text-zinc-500 font-normal">vs</span> {match.opponent_name}
              </h4>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] px-2 py-0 h-5 border-0 shrink-0",
                  config.bgClass, config.textClass
                )}
              >
                {config.label}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {competitionName}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(match.match_date), "dd/MM/yyyy", { locale: ptBR })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(match.match_date), "HH:mm")}
              </span>
              {match.venue && (
                <span className="flex items-center gap-1 hidden sm:flex">
                  <MapPin className="h-3 w-3" />
                  {match.venue}
                </span>
              )}
              <span className="flex items-center gap-1 text-zinc-600">
                ({match.duration_minutes}')
              </span>
            </div>
          </div>

          {/* Actions - Stop propagation to prevent navigation when clicking menu */}
          <div 
            className="relative z-10"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8 text-zinc-300 hover:text-white hover:bg-zinc-800/80 rounded-md transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                  }}
                  aria-label="Abrir menu de ações"
                >
                  <MoreVertical className="w-5 h-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem asChild>
                  <Link to={link} className="flex items-center gap-2 cursor-pointer">
                    {match.status === "live" ? (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        Continuar
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Ver detalhes
                      </>
                    )}
                  </Link>
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
                    className="cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" />
                    Editar
                  </DropdownMenuItem>
                )}
                {canDelete && onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
                    className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Section component for grouped matches
interface MatchSectionProps {
  title: string;
  icon: React.ReactNode;
  iconColorClass: string;
  borderColorClass?: string;
  matches: MatchWithCompetition[];
  getMatchLink: (match: MatchWithCompetition) => string;
  onDeleteClick?: (match: MatchWithCompetition) => void;
  onEditClick?: (match: MatchWithCompetition) => void;
  canDelete?: boolean;
}

function MatchSection({
  title,
  icon,
  iconColorClass,
  borderColorClass = "border-zinc-800/60",
  matches,
  getMatchLink,
  onDeleteClick,
  onEditClick,
  canDelete = false,
}: MatchSectionProps) {
  if (matches.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border bg-zinc-900/40 overflow-hidden",
        borderColorClass
      )}
    >
      {/* Section header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/40">
        <div className={cn("text-lg", iconColorClass)}>
          {icon}
        </div>
        <h3 className={cn("font-semibold", iconColorClass)}>
          {title}
        </h3>
        <span className="text-xs text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
          {matches.length}
        </span>
      </div>

      {/* Matches list */}
      <div className="p-3 space-y-2">
        {matches.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            link={getMatchLink(match)}
            onDelete={onDeleteClick ? () => onDeleteClick(match) : undefined}
            onEdit={onEditClick ? () => onEditClick(match) : undefined}
            canDelete={canDelete}
            index={i}
          />
        ))}
      </div>
    </motion.div>
  );
}

export default function LiveMatchHistory() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [deleteMatch, setDeleteMatch] = useState<MatchWithCompetition | null>(null);
  const [editMatch, setEditMatch]     = useState<MatchWithCompetition | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  
  // Check permissions for actions
  const canLogEvents = can("live_match", "log");
  const canDeleteMatches = canLogEvents; // Same permission for simplicity

  const { data: matches = [], isLoading } = useQuery({
    // Key includes user.id for cache separation, but query relies on RLS for filtering
    queryKey: ["matches-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      // IMPORTANT: Do NOT filter by created_by here.
      // RLS policies handle visibility based on user role:
      // - Admin/Scout/Editor/Viewer: see all organization matches
      // - Player: sees only matches they participated in
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id,
          opponent_name,
          match_date,
          status,
          venue,
          season_year,
          duration_minutes,
          created_at,
          half,
          half_start_time,
          elapsed_seconds_in_half,
          clock_status,
          added_time_first_half,
          added_time_second_half,
          team_name_display,
          team_logo_url,
          opponent_logo_url,
          competition:competitions(id, name, display_name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MatchWithCompetition[];
    },
    enabled: !!user,
  });

  // Subscribe to realtime updates for matches (clock sync)
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'matches',
          // No filter - RLS handles visibility, and we invalidate to refetch filtered data
        },
        (payload) => {
          // Invalidate query to refetch with updated data (RLS will filter appropriately)
          queryClient.invalidateQueries({ queryKey: ["matches-history"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const editMatchMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: EditForm }) => {
      const { error } = await supabase
        .from("matches")
        .update({
          team_name_display: form.team_name_display || null,
          team_logo_url:     form.team_logo_url     || null,
          opponent_name:     form.opponent_name,
          opponent_logo_url: form.opponent_logo_url  || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches-history"] });
      toast.success("Partida atualizada");
      setEditMatch(null);
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from("matches")
        .delete()
        .eq("id", matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches-history"] });
      toast.success("Jogo excluído com sucesso");
      setDeleteMatch(null);
    },
    onError: (error) => {
      console.error("Delete match error:", error);
      toast.error("Erro ao excluir jogo");
    },
  });

  // Group by status
  const liveMatches = matches.filter((m) => m.status === "live");
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const appliedMatches = matches.filter((m) => m.status === "applied");
  const draftMatches = matches.filter((m) => m.status === "draft");

  const hasLiveMatch = liveMatches.length > 0;

  const getMatchLink = (match: MatchWithCompetition) => {
    if (match.status === "applied") {
      return `/dashboard/aovivo/${match.id}/revisao`;
    }
    return `/dashboard/aovivo/${match.id}`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Live indicator when there's an active match */}
          {hasLiveMatch && (
            <div className="relative sm:block">
              <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
              <div className="relative w-3 h-3 rounded-full bg-red-500" />
            </div>
          )}
          {/* Mobile: "Jogos" | Desktop: "Jogos ao vivo" */}
          <h1 className="m3-page-title">
            <span className="sm:hidden">Jogos</span>
            <span className="hidden sm:inline">Jogos ao vivo</span>
          </h1>
          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">
            {matches.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile search toggle */}
          <button
            className="sm:hidden p-1 text-zinc-400 hover:text-white transition-colors"
            onClick={() => setSearchOpen(v => !v)}
            aria-label="Buscar"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>

          {/* Desktop: Novo jogo button */}
          {canLogEvents && (
            <Link to="/dashboard/aovivo/novo" className="hidden sm:block">
              <Button className="bg-[#e63946] hover:bg-[#d62839] text-white gap-2 rounded-full px-5 h-9 text-sm font-semibold">
                <Plus className="w-4 h-4" />
                Novo jogo
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile search input */}
      {searchOpen && (
        <div className="sm:hidden">
          <input
            autoFocus
            value={mobileSearch}
            onChange={e => setMobileSearch(e.target.value)}
            placeholder="Buscar jogo..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none"
          />
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <MatchCardSkeleton key={i} index={i} />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <LiveHubEmptyState canCreate={canLogEvents} />
      ) : (
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {/* Live matches - using special LiveMatchCard with timer and quick actions */}
            {liveMatches.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-red-500/30 bg-zinc-900/40 overflow-hidden"
              >
                {/* Section header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/40">
                  <div className="text-lg text-red-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <h3 className="font-semibold text-red-400">Ao Vivo</h3>
                  <span className="text-xs text-zinc-600 bg-zinc-800/60 px-2 py-0.5 rounded-full">
                    {liveMatches.length}
                  </span>
                </div>
                
                {/* Live match cards */}
                <div className="p-3 space-y-3">
                  {liveMatches.map((match, i) => (
                    <LiveMatchCard
                      key={match.id}
                      match={match}
                      link={getMatchLink(match)}
                      onDelete={() => setDeleteMatch(match)}
                      onEdit={() => setEditMatch(match)}
                      canDelete={canDeleteMatches}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Finished matches waiting to apply */}
            <MatchSection
              title="Aguardando Aplicar"
              icon={<Pause className="w-5 h-5" />}
              iconColorClass="text-amber-400"
              borderColorClass="border-amber-500/30"
              matches={finishedMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
              onEditClick={setEditMatch}
              canDelete={canDeleteMatches}
            />

            {/* Applied matches (history) */}
            <MatchSection
              title="Histórico"
              icon={<CheckCircle2 className="w-5 h-5" />}
              iconColorClass="text-emerald-400"
              matches={appliedMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
              onEditClick={setEditMatch}
              canDelete={canDeleteMatches}
            />

            {/* Draft matches */}
            <MatchSection
              title="Rascunhos"
              icon={<FileText className="w-5 h-5" />}
              iconColorClass="text-zinc-500"
              matches={draftMatches}
              getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch}
              onEditClick={setEditMatch}
              canDelete={canDeleteMatches}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Edit match dialog */}
      <MatchEditDialog
        match={editMatch}
        onClose={() => setEditMatch(null)}
        onSave={(id, form) => editMatchMutation.mutate({ id, form })}
        isPending={editMatchMutation.isPending}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteMatch} onOpenChange={() => setDeleteMatch(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteMatch && (
                <>
                  Tem certeza que deseja excluir o jogo <strong className="text-zinc-200">vs {deleteMatch.opponent_name}</strong>?
                  {deleteMatch.status === "applied" && (
                    <span className="block mt-2 text-amber-400">
                      ⚠️ As estatísticas já aplicadas aos jogadores NÃO serão removidas.
                    </span>
                  )}
                  <span className="block mt-2">
                    Esta ação não pode ser desfeita.
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMatch && deleteMatchMutation.mutate(deleteMatch.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteMatchMutation.isPending}
            >
              {deleteMatchMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
