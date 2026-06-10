import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, Upload, User, Shield, Loader2, Trash2, Activity, Target,
  Stethoscope, FileText, Eye, X, Plus, BarChart3, Check,
} from "lucide-react";
import { PlayerStatsForm } from "@/components/players/PlayerStatsForm";
import { toast } from "sonner";
import { extractYouTubeVideoId, safeArray } from "@/lib/utils";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { ImageCropperModal } from "@/components/players/ImageCropperModal";
import { CurrencyInput, CurrencyCode } from "@/components/ui/currency-input";
import { formatFinancialValue } from "@/lib/formatters";
import { cn } from "@/lib/utils";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const positions = [
  "Goleiro", "Lateral Direito", "Lateral Esquerdo", "Zagueiro", "Volante",
  "Meia", "Meia Atacante", "Ponta Direita", "Ponta Esquerda", "Centroavante", "Segundo Atacante",
];
const nationalities = [
  "Brasil", "Argentina", "Uruguai", "Colômbia", "Chile", "Portugal",
  "Espanha", "Itália", "França", "Alemanha",
];
const playStyles = [
  "Box-to-Box", "Volante de Contenção", "Armador Recuado", "Meia-Armador",
  "Mezzala", "Falso Trequartista", "Falso Ponta", "Ponta Invertido",
  "Falso 9", "Oportunista", "Zagueiro Construtor", "Goleiro-Linha",
];
const tacticalRoles = [
  "Zagueiro Central", "Líbero", "Lateral Ofensivo", "Lateral Defensivo",
  "Volante", "Primeiro Volante", "Segundo Volante", "Meia Central",
  "Meia Ofensivo", "Ponta", "Atacante de Área", "Falso 9",
];
const strengthOptions = [
  "Passe Longo", "Drible", "Finalização", "Cabeceio", "Marcação", "Velocidade",
  "Força Física", "Posicionamento", "Visão de Jogo", "Liderança", "Bola Parada",
  "Jogo Aéreo", "Antecipação", "Controle de Bola", "Cruzamento",
];
const estimatedLevels = ["Série D", "Série C", "Série B", "Série A", "Internacional"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const parseSalaryFromLegacy = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const cleaned = value.replace(/[R$€$\s.]/g, "").replace(",", ".");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};
const parseCurrencyFromLegacy = (value: string | null | undefined): CurrencyCode => {
  if (!value) return "BRL";
  if (value.includes("$") && !value.includes("R$")) return "USD";
  if (value.includes("€")) return "EUR";
  return "BRL";
};
const formatLegacySalary = (amount: number | null, currency: CurrencyCode): string | null =>
  amount === null || amount === undefined ? null : formatFinancialValue(amount, currency);

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface FormData {
  full_name: string; position: string; secondary_positions: string[];
  nationality: string; birth_date: string; height: string; dominant_foot: string;
  current_club: string; country: string; bio_public: string;
  highlight_video_url: string; is_public: boolean;
  weight: string; body_fat_percentage: string; muscle_mass: string; wingspan: string;
  max_speed: string; sprint_30m: string; vo2_max: string; last_physical_evaluation: string;
  playing_height_preference: string; play_style: string; primary_tactical_role: string;
  secondary_tactical_role: string; strengths: string[]; areas_to_develop: string[];
  contract_start: string; contract_end: string; contract_notes: string;
  salary_amount: number | null; salary_currency: CurrencyCode;
  release_clause_amount: number | null; release_clause_currency: CurrencyCode;
  contract_status: string; passports: string[]; agent_name: string; agent_contact: string;
  physical_status: string; medical_notes: string;
  ready_to_compete: boolean | null;
  estimated_level: string; internal_evaluation_notes: string; internal_notes: string;
}

