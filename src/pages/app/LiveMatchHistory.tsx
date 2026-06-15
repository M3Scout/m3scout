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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LiveMatchCard } from "@/components/live-match/LiveMatchCard";
import { useTeamSettings } from "@/hooks/useTeamSettings";
import { toast } from "sonner";
import {
  Radio, Plus, Calendar, Trophy, MapPin, Clock,
  CheckCircle2, Pause, FileText, Trash2, Pencil,
  MoreVertical, Eye, Play, Wifi, Search, Upload, X, Image, Loader2,
} from "lucide-react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const ACCENT      = "#ec4525";
const CARD_BG     = "#0f0f10";
const CARD_BORDER = "rgba(255,255,255,0.07)";
const TEXT        = "#ededee";
const MUTED       = "#62616a";

// ─── Types ────────────────────────────────────────────────────────────────────
type MatchStatus = "draft" | "live" | "finished" | "applied";

interface MatchWithCompetition {
  id: string; opponent_name: string; match_date: string; status: MatchStatus;
  venue: string | null; season_year: number; duration_minutes: number; created_at: string;
  half?: number | null; half_start_time?: string | null; elapsed_seconds_in_half?: number | null;
  clock_status?: string | null; added_time_first_half?: number | null; added_time_second_half?: number | null;
  team_name_display?: string | null; team_logo_url?: string | null; opponent_logo_url?: string | null;
  competition: { id: string; name: string; display_name: string | null } | null;
}

const STATUS_CFG: Record<MatchStatus, { label: string; color: string; bg: string; border: string }> = {
  live:     { label: "Ao Vivo",    color: ACCENT,    bg: "rgba(236,69,37,0.10)",   border: "rgba(236,69,37,0.28)"   },
  finished: { label: "Finalizado", color: "#E8C44A", bg: "rgba(232,196,74,0.10)",  border: "rgba(232,196,74,0.25)"  },
  applied:  { label: "Aplicado",   color: "#2DCE8A", bg: "rgba(45,206,138,0.10)",  border: "rgba(45,206,138,0.25)"  },
  draft:    { label: "Rascunho",   color: MUTED,     bg: "rgba(98,97,106,0.10)",   border: "rgba(98,97,106,0.20)"   },
};

// ─── Edit form ────────────────────────────────────────────────────────────────
interface EditForm {
  team_name_display: string; team_logo_url: string;
  opponent_name: string; opponent_logo_url: string;
}

function LogoUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
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
    } catch { toast.error("Erro no upload"); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-zinc-400">{label}</Label>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 overflow-hidden">
          {value ? <img src={value} alt="" className="w-full h-full object-contain p-1" /> : <Image className="w-5 h-5 text-zinc-600" />}
        </div>
        <div className="flex flex-col gap-1">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading} className="h-8 text-xs gap-1.5 border-zinc-700">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {value ? "Trocar" : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} className="h-6 text-[10px] text-zinc-500 hover:text-red-400 gap-1 px-2">
              <X className="h-3 w-3" /> Remover
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MatchEditDialog({ match, onClose, onSave, isPending }: { match: MatchWithCompetition | null; onClose: () => void; onSave: (id: string, form: EditForm) => void; isPending: boolean }) {
  const [form, setForm] = useState<EditForm>({ team_name_display: "", team_logo_url: "", opponent_name: "", opponent_logo_url: "" });
  useEffect(() => {
    if (match) setForm({ team_name_display: match.team_name_display ?? "", team_logo_url: match.team_logo_url ?? "", opponent_name: match.opponent_name ?? "", opponent_logo_url: match.opponent_logo_url ?? "" });
  }, [match]);
  const set = (k: keyof EditForm) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  return (
    <Dialog open={!!match} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-800 max-w-md">
        <DialogHeader><DialogTitle>Editar Partida</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Time da Casa</Label>
            <Input value={form.team_name_display} onChange={set("team_name_display")} placeholder="Nome do time" className="bg-zinc-800 border-zinc-700" />
          </div>
          <LogoUploadField label="Escudo — Casa" value={form.team_logo_url} onChange={url => setForm(p => ({ ...p, team_logo_url: url }))} />
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Time Visitante</Label>
            <Input value={form.opponent_name} onChange={set("opponent_name")} placeholder="Nome do adversário" className="bg-zinc-800 border-zinc-700" />
          </div>
          <LogoUploadField label="Escudo — Visitante" value={form.opponent_logo_url} onChange={url => setForm(p => ({ ...p, opponent_logo_url: url }))} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="border-zinc-700">Cancelar</Button>
          <Button onClick={() => match && onSave(match.id, form)} disabled={isPending || !form.opponent_name.trim()} style={{ background: ACCENT, color: "#fff" }}>
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function MatchCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.07 }}
      className="rounded-xl border p-4 animate-pulse" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-zinc-800" />
          <div className="w-5 h-3 rounded bg-zinc-800" />
          <div className="w-10 h-10 rounded-lg bg-zinc-800" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-4 w-44 rounded bg-zinc-800" />
          <div className="h-3 w-28 rounded bg-zinc-800" />
        </div>
        <div className="h-5 w-18 rounded-md bg-zinc-800" />
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function LiveHubEmptyState({ canCreate }: { canCreate: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className="rounded-xl border p-10 sm:p-16 text-center" style={{ background: CARD_BG, borderColor: CARD_BORDER }}>
      <div className="relative w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
        style={{ background: "rgba(236,69,37,0.07)", border: "1px solid rgba(236,69,37,0.18)" }}>
        <span className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: ACCENT }} />
        <Wifi className="w-7 h-7" style={{ color: ACCENT }} />
      </div>
      <h3 className="font-display font-bold text-[20px] mb-2" style={{ color: TEXT }}>
        Nenhum jogo registrado
      </h3>
      <p className="font-editorial-mono text-[11px] mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: MUTED }}>
        {canCreate
          ? "Crie um jogo para registrar eventos, estatísticas e desempenho em tempo real durante as partidas."
          : "Não há jogos disponíveis para visualização no momento."}
      </p>
      {canCreate && (
        <Link to="/dashboard/aovivo/novo">
          <button
            className="inline-flex items-center gap-2 font-editorial-mono text-[11px] uppercase tracking-wider px-6 py-2.5 rounded-full transition-colors duration-150"
            style={{ background: ACCENT, color: "#fff" }}
          >
            <Radio className="w-4 h-4" /> Criar primeiro jogo
          </button>
        </Link>
      )}
      <div className="flex items-center justify-center gap-6 mt-10 pt-8 border-t" style={{ borderColor: CARD_BORDER }}>
        {[{ icon: <Wifi className="w-3 h-3" />, label: "Tempo real" }, { icon: <Clock className="w-3 h-3" />, label: "Cronômetro" }, { icon: <Trophy className="w-3 h-3" />, label: "Competições" }].map(item => (
          <div key={item.label} className="flex items-center gap-1.5 font-editorial-mono text-[10px]" style={{ color: MUTED }}>
            {item.icon}{item.label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Match card ───────────────────────────────────────────────────────────────
function MatchCard({ match, link, onDelete, onEdit, canDelete = false, index }: {
  match: MatchWithCompetition; link: string; onDelete?: () => void; onEdit?: () => void;
  canDelete?: boolean; index: number;
}) {
  const cfg = STATUS_CFG[match.status];
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const isLive = match.status === "live";
  const { teamName: globalTeamName, logoUrl: globalLogoUrl } = useTeamSettings();
  const displayTeamName = match.team_name_display || globalTeamName || "Time";
  const displayLogoUrl  = match.team_logo_url     || globalLogoUrl;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Link
        to={link}
        className="block relative rounded-xl border transition-colors duration-[250ms] hover:bg-zinc-800/25"
        style={{ background: isLive ? "rgba(236,69,37,0.03)" : "transparent", borderColor: isLive ? "rgba(236,69,37,0.18)" : CARD_BORDER }}
      >
        <div className="flex items-center gap-4 p-4">
          {/* Logos */}
          <div className="shrink-0 flex items-center gap-2">
            {displayLogoUrl
              ? <img src={displayLogoUrl} alt={displayTeamName} className="w-10 h-10 object-contain rounded-lg p-1" style={{ background: "rgba(255,255,255,0.03)" }} loading="lazy" />
              : <div className="w-10 h-10 rounded-lg flex items-center justify-center font-editorial-mono text-[11px] font-bold" style={{ background: cfg.bg, color: cfg.color }}>{displayTeamName.substring(0, 2).toUpperCase()}</div>
            }
            <span className="font-editorial-mono text-[10px]" style={{ color: MUTED }}>vs</span>
            {match.opponent_logo_url
              ? <img src={match.opponent_logo_url} alt={match.opponent_name} className="w-10 h-10 object-contain rounded-lg p-1" style={{ background: "rgba(255,255,255,0.03)" }} loading="lazy" />
              : <div className="w-10 h-10 rounded-lg flex items-center justify-center font-editorial-mono text-[11px] font-bold" style={{ background: "rgba(255,255,255,0.04)", color: MUTED }}>{match.opponent_name.substring(0, 2).toUpperCase()}</div>
            }
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="font-display font-semibold text-[13px] truncate" style={{ color: TEXT }}>
                {displayTeamName} <span style={{ color: MUTED, fontWeight: 400 }}>vs</span> {match.opponent_name}
              </span>
              <span className="font-editorial-mono text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 inline-flex items-center gap-1"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {isLive && <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />}
                {cfg.label}
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-editorial-mono text-[10px] flex items-center gap-1" style={{ color: MUTED }}><Trophy className="w-3 h-3" />{competitionName}</span>
              <span className="font-editorial-mono text-[10px] flex items-center gap-1" style={{ color: MUTED }}><Calendar className="w-3 h-3" />{format(new Date(match.match_date), "dd/MM/yy", { locale: ptBR })}</span>
              <span className="font-editorial-mono text-[10px] flex items-center gap-1" style={{ color: MUTED }}><Clock className="w-3 h-3" />{format(new Date(match.match_date), "HH:mm")}</span>
              {match.venue && <span className="hidden sm:flex font-editorial-mono text-[10px] items-center gap-1" style={{ color: MUTED }}><MapPin className="w-3 h-3" />{match.venue}</span>}
            </div>
          </div>

          {/* Actions */}
          <div className="relative z-10 shrink-0" onClick={e => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors duration-150 hover:bg-zinc-800"
                  style={{ color: MUTED }} onClick={e => { e.preventDefault(); e.stopPropagation(); }} aria-label="Ações">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800">
                <DropdownMenuItem asChild>
                  <Link to={link} className="flex items-center gap-2 cursor-pointer">
                    {isLive ? <><Play className="w-3.5 h-3.5" />Continuar</> : <><Eye className="w-3.5 h-3.5" />Ver detalhes</>}
                  </Link>
                </DropdownMenuItem>
                {onEdit && <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onEdit(); }} className="cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" />Editar</DropdownMenuItem>}
                {canDelete && onDelete && <DropdownMenuItem onClick={e => { e.preventDefault(); e.stopPropagation(); onDelete(); }} className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"><Trash2 className="w-3.5 h-3.5 mr-2" />Excluir</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function MatchSection({ title, icon, accentColor, accentBorder, matches, getMatchLink, onDeleteClick, onEditClick, canDelete = false }: {
  title: string; icon: React.ReactNode; accentColor: string; accentBorder?: string;
  matches: MatchWithCompetition[]; getMatchLink: (m: MatchWithCompetition) => string;
  onDeleteClick?: (m: MatchWithCompetition) => void; onEditClick?: (m: MatchWithCompetition) => void; canDelete?: boolean;
}) {
  if (matches.length === 0) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: accentBorder ?? CARD_BORDER }}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: CARD_BORDER }}>
        <div className="flex items-center gap-2.5" style={{ color: accentColor }}>
          {icon}
          <span className="font-display font-semibold text-[13px]">{title}</span>
        </div>
        <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: MUTED }}>
          {matches.length} {matches.length === 1 ? "jogo" : "jogos"}
        </span>
      </div>
      <div className="p-3 space-y-2">
        {matches.map((match, i) => (
          <MatchCard key={match.id} match={match} link={getMatchLink(match)} index={i}
            onDelete={onDeleteClick ? () => onDeleteClick(match) : undefined}
            onEdit={onEditClick ? () => onEditClick(match) : undefined}
            canDelete={canDelete}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LiveMatchHistory() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const queryClient = useQueryClient();
  const [deleteMatch, setDeleteMatch] = useState<MatchWithCompetition | null>(null);
  const [editMatch,   setEditMatch]   = useState<MatchWithCompetition | null>(null);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");

  const canLogEvents     = can("live_match", "log");
  const canDeleteMatches = canLogEvents;

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches-history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("matches")
        .select(`id, opponent_name, match_date, status, venue, season_year, duration_minutes, created_at, half, half_start_time, elapsed_seconds_in_half, clock_status, added_time_first_half, added_time_second_half, team_name_display, team_logo_url, opponent_logo_url, competition:competitions(id, name, display_name)`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MatchWithCompetition[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("matches-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
        queryClient.invalidateQueries({ queryKey: ["matches-history"] });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const editMatchMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: EditForm }) => {
      const { error } = await supabase.from("matches").update({
        team_name_display: form.team_name_display || null,
        team_logo_url:     form.team_logo_url     || null,
        opponent_name:     form.opponent_name,
        opponent_logo_url: form.opponent_logo_url  || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["matches-history"] }); toast.success("Partida atualizada"); setEditMatch(null); },
    onError: () => toast.error("Erro ao salvar"),
  });

  const deleteMatchMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("matches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["matches-history"] }); toast.success("Jogo excluído"); setDeleteMatch(null); },
    onError: () => toast.error("Erro ao excluir jogo"),
  });

  const liveMatches     = matches.filter(m => m.status === "live");
  const finishedMatches = matches.filter(m => m.status === "finished");
  const appliedMatches  = matches.filter(m => m.status === "applied");
  const draftMatches    = matches.filter(m => m.status === "draft");
  const hasLiveMatch    = liveMatches.length > 0;

  const filteredMatches = mobileSearch
    ? matches.filter(m => m.opponent_name.toLowerCase().includes(mobileSearch.toLowerCase()) || (m.competition?.name ?? "").toLowerCase().includes(mobileSearch.toLowerCase()))
    : null;

  const getMatchLink = (m: MatchWithCompetition) =>
    m.status === "applied" ? `/dashboard/aovivo/${m.id}/revisao` : `/dashboard/aovivo/${m.id}`;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          {hasLiveMatch && (
            <div className="relative w-2.5 h-2.5 shrink-0">
              <span className="absolute inset-0 rounded-full animate-ping opacity-40" style={{ background: ACCENT }} />
              <span className="relative block w-2.5 h-2.5 rounded-full" style={{ background: ACCENT }} />
            </div>
          )}
          <h1 className="m3-page-title">Jogos ao vivo</h1>
          {matches.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full font-editorial-mono text-[12px] font-bold text-white" style={{ background: ACCENT }}>
              {matches.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="sm:hidden p-1.5 rounded-lg transition-colors" style={{ color: MUTED }}
            onClick={() => { setSearchOpen(v => !v); setMobileSearch(""); }} aria-label="Buscar">
            <Search className="w-4 h-4" />
          </button>
          {canLogEvents && (
            <Link to="/dashboard/aovivo/novo" className="hidden sm:block">
              <button
                className="inline-flex items-center gap-1.5 font-editorial-mono text-[10px] uppercase tracking-wider px-4 py-2 rounded-full border transition-colors duration-150 hover:bg-zinc-800/40"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: TEXT }}
              >
                <Plus className="w-3.5 h-3.5" /> Novo jogo
              </button>
            </Link>
          )}
        </div>
      </div>

      {/* Mobile search */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="sm:hidden overflow-hidden">
            <input autoFocus value={mobileSearch} onChange={e => setMobileSearch(e.target.value)}
              placeholder="Buscar jogo ou competição..."
              className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none"
              style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, color: TEXT }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <MatchCardSkeleton key={i} index={i} />)}
        </div>
      ) : matches.length === 0 ? (
        <LiveHubEmptyState canCreate={canLogEvents} />
      ) : filteredMatches !== null ? (
        <div className="space-y-2">
          {filteredMatches.length === 0 ? (
            <div className="rounded-xl border p-8 text-center font-editorial-mono text-[11px]" style={{ background: CARD_BG, borderColor: CARD_BORDER, color: MUTED }}>
              Nenhum jogo encontrado
            </div>
          ) : filteredMatches.map((match, i) => (
            <MatchCard key={match.id} match={match} link={getMatchLink(match)} index={i}
              onDelete={() => setDeleteMatch(match)} onEdit={() => setEditMatch(match)} canDelete={canDeleteMatches} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {/* Live — with LiveMatchCard (has timer) */}
            {liveMatches.length > 0 && (
              <motion.div key="live" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border overflow-hidden" style={{ background: CARD_BG, borderColor: "rgba(236,69,37,0.22)" }}>
                <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: CARD_BORDER }}>
                  <div className="flex items-center gap-2.5" style={{ color: ACCENT }}>
                    <Radio className="w-4 h-4 animate-pulse" />
                    <span className="font-display font-semibold text-[13px]">Ao Vivo</span>
                  </div>
                  <span className="font-editorial-mono text-[10px] tabular-nums" style={{ color: MUTED }}>
                    {liveMatches.length} {liveMatches.length === 1 ? "jogo" : "jogos"}
                  </span>
                </div>
                <div className="p-3 space-y-3">
                  {liveMatches.map((match, i) => (
                    <LiveMatchCard key={match.id} match={match} link={getMatchLink(match)}
                      onDelete={() => setDeleteMatch(match)} onEdit={() => setEditMatch(match)}
                      canDelete={canDeleteMatches} index={i} />
                  ))}
                </div>
              </motion.div>
            )}

            <MatchSection key="finished" title="Aguardando Aplicar" icon={<Pause className="w-4 h-4" />}
              accentColor="#E8C44A" accentBorder="rgba(232,196,74,0.18)"
              matches={finishedMatches} getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch} onEditClick={setEditMatch} canDelete={canDeleteMatches} />

            <MatchSection key="applied" title="Histórico" icon={<CheckCircle2 className="w-4 h-4" />}
              accentColor="#2DCE8A"
              matches={appliedMatches} getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch} onEditClick={setEditMatch} canDelete={canDeleteMatches} />

            <MatchSection key="draft" title="Rascunhos" icon={<FileText className="w-4 h-4" />}
              accentColor={MUTED}
              matches={draftMatches} getMatchLink={getMatchLink}
              onDeleteClick={setDeleteMatch} onEditClick={setEditMatch} canDelete={canDeleteMatches} />
          </div>
        </AnimatePresence>
      )}

      <MatchEditDialog match={editMatch} onClose={() => setEditMatch(null)}
        onSave={(id, form) => editMatchMutation.mutate({ id, form })} isPending={editMatchMutation.isPending} />

      <AlertDialog open={!!deleteMatch} onOpenChange={() => setDeleteMatch(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogo?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              {deleteMatch && (<>
                Tem certeza que deseja excluir <strong className="text-zinc-200">vs {deleteMatch.opponent_name}</strong>?
                {deleteMatch.status === "applied" && <span className="block mt-2 text-amber-400">⚠️ Estatísticas aplicadas NÃO serão removidas.</span>}
                <span className="block mt-2">Esta ação não pode ser desfeita.</span>
              </>)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMatch && deleteMatchMutation.mutate(deleteMatch.id)}
              className="bg-red-600 hover:bg-red-700 text-white" disabled={deleteMatchMutation.isPending}>
              {deleteMatchMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
