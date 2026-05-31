import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Upload, 
  User, 
  Shield, 
  Loader2, 
  Trash2, 
  Activity, 
  Target, 
  Stethoscope, 
  FileText,
  Eye,
  X,
  Plus,
  BarChart3
} from "lucide-react";
import { PlayerStatsForm } from "@/components/players/PlayerStatsForm";
import { toast } from "sonner";
import { extractYouTubeVideoId, safeArray } from "@/lib/utils";
import { DeletePlayerDialog } from "@/components/players/DeletePlayerDialog";
import { ImageCropperModal } from "@/components/players/ImageCropperModal";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const positions = [
  "Goleiro", "Lateral Direito", "Lateral Esquerdo", "Zagueiro", "Volante",
  "Meia", "Meia Atacante", "Ponta Direita", "Ponta Esquerda", "Centroavante", "Segundo Atacante",
];

const nationalities = [
  "Brasil", "Argentina", "Uruguai", "Colômbia", "Chile", "Portugal", "Espanha", "Itália", "França", "Alemanha",
];

const playStyles = [
  "Box-to-Box",
  "Volante de Contenção",
  "Armador Recuado",
  "Meia-Armador",
  "Mezzala",
  "Falso Trequartista",
  "Falso Ponta",
  "Ponta Invertido",
  "Falso 9",
  "Oportunista",
  "Zagueiro Construtor",
  "Goleiro-Linha",
];

const tacticalRoles = [
  "Zagueiro Central", "Líbero", "Lateral Ofensivo", "Lateral Defensivo",
  "Volante", "Primeiro Volante", "Segundo Volante", "Meia Central",
  "Meia Ofensivo", "Ponta", "Atacante de Área", "Falso 9",
];

const strengthOptions = [
  "Passe Longo", "Drible", "Finalização", "Cabeceio", "Marcação",
  "Velocidade", "Força Física", "Posicionamento", "Visão de Jogo", "Liderança",
  "Bola Parada", "Jogo Aéreo", "Antecipação", "Controle de Bola", "Cruzamento",
];

const estimatedLevels = [
  "Série D", "Série C", "Série B", "Série A", "Internacional",
];

import { CurrencyInput, CurrencyCode, parseCurrencyValue } from "@/components/ui/currency-input";
import { formatFinancialValue } from "@/lib/formatters";