const initialFormData: FormData = {
  full_name: "", position: "", secondary_positions: [], nationality: "Brasil",
  birth_date: "", height: "", dominant_foot: "", current_club: "", country: "Brasil",
  bio_public: "", highlight_video_url: "", is_public: false,
  weight: "", body_fat_percentage: "", muscle_mass: "", wingspan: "",
  max_speed: "", sprint_30m: "", vo2_max: "", last_physical_evaluation: "",
  playing_height_preference: "", play_style: "", primary_tactical_role: "",
  secondary_tactical_role: "", strengths: [], areas_to_develop: [],
  contract_start: "", contract_end: "", contract_notes: "",
  salary_amount: null, salary_currency: "BRL",
  release_clause_amount: null, release_clause_currency: "BRL",
  contract_status: "contracted", passports: [],
  agent_name: "", agent_contact: "",
  physical_status: "fit", medical_notes: "",
  ready_to_compete: null,
  estimated_level: "", internal_evaluation_notes: "", internal_notes: "",
};

// ─── DESIGN PRIMITIVES ────────────────────────────────────────────────────────

const inputCls = "w-full h-[52px] bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all";
const textareaCls = "w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all resize-none";

function Field({ label, required, filled, children }: {
  label: string; required?: boolean; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {filled && (
          <span className="w-4 h-4 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Check className="w-2.5 h-2.5 text-emerald-400" strokeWidth={3} />
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, className }: {
  icon: React.ElementType; title: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("bg-zinc-900 rounded-3xl p-6 lg:p-8 border border-zinc-800/80", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-red-400" />
        </div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function EditPlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isScout } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [newTag, setNewTag] = useState<Record<string, string>>({});
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isCollapsed } = useSidebar();
  const canEdit = isAdmin || isScout;

  const TABS = useMemo(() => [
    { id: "basic",      label: "Básico",        icon: User },
    { id: "physical",   label: "Físico",         icon: Activity },
    { id: "technical",  label: "Técnico",        icon: Target },
    { id: "stats",      label: "Estatísticas",   icon: BarChart3 },
    { id: "medical",    label: "Médico",         icon: Stethoscope },
    { id: "contract",   label: "Contrato",       icon: FileText },
    ...(isAdmin ? [{ id: "evaluation", label: "Avaliação", icon: Eye }] : []),
  ], [isAdmin]);

  const profileProgress = useMemo(() => {
    const checks = [
      formData.full_name, formData.position, formData.nationality, formData.birth_date,
      formData.current_club, formData.dominant_foot, formData.height,
      existingPhotoUrl || photoPreview,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [formData, existingPhotoUrl, photoPreview]);

  // Circumference ≈ 100 when r=15.9, so dasharray maps directly to %
  const CIRC = 2 * Math.PI * 15.9;

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) return;
      const { data, error } = await supabase.from("players").select("*").eq("id", id).limit(1);
      const playerRow = Array.isArray(data) ? data[0] ?? null : null;
      if (error || !playerRow) {
        toast.error("Atleta não encontrado");
        navigate("/dashboard/atletas");
        return;
      }
      setFormData({
        full_name: playerRow.full_name || "",
        position: playerRow.position || "",
        secondary_positions: playerRow.secondary_positions || [],
        nationality: playerRow.nationality || "Brasil",
        birth_date: playerRow.birth_date || "",
        height: playerRow.height?.toString() || "",
        dominant_foot: playerRow.dominant_foot || "",
        current_club: playerRow.current_club || "",
        country: playerRow.country || "Brasil",
        bio_public: playerRow.bio_public || "",
        highlight_video_url: playerRow.highlight_video_url || "",
        is_public: playerRow.is_public || false,
        weight: playerRow.weight?.toString() || "",
        body_fat_percentage: playerRow.body_fat_percentage?.toString() || "",
        muscle_mass: playerRow.muscle_mass?.toString() || "",
        wingspan: playerRow.wingspan?.toString() || "",
        max_speed: playerRow.max_speed?.toString() || "",
        sprint_30m: playerRow.sprint_30m?.toString() || "",
        vo2_max: playerRow.vo2_max?.toString() || "",
        last_physical_evaluation: playerRow.last_physical_evaluation || "",
        playing_height_preference: playerRow.playing_height_preference || "",
        play_style: playerRow.play_style || "",
        primary_tactical_role: playerRow.primary_tactical_role || "",
        secondary_tactical_role: playerRow.secondary_tactical_role || "",
        strengths: playerRow.strengths || [],
        areas_to_develop: playerRow.areas_to_develop || [],
        contract_start: playerRow.contract_start || "",
        contract_end: playerRow.contract_end || "",
        contract_notes: playerRow.contract_notes || "",
        salary_amount: parseSalaryFromLegacy(playerRow.salary_info),
        salary_currency: parseCurrencyFromLegacy(playerRow.salary_info),
        release_clause_amount: parseSalaryFromLegacy(playerRow.release_clause),
        release_clause_currency: parseCurrencyFromLegacy(playerRow.release_clause),
        contract_status: playerRow.contract_status || "contracted",
        passports: playerRow.passports || [],
        agent_name: playerRow.agent_name || "",
        agent_contact: playerRow.agent_contact || "",
        physical_status: playerRow.physical_status || "fit",
        medical_notes: playerRow.medical_notes || "",
        ready_to_compete: playerRow.ready_to_compete,
        estimated_level: playerRow.estimated_level || "",
        internal_evaluation_notes: playerRow.internal_evaluation_notes || "",
        internal_notes: playerRow.internal_notes || "",
      });
      if (playerRow.photo_url) {
        setExistingPhotoUrl(playerRow.photo_url);
        setPhotoPreview(playerRow.photo_url);
      }
      setPlayerName(playerRow.full_name);
      setFetching(false);
    };
    fetchPlayer();
  }, [id, navigate]);

  const handleChange = useCallback((field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const processFile = useCallback((file: File) => {
    if (!ACCEPTED_TYPES.includes(file.type)) { toast.error("Formato inválido. Use JPG, PNG ou WebP."); return; }
    if (file.size > MAX_FILE_SIZE) { toast.error("Arquivo muito grande. Máximo 8MB."); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setRawImageSrc(reader.result as string); setCropperOpen(true); };
    reader.readAsDataURL(file);
  }, []);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleCropComplete = (blob: Blob) => {
    setPhotoFile(new File([blob], "photo.webp", { type: "image/webp" }));
    setPhotoPreview(URL.createObjectURL(blob));
    toast.success("Foto ajustada!");
  };

  const handleRemovePhoto = () => { setPhotoFile(null); setPhotoPreview(null); setExistingPhotoUrl(null); };

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const addTag = (field: "strengths" | "areas_to_develop" | "passports", value: string) => {
    if (value.trim() && !safeArray(formData[field]).includes(value.trim()))
      handleChange(field, [...safeArray(formData[field]), value.trim()]);
  };
  const removeTag = (field: "strengths" | "areas_to_develop" | "passports", value: string) =>
    handleChange(field, safeArray(formData[field]).filter(t => t !== value));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.position || !formData.nationality) {
      toast.error("Preencha os campos obrigatórios"); return;
    }
    setLoading(true);
    try {
      let photo_url = existingPhotoUrl;
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${generateSlug(formData.full_name)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("player-photos").upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        photo_url = supabase.storage.from("player-photos").getPublicUrl(fileName).data.publicUrl;
      }
      let age = null;
      if (formData.birth_date) {
        const bd = new Date(formData.birth_date), today = new Date();
        age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
      }
      const pf = (v: string) => v ? parseFloat(v) : null;
      const pi = (v: string) => v ? parseInt(v) : null;
      const { error } = await supabase.from("players").update({
        full_name: formData.full_name, slug: generateSlug(formData.full_name),
        position: formData.position, secondary_positions: formData.secondary_positions,
        nationality: formData.nationality, birth_date: formData.birth_date || null, age,
        height: pi(formData.height), dominant_foot: formData.dominant_foot || null,
        current_club: formData.current_club || null, country: formData.country || null,
        bio_public: formData.bio_public || null, highlight_video_url: formData.highlight_video_url || null,
        is_public: formData.is_public, photo_url,
        weight: pf(formData.weight), body_fat_percentage: pf(formData.body_fat_percentage),
        muscle_mass: pf(formData.muscle_mass), wingspan: pi(formData.wingspan),
        max_speed: pf(formData.max_speed), sprint_30m: pf(formData.sprint_30m),
        vo2_max: pf(formData.vo2_max), last_physical_evaluation: formData.last_physical_evaluation || null,
        playing_height_preference: formData.playing_height_preference || null,
        play_style: formData.play_style || null, primary_tactical_role: formData.primary_tactical_role || null,
        secondary_tactical_role: formData.secondary_tactical_role || null,
        strengths: formData.strengths, areas_to_develop: formData.areas_to_develop,
        contract_start: formData.contract_start || null, contract_end: formData.contract_end || null,
        contract_notes: formData.contract_notes || null,
        salary_info: formatLegacySalary(formData.salary_amount, formData.salary_currency),
        release_clause: formatLegacySalary(formData.release_clause_amount, formData.release_clause_currency),
        contract_status: formData.contract_status || null, passports: formData.passports,
        agent_name: formData.agent_name || null, agent_contact: formData.agent_contact || null,
        physical_status: formData.physical_status || null, medical_notes: formData.medical_notes || null,
        ...(isAdmin && {
          overall_rating: pf(formData.overall_rating), potential_rating: pf(formData.potential_rating),
          ready_to_compete: formData.ready_to_compete, estimated_level: formData.estimated_level || null,
          internal_evaluation_notes: formData.internal_evaluation_notes || null,
        }),
        internal_notes: formData.internal_notes || null,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Atleta atualizado com sucesso!");
      navigate(`/dashboard/atletas/${id}`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar atleta");
    } finally {
      setLoading(false);
    }
  };

  // ─── GUARDS ───────────────────────────────────────────────────────────────

  if (!canEdit) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <Shield className="w-16 h-16 text-zinc-600" />
      <h2 className="text-xl font-semibold text-white">Acesso Restrito</h2>
      <p className="text-zinc-400">Você não tem permissão para editar atletas.</p>
      <button onClick={() => navigate("/dashboard/atletas")} className="px-4 py-2 bg-zinc-800 text-white rounded-xl text-sm">Voltar</button>
    </div>
  );

  if (fetching) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-6 h-6 animate-spin text-red-500" />
    </div>
  );

  // ─── TAG INPUT ────────────────────────────────────────────────────────────

  const TagInput = ({ field, label, options, color = "default" }: {
    field: "strengths" | "areas_to_develop" | "passports";
    label: string; options?: string[]; color?: "green" | "amber" | "default";
  }) => {
    const tagKey = field;
    const colMap = {
      green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      default: "bg-zinc-800 text-zinc-300 border-zinc-700",
    };
    return (
      <div className="space-y-3">
        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</label>
        <div className="flex flex-wrap gap-2 min-h-[32px]">
          {safeArray(formData[field]).map(tag => (
            <span key={tag} className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border", colMap[color])}>
              {tag}
              <button type="button" onClick={() => removeTag(field, tag)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        {options ? (
          <Select onValueChange={val => addTag(field, val)}>
            <SelectTrigger className="h-11 bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-zinc-300 focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
              <SelectValue placeholder="Adicionar..." />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 border-zinc-700">
              {safeArray(options).filter(o => !safeArray(formData[field]).includes(o)).map(opt => (
                <SelectItem key={opt} value={opt} className="text-zinc-200 focus:bg-zinc-700">{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex gap-2">
            <input
              className={inputCls}
              placeholder="Adicionar e pressionar Enter..."
              value={newTag[tagKey] || ""}
              onChange={e => setNewTag(p => ({ ...p, [tagKey]: e.target.value }))}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(field, newTag[tagKey] || "");
                  setNewTag(p => ({ ...p, [tagKey]: "" }));
                }
              }}
            />
            <button type="button"
              onClick={() => { addTag(field, newTag[tagKey] || ""); setNewTag(p => ({ ...p, [tagKey]: "" })); }}
              className="w-[52px] h-[52px] bg-zinc-800 border border-zinc-700/60 rounded-xl flex items-center justify-center text-zinc-300 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 pb-32">

      {/* ── Sticky Header ── */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(`/dashboard/atletas/${id}`)}
              className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-all flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white">Editar Atleta</h1>
              <p className="text-sm text-zinc-500 truncate max-w-[200px] sm:max-w-none">{playerName}</p>
            </div>
          </div>

          {/* Progress ring */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Perfil</p>
              <p className="text-sm font-bold text-white">{profileProgress}%</p>
            </div>
            <div className="relative w-11 h-11">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgb(39,39,42)" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none" stroke="#E5173F" strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${(profileProgress / 100) * CIRC} ${CIRC}`}
                  className="transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
                {profileProgress}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* ── Tab Bar ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
          <div className="flex gap-1 p-1 w-full bg-zinc-900 rounded-2xl border border-zinc-800/80 overflow-x-auto scrollbar-none">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 flex-1 min-w-max",
                  activeTab === tab.id
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content ── */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── BÁSICO ── */}
          {activeTab === "basic" && (
            <div className="grid gap-6 lg:grid-cols-[340px_1fr]">

              {/* Photo upload */}
              <SectionCard icon={Upload} title="Foto do Atleta">
                <div
                  className={cn(
                    "aspect-[3/4] relative rounded-2xl border-2 border-dashed overflow-hidden cursor-pointer transition-all duration-200",
                    dragActive ? "border-red-500 bg-red-500/5 scale-[1.01]" : "border-zinc-700 bg-zinc-800/40 hover:border-zinc-600"
                  )}
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <>
                      <img src={photoPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover object-top" draggable={false} />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleRemovePhoto(); }}
                        className="absolute top-3 right-3 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors z-10"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent h-24 pointer-events-none" />
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-700/60 flex items-center justify-center">
                        <Upload className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-300">Arraste ou clique para enviar</p>
                        <p className="text-xs text-zinc-600 mt-1">JPG, PNG, WebP · máx 8 MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
              </SectionCard>

              {/* Basic info */}
              <SectionCard icon={User} title="Informações Básicas">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Nome Completo" required filled={!!formData.full_name}>
                      <input className={inputCls} value={formData.full_name} onChange={e => handleChange("full_name", e.target.value)} placeholder="Ex: João Silva" required />
                    </Field>
                  </div>
                  <Field label="Posição Principal" required filled={!!formData.position}>
                    <Select value={formData.position} onValueChange={val => handleChange("position", val)}>
                      <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {positions.map(p => <SelectItem key={p} value={p} className="text-zinc-200 focus:bg-zinc-700">{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nacionalidade" required filled={!!formData.nationality}>
                    <Select value={formData.nationality} onValueChange={val => handleChange("nationality", val)}>
                      <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {nationalities.map(n => <SelectItem key={n} value={n} className="text-zinc-200 focus:bg-zinc-700">{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Data de Nascimento" filled={!!formData.birth_date}>
                    <input type="date" className={inputCls} value={formData.birth_date} onChange={e => handleChange("birth_date", e.target.value)} />
                  </Field>
                  <Field label="Clube Atual" filled={!!formData.current_club}>
                    <input className={inputCls} value={formData.current_club} onChange={e => handleChange("current_club", e.target.value)} placeholder="Ex: Atlético-MS" />
                  </Field>
                  <Field label="País de Atuação">
                    <input className={inputCls} value={formData.country} onChange={e => handleChange("country", e.target.value)} placeholder="Brasil" />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Link do Vídeo de Destaque">
                      <input className={inputCls} value={formData.highlight_video_url} onChange={e => handleChange("highlight_video_url", e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                      {formData.highlight_video_url && (
                        <p className={cn("text-xs mt-1.5", extractYouTubeVideoId(formData.highlight_video_url) ? "text-emerald-400" : "text-red-400")}>
                          {extractYouTubeVideoId(formData.highlight_video_url) ? `✓ Vídeo detectado: ${extractYouTubeVideoId(formData.highlight_video_url)}` : "✗ URL inválida. Use um link do YouTube."}
                        </p>
                      )}
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Biografia Pública">
                      <textarea className={cn(textareaCls, "h-24")} value={formData.bio_public} onChange={e => handleChange("bio_public", e.target.value)} placeholder="Breve descrição do atleta para o perfil público..." />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 flex items-center justify-between p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <div>
                      <p className="text-sm font-medium text-white">Exibir no site público</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Torna o perfil visível em /players</p>
                    </div>
                    <Switch checked={formData.is_public} onCheckedChange={v => handleChange("is_public", v)} />
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {/* ── FÍSICO ── */}
          {activeTab === "physical" && (
            <SectionCard icon={Activity} title="Dados Físicos">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: "Altura (cm)", field: "height", type: "number" },
                  { label: "Peso (kg)", field: "weight", type: "number", step: "0.1" },
                  { label: "% Gordura Corporal", field: "body_fat_percentage", type: "number", step: "0.1" },
                  { label: "Massa Muscular (kg)", field: "muscle_mass", type: "number", step: "0.1" },
                  { label: "Envergadura (cm)", field: "wingspan", type: "number" },
                  { label: "Velocidade Máxima (km/h)", field: "max_speed", type: "number", step: "0.1" },
                  { label: "Sprint 30m (s)", field: "sprint_30m", type: "number", step: "0.01" },
                  { label: "VO₂ Máx (ml/kg/min)", field: "vo2_max", type: "number", step: "0.1" },
                  { label: "Última Avaliação Física", field: "last_physical_evaluation", type: "date" },
                ].map(({ label, field, type, step }) => (
                  <Field key={field} label={label} filled={!!(formData as any)[field]}>
                    <input
                      type={type}
                      step={step}
                      className={inputCls}
                      value={(formData as any)[field]}
                      onChange={e => handleChange(field as keyof FormData, e.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ── TÉCNICO ── */}
          {activeTab === "technical" && (
            <SectionCard icon={Target} title="Perfil Técnico">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                <Field label="Pé Dominante" filled={!!formData.dominant_foot}>
                  <Select value={formData.dominant_foot} onValueChange={val => handleChange("dominant_foot", val)}>
                    <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {["Direito", "Esquerdo", "Ambidestro"].map(v => <SelectItem key={v} value={v} className="text-zinc-200 focus:bg-zinc-700">{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Altura de Jogo">
                  <Select value={formData.playing_height_preference} onValueChange={val => handleChange("playing_height_preference", val)}>
                    <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {["Baixo", "Médio", "Alto"].map(v => <SelectItem key={v} value={v} className="text-zinc-200 focus:bg-zinc-700">{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Estilo de Jogo" filled={!!formData.play_style}>
                  <Select value={formData.play_style} onValueChange={val => handleChange("play_style", val)}>
                    <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {playStyles.map(s => <SelectItem key={s} value={s} className="text-zinc-200 focus:bg-zinc-700">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Função Tática Principal">
                  <Select value={formData.primary_tactical_role} onValueChange={val => handleChange("primary_tactical_role", val)}>
                    <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {tacticalRoles.map(r => <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-700">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Função Tática Secundária">
                  <Select value={formData.secondary_tactical_role} onValueChange={val => handleChange("secondary_tactical_role", val)}>
                    <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {tacticalRoles.map(r => <SelectItem key={r} value={r} className="text-zinc-200 focus:bg-zinc-700">{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="border-t border-zinc-800 pt-6 grid gap-6 sm:grid-cols-2">
                <TagInput field="strengths" label="Pontos Fortes" options={strengthOptions} color="green" />
                <TagInput field="areas_to_develop" label="Pontos a Desenvolver" options={strengthOptions} color="amber" />
              </div>
            </SectionCard>
          )}

          {/* ── ESTATÍSTICAS ── */}
          {activeTab === "stats" && (
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800/80 overflow-hidden">
              {id && <PlayerStatsForm playerId={id} playerPosition={formData.position} />}
            </div>
          )}

          {/* ── MÉDICO ── */}
          {activeTab === "medical" && (
            <SectionCard icon={Stethoscope} title="Informações Médicas">
              <div className="space-y-4">
                <Field label="Status Físico" filled={!!formData.physical_status}>
                  <Select value={formData.physical_status} onValueChange={val => handleChange("physical_status", val)}>
                    <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      <SelectItem value="fit" className="text-zinc-200 focus:bg-zinc-700">✓ Apto</SelectItem>
                      <SelectItem value="recovering" className="text-zinc-200 focus:bg-zinc-700">⚠ Em Recuperação</SelectItem>
                      <SelectItem value="transition" className="text-zinc-200 focus:bg-zinc-700">↔ Transição</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Observações Médicas">
                  <textarea className={cn(textareaCls, "h-32")} value={formData.medical_notes} onChange={e => handleChange("medical_notes", e.target.value)} placeholder="Notas sobre condições médicas, restrições, histórico..." />
                </Field>
                <p className="text-xs text-zinc-600 flex items-center gap-2">
                  <span>💡</span> O histórico de lesões pode ser gerenciado na página de detalhes do atleta.
                </p>
              </div>
            </SectionCard>
          )}

          {/* ── CONTRATO ── */}
          {activeTab === "contract" && (
            <SectionCard icon={FileText} title="Situação Contratual">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Status Contratual" filled={!!formData.contract_status}>
                    <Select value={formData.contract_status} onValueChange={val => handleChange("contract_status", val)}>
                      <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="contracted" className="text-zinc-200 focus:bg-zinc-700">Contratado</SelectItem>
                        <SelectItem value="free" className="text-zinc-200 focus:bg-zinc-700">Livre</SelectItem>
                        <SelectItem value="loan" className="text-zinc-200 focus:bg-zinc-700">Empréstimo</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Início do Contrato" filled={!!formData.contract_start}>
                    <input type="date" className={inputCls} value={formData.contract_start} onChange={e => handleChange("contract_start", e.target.value)} />
                  </Field>
                  <Field label="Fim do Contrato" filled={!!formData.contract_end}>
                    <input type="date" className={inputCls} value={formData.contract_end} onChange={e => handleChange("contract_end", e.target.value)} />
                  </Field>
                  <Field label="Empresário / Agência">
                    <input className={inputCls} value={formData.agent_name} onChange={e => handleChange("agent_name", e.target.value)} placeholder="Nome do agente" />
                  </Field>
                  <Field label="Contato do Agente">
                    <input className={inputCls} value={formData.agent_contact} onChange={e => handleChange("agent_contact", e.target.value)} placeholder="Email ou telefone" />
                  </Field>
                  <Field label="Multa Rescisória">
                    <CurrencyInput
                      value={formData.release_clause_amount}
                      currency={formData.release_clause_currency}
                      onValueChange={val => handleChange("release_clause_amount", val)}
                      onCurrencyChange={curr => handleChange("release_clause_currency", curr)}
                      placeholder="0,00"
                    />
                  </Field>
                  <Field label="Salário">
                    <CurrencyInput
                      value={formData.salary_amount}
                      currency={formData.salary_currency}
                      onValueChange={val => handleChange("salary_amount", val)}
                      onCurrencyChange={curr => handleChange("salary_currency", curr)}
                      placeholder="0,00"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Notas de Contrato">
                      <textarea className={cn(textareaCls, "h-24")} value={formData.contract_notes} onChange={e => handleChange("contract_notes", e.target.value)} placeholder="Observações contratuais..." />
                    </Field>
                  </div>
                </div>
                <div className="border-t border-zinc-800 pt-6">
                  <TagInput field="passports" label="Passaportes" />
                </div>
              </div>
            </SectionCard>
          )}

          {/* ── AVALIAÇÃO ── */}
          {activeTab === "evaluation" && isAdmin && (
            <SectionCard icon={Eye} title="Avaliação Interna" className="border-amber-500/20 bg-amber-500/[0.03]">
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🔒 Privado — somente admins
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Nota Geral (0–10)" filled={!!formData.overall_rating}>
                    <input type="number" min="0" max="10" step="0.1" className={inputCls} value={formData.overall_rating} onChange={e => handleChange("overall_rating", e.target.value)} placeholder="Ex: 7.5" />
                  </Field>
                  <Field label="Potencial (0–10)" filled={!!formData.potential_rating}>
                    <input type="number" min="0" max="10" step="0.1" className={inputCls} value={formData.potential_rating} onChange={e => handleChange("potential_rating", e.target.value)} placeholder="Ex: 8.0" />
                  </Field>
                  <Field label="Pronto para Competir?">
                    <Select value={formData.ready_to_compete === null ? "" : formData.ready_to_compete ? "yes" : "no"} onValueChange={val => handleChange("ready_to_compete", val === "" ? null : val === "yes")}>
                      <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        <SelectItem value="yes" className="text-zinc-200 focus:bg-zinc-700">Sim</SelectItem>
                        <SelectItem value="no" className="text-zinc-200 focus:bg-zinc-700">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Nível Estimado" filled={!!formData.estimated_level}>
                    <Select value={formData.estimated_level} onValueChange={val => handleChange("estimated_level", val)}>
                      <SelectTrigger className="h-[52px] bg-zinc-800/80 border-zinc-700/60 rounded-xl text-sm text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {estimatedLevels.map(l => <SelectItem key={l} value={l} className="text-zinc-200 focus:bg-zinc-700">{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Observações da Avaliação">
                  <textarea className={cn(textareaCls, "h-28")} value={formData.internal_evaluation_notes} onChange={e => handleChange("internal_evaluation_notes", e.target.value)} placeholder="Análise interna do atleta..." />
                </Field>
                <div className="border-t border-zinc-800 pt-4">
                  <Field label="Notas Internas Gerais">
                    <textarea className={cn(textareaCls, "h-24")} value={formData.internal_notes} onChange={e => handleChange("internal_notes", e.target.value)} placeholder="Informações internas, contexto, histórico..." />
                  </Field>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── Fixed Bottom Bar ── */}
        <div className={cn(
          "fixed bottom-0 right-0 z-30 bg-zinc-950/96 backdrop-blur-md border-t border-zinc-800/60",
          "left-0",
          isCollapsed ? "lg:left-[64px]" : "lg:left-[224px]"
        )}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            {isAdmin ? (
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/10 hover:border-red-500/50 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Excluir Atleta</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/dashboard/atletas/${id}`)}
                className="px-5 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 text-sm font-medium hover:bg-zinc-800 hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-red-600/25"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      </form>

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={id ? { id, full_name: playerName } : null}
        onSuccess={() => navigate("/dashboard/atletas")}
      />

      {rawImageSrc && (
        <ImageCropperModal
          open={cropperOpen}
          onClose={() => setCropperOpen(false)}
          imageSrc={rawImageSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