// Helper functions to parse legacy string-based salary/release clause
const parseSalaryFromLegacy = (value: string | null | undefined): number | null => {
  if (!value) return null;
  // Remove currency symbols and format characters
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

const formatLegacySalary = (amount: number | null, currency: CurrencyCode): string | null => {
  if (amount === null || amount === undefined) return null;
  return formatFinancialValue(amount, currency);
};

interface FormData {
  // Basic
  full_name: string;
  position: string;
  secondary_positions: string[];
  nationality: string;
  birth_date: string;
  height: string;
  dominant_foot: string;
  current_club: string;
  country: string;
  bio_public: string;
  highlight_video_url: string;
  is_public: boolean;
  // Physical
  weight: string;
  body_fat_percentage: string;
  muscle_mass: string;
  wingspan: string;
  max_speed: string;
  sprint_30m: string;
  vo2_max: string;
  last_physical_evaluation: string;
  // Technical
  playing_height_preference: string;
  play_style: string;
  primary_tactical_role: string;
  secondary_tactical_role: string;
  strengths: string[];
  areas_to_develop: string[];
  // Contract
  contract_start: string;
  contract_end: string;
  contract_notes: string;
  salary_amount: number | null;
  salary_currency: CurrencyCode;
  release_clause_amount: number | null;
  release_clause_currency: CurrencyCode;
  contract_status: string;
  passports: string[];
  agent_name: string;
  agent_contact: string;
  // Medical
  physical_status: string;
  medical_notes: string;
  // Internal Evaluation
  overall_rating: string;
  potential_rating: string;
  ready_to_compete: boolean | null;
  estimated_level: string;
  internal_evaluation_notes: string;
  internal_notes: string;
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
  overall_rating: "", potential_rating: "", ready_to_compete: null,
  estimated_level: "", internal_evaluation_notes: "", internal_notes: "",
};

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
  const [newTag, setNewTag] = useState("");
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const canEdit = isAdmin || isScout;

  useEffect(() => {
    const fetchPlayer = async () => {
      if (!id) return;

      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", id)
        .limit(1);

      const playerRow = Array.isArray(data) ? data[0] ?? null : null;
      if (error || !playerRow) {
        toast.error("Atleta não encontrado");
        navigate("/dashboard/players");
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
        overall_rating: playerRow.overall_rating?.toString() || "",
        potential_rating: playerRow.potential_rating?.toString() || "",
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

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para editar atletas.</p>
        <Button onClick={() => navigate("/dashboard/players")}>Voltar</Button>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WebP.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Arquivo muito grande. Máximo 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setRawImageSrc(reader.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Clear input so same file can be selected again
    e.target.value = "";
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Create a File from Blob for upload
    const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    setPhotoFile(croppedFile);
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(croppedBlob);
    setPhotoPreview(previewUrl);
    
    toast.success("Foto ajustada com sucesso!");
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const handleChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setExistingPhotoUrl(null);
  };

  const addTag = (field: "strengths" | "areas_to_develop" | "passports", value: string) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      handleChange(field, [...formData[field], value.trim()]);
    }
  };

  const removeTag = (field: "strengths" | "areas_to_develop" | "passports", value: string) => {
    handleChange(field, formData[field].filter((t) => t !== value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name || !formData.position || !formData.nationality) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      let photo_url = existingPhotoUrl;

      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${generateSlug(formData.full_name)}-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("player-photos").upload(fileName, photoFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("player-photos").getPublicUrl(fileName);
        photo_url = urlData.publicUrl;
      }

      let age = null;
      if (formData.birth_date) {
        const birthDate = new Date(formData.birth_date);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
      }

      const parseNum = (val: string) => val ? parseFloat(val) : null;
      const parseInt_ = (val: string) => val ? parseInt(val) : null;

      const { error } = await supabase
        .from("players")
        .update({
          full_name: formData.full_name,
          slug: generateSlug(formData.full_name),
          position: formData.position,
          secondary_positions: formData.secondary_positions,
          nationality: formData.nationality,
          birth_date: formData.birth_date || null,
          age,
          height: parseInt_(formData.height),
          dominant_foot: formData.dominant_foot || null,
          current_club: formData.current_club || null,
          country: formData.country || null,
          bio_public: formData.bio_public || null,
          highlight_video_url: formData.highlight_video_url || null,
          is_public: formData.is_public,
          photo_url,
          // Physical
          weight: parseNum(formData.weight),
          body_fat_percentage: parseNum(formData.body_fat_percentage),
          muscle_mass: parseNum(formData.muscle_mass),
          wingspan: parseInt_(formData.wingspan),
          max_speed: parseNum(formData.max_speed),
          sprint_30m: parseNum(formData.sprint_30m),
          vo2_max: parseNum(formData.vo2_max),
          last_physical_evaluation: formData.last_physical_evaluation || null,
          // Technical
          playing_height_preference: formData.playing_height_preference || null,
          play_style: formData.play_style || null,
          primary_tactical_role: formData.primary_tactical_role || null,
          secondary_tactical_role: formData.secondary_tactical_role || null,
          strengths: formData.strengths,
          areas_to_develop: formData.areas_to_develop,
          // Contract
          contract_start: formData.contract_start || null,
          contract_end: formData.contract_end || null,
          contract_notes: formData.contract_notes || null,
          salary_info: formatLegacySalary(formData.salary_amount, formData.salary_currency),
          release_clause: formatLegacySalary(formData.release_clause_amount, formData.release_clause_currency),
          contract_status: formData.contract_status || null,
          passports: formData.passports,
          agent_name: formData.agent_name || null,
          agent_contact: formData.agent_contact || null,
          // Medical
          physical_status: formData.physical_status || null,
          medical_notes: formData.medical_notes || null,
          // Internal Evaluation (Admin only)
          ...(isAdmin && {
            overall_rating: parseNum(formData.overall_rating),
            potential_rating: parseNum(formData.potential_rating),
            ready_to_compete: formData.ready_to_compete,
            estimated_level: formData.estimated_level || null,
            internal_evaluation_notes: formData.internal_evaluation_notes || null,
          }),
          internal_notes: formData.internal_notes || null,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success("Atleta atualizado com sucesso!");
      navigate(`/dashboard/players/${id}`);
    } catch (error: any) {
      console.error("Error updating player:", error);
      toast.error(error.message || "Erro ao atualizar atleta");
    } finally {
      setLoading(false);
    }
  };

  const TagInput = ({ 
    field, 
    label, 
    options,
    color = "default"
  }: { 
    field: "strengths" | "areas_to_develop" | "passports"; 
    label: string;
    options?: string[];
    color?: "green" | "amber" | "default";
  }) => {
    const colorClasses = {
      green: "bg-green-500/10 text-green-600 border-green-500/20",
      amber: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      default: "bg-secondary",
    };

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex flex-wrap gap-2 mb-2">
          {safeArray(formData[field]).map((tag) => (
            <Badge key={tag} variant="outline" className={colorClasses[color]}>
              {tag}
              <button type="button" onClick={() => removeTag(field, tag)} className="ml-1">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        {options ? (
          <Select onValueChange={(val) => addTag(field, val)}>
            <SelectTrigger><SelectValue placeholder="Adicionar..." /></SelectTrigger>
            <SelectContent>
              {safeArray(options).filter((o) => !safeArray(formData[field]).includes(o)).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex gap-2">
            <Input 
              placeholder="Adicionar..." 
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(field, newTag);
                  setNewTag("");
                }
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => { addTag(field, newTag); setNewTag(""); }}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/players")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Editar Atleta</h1>
          <p className="text-muted-foreground">{playerName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 h-auto">
            <TabsTrigger value="basic" className="gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Básico</span>
            </TabsTrigger>
            <TabsTrigger value="physical" className="gap-2">
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Físico</span>
            </TabsTrigger>
            <TabsTrigger value="technical" className="gap-2">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Técnico</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Estatísticas</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="gap-2">
              <Stethoscope className="w-4 h-4" />
              <span className="hidden sm:inline">Médico</span>
            </TabsTrigger>
            <TabsTrigger value="contract" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Contrato</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="evaluation" className="gap-2">
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Avaliação</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Basic Tab */}
          <TabsContent value="basic">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Photo Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Foto do Atleta
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-40 h-40 rounded-full overflow-hidden bg-secondary/50 flex items-center justify-center border-2 border-dashed border-border relative">
                      {photoPreview ? (
                        <>
                          <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" width={200} height={200} />
                          <button type="button" onClick={handleRemovePhoto}
                            className="absolute top-1 right-1 p-1 bg-destructive rounded-full text-destructive-foreground hover:bg-destructive/80 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <User className="w-16 h-16 text-muted-foreground" />
                      )}
                    </div>
                    <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} className="cursor-pointer" />
                  </div>
                </CardContent>
              </Card>

              {/* Basic Info */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Informações Básicas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nome Completo *</Label>
                      <Input value={formData.full_name} onChange={(e) => handleChange("full_name", e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Posição Principal *</Label>
                      <Select value={formData.position} onValueChange={(val) => handleChange("position", val)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {safeArray(positions).map((pos) => <SelectItem key={pos} value={pos}>{pos}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nacionalidade *</Label>
                      <Select value={formData.nationality} onValueChange={(val) => handleChange("nationality", val)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {safeArray(nationalities).map((nat) => <SelectItem key={nat} value={nat}>{nat}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Data de Nascimento</Label>
                      <Input type="date" value={formData.birth_date} onChange={(e) => handleChange("birth_date", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Clube Atual</Label>
                      <Input value={formData.current_club} onChange={(e) => handleChange("current_club", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>País de Atuação</Label>
                      <Input value={formData.country} onChange={(e) => handleChange("country", e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Link do Vídeo de Destaque</Label>
                    <Input 
                      value={formData.highlight_video_url} 
                      onChange={(e) => handleChange("highlight_video_url", e.target.value)} 
                      placeholder="https://youtube.com/watch?v=... ou youtu.be/..."
                    />
                    {formData.highlight_video_url && (
                      extractYouTubeVideoId(formData.highlight_video_url) ? (
                        <p className="text-xs text-emerald-500">
                          ✓ Vídeo detectado: {extractYouTubeVideoId(formData.highlight_video_url)}
                        </p>
                      ) : (
                        <p className="text-xs text-destructive">
                          ✗ URL inválida. Use um link do YouTube ou ID do vídeo.
                        </p>
                      )
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Biografia Pública</Label>
                    <Textarea value={formData.bio_public} onChange={(e) => handleChange("bio_public", e.target.value)} rows={3} />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch checked={formData.is_public} onCheckedChange={(checked) => handleChange("is_public", checked)} />
                    <Label className="cursor-pointer">Exibir no site público</Label>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Physical Tab */}
          <TabsContent value="physical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Dados Físicos
                </CardTitle>
                <CardDescription>Informações físicas e de desempenho do atleta</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Altura (cm)</Label>
                    <Input type="number" value={formData.height} onChange={(e) => handleChange("height", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso (kg)</Label>
                    <Input type="number" step="0.1" value={formData.weight} onChange={(e) => handleChange("weight", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>% Gordura Corporal</Label>
                    <Input type="number" step="0.1" value={formData.body_fat_percentage} onChange={(e) => handleChange("body_fat_percentage", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Massa Muscular (kg)</Label>
                    <Input type="number" step="0.1" value={formData.muscle_mass} onChange={(e) => handleChange("muscle_mass", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Envergadura (cm)</Label>
                    <Input type="number" value={formData.wingspan} onChange={(e) => handleChange("wingspan", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Velocidade Máxima (km/h)</Label>
                    <Input type="number" step="0.1" value={formData.max_speed} onChange={(e) => handleChange("max_speed", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Sprint 30m (s)</Label>
                    <Input type="number" step="0.01" value={formData.sprint_30m} onChange={(e) => handleChange("sprint_30m", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>VO2 Máx (ml/kg/min)</Label>
                    <Input type="number" step="0.1" value={formData.vo2_max} onChange={(e) => handleChange("vo2_max", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Última Avaliação Física</Label>
                    <Input type="date" value={formData.last_physical_evaluation} onChange={(e) => handleChange("last_physical_evaluation", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Technical Tab */}
          <TabsContent value="technical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Perfil Técnico
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Pé Dominante</Label>
                    <Select value={formData.dominant_foot} onValueChange={(val) => handleChange("dominant_foot", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Direito">Direito</SelectItem>
                        <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                        <SelectItem value="Ambidestro">Ambidestro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Altura de Jogo</Label>
                    <Select value={formData.playing_height_preference} onValueChange={(val) => handleChange("playing_height_preference", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Baixo">Baixo</SelectItem>
                        <SelectItem value="Médio">Médio</SelectItem>
                        <SelectItem value="Alto">Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estilo de Jogo</Label>
                    <Select value={formData.play_style} onValueChange={(val) => handleChange("play_style", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {safeArray(playStyles).map((style) => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Função Tática Principal</Label>
                    <Select value={formData.primary_tactical_role} onValueChange={(val) => handleChange("primary_tactical_role", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {safeArray(tacticalRoles).map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Função Tática Secundária</Label>
                    <Select value={formData.secondary_tactical_role} onValueChange={(val) => handleChange("secondary_tactical_role", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {safeArray(tacticalRoles).map((role) => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="grid gap-6 sm:grid-cols-2">
                  <TagInput field="strengths" label="Pontos Fortes" options={strengthOptions} color="green" />
                  <TagInput field="areas_to_develop" label="Pontos a Desenvolver" options={strengthOptions} color="amber" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats">
            {id && <PlayerStatsForm playerId={id} playerPosition={formData.position} />}
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  Informações Médicas
                </CardTitle>
                <CardDescription>Status físico e observações médicas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Status Físico</Label>
                    <Select value={formData.physical_status} onValueChange={(val) => handleChange("physical_status", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fit">Apto</SelectItem>
                        <SelectItem value="recovering">Em Recuperação</SelectItem>
                        <SelectItem value="transition">Transição</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observações Médicas</Label>
                  <Textarea value={formData.medical_notes} onChange={(e) => handleChange("medical_notes", e.target.value)} rows={4}
                    placeholder="Notas sobre condições médicas, restrições, etc." />
                </div>
                <p className="text-sm text-muted-foreground">
                  💡 O histórico de lesões pode ser gerenciado na página de detalhes do atleta.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contract Tab */}
          <TabsContent value="contract">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Situação Contratual
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.contract_status} onValueChange={(val) => handleChange("contract_status", val)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contracted">Contratado</SelectItem>
                        <SelectItem value="free">Livre</SelectItem>
                        <SelectItem value="loan">Empréstimo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Início do Contrato</Label>
                    <Input type="date" value={formData.contract_start} onChange={(e) => handleChange("contract_start", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim do Contrato</Label>
                    <Input type="date" value={formData.contract_end} onChange={(e) => handleChange("contract_end", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Empresário/Agência</Label>
                    <Input value={formData.agent_name} onChange={(e) => handleChange("agent_name", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contato do Agente</Label>
                    <Input value={formData.agent_contact} onChange={(e) => handleChange("agent_contact", e.target.value)} />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Multa Rescisória</Label>
                    <CurrencyInput
                      value={formData.release_clause_amount}
                      currency={formData.release_clause_currency}
                      onValueChange={(val) => handleChange("release_clause_amount", val)}
                      onCurrencyChange={(curr) => handleChange("release_clause_currency", curr)}
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <TagInput field="passports" label="Passaportes" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Salário</Label>
                    <CurrencyInput
                      value={formData.salary_amount}
                      currency={formData.salary_currency}
                      onValueChange={(val) => handleChange("salary_amount", val)}
                      onCurrencyChange={(curr) => handleChange("salary_currency", curr)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Notas de Contrato</Label>
                    <Textarea value={formData.contract_notes} onChange={(e) => handleChange("contract_notes", e.target.value)} rows={3} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluation Tab (Admin only) */}
          {isAdmin && (
            <TabsContent value="evaluation">
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-amber-500" />
                    Avaliação Interna
                    <Badge variant="outline" className="ml-2 text-xs bg-amber-500/10 text-amber-600">Privado</Badge>
                  </CardTitle>
                  <CardDescription>Visível apenas para administradores</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Nota Geral (0-10)</Label>
                      <Input type="number" min="0" max="10" step="0.1" value={formData.overall_rating} onChange={(e) => handleChange("overall_rating", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Potencial (0-10)</Label>
                      <Input type="number" min="0" max="10" step="0.1" value={formData.potential_rating} onChange={(e) => handleChange("potential_rating", e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Pronto para Competir?</Label>
                      <Select value={formData.ready_to_compete === null ? "" : formData.ready_to_compete ? "yes" : "no"}
                        onValueChange={(val) => handleChange("ready_to_compete", val === "" ? null : val === "yes")}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Sim</SelectItem>
                          <SelectItem value="no">Não</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Nível Estimado</Label>
                      <Select value={formData.estimated_level} onValueChange={(val) => handleChange("estimated_level", val)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {safeArray(estimatedLevels).map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações da Avaliação</Label>
                    <Textarea value={formData.internal_evaluation_notes} onChange={(e) => handleChange("internal_evaluation_notes", e.target.value)} rows={4} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Notas Internas Gerais</Label>
                    <Textarea value={formData.internal_notes} onChange={(e) => handleChange("internal_notes", e.target.value)} rows={3} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Separator />

        {/* Actions */}
        <div className="flex justify-between gap-4">
          {isAdmin && (
            <Button type="button" variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="w-4 h-4" />
              Excluir Atleta
            </Button>
          )}
          <div className="flex gap-4 ml-auto">
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard/players")}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar Alterações
            </Button>
          </div>
        </div>
      </form>

      <DeletePlayerDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        player={id ? { id, full_name: playerName } : null}
        onSuccess={() => navigate("/dashboard/players")}
      />

      {/* Image Cropper Modal */}
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