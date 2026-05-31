import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Upload, User, Shield, FileText, Loader2, BarChart3, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { extractYouTubeVideoId, safeArray } from "@/lib/utils";
import { ImageCropperModal } from "@/components/players/ImageCropperModal";
import { CurrencyInput, CurrencyCode } from "@/components/ui/currency-input";
import { formatFinancialValue } from "@/lib/formatters";

const positions = [
  "Goleiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Zagueiro",
  "Volante",
  "Meia",
  "Meia Atacante",
  "Ponta Direita",
  "Ponta Esquerda",
  "Centroavante",
  "Segundo Atacante",
];

const nationalities = [
  "Brasil",
  "Argentina",
  "Uruguai",
  "Colômbia",
  "Chile",
  "Portugal",
  "Espanha",
  "Itália",
  "França",
  "Alemanha",
];

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function NewPlayer() {
  const navigate = useNavigate();
  const { user, isAdmin, isScout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Public fields
    full_name: "",
    position: "",
    secondary_positions: [] as string[],
    nationality: "Brasil",
    birth_date: "",
    height: "",
    dominant_foot: "",
    current_club: "",
    country: "Brasil",
    bio_public: "",
    highlight_video_url: "",
    is_public: false,
    
    // Private fields
    contract_end: "",
    contract_notes: "",
    salary_amount: null as number | null,
    salary_currency: "BRL" as CurrencyCode,
    release_clause_amount: null as number | null,
    release_clause_currency: "BRL" as CurrencyCode,
    internal_notes: "",
    agent_name: "",
    agent_contact: "",
  });

  const canCreate = isAdmin || isScout;

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Acesso Restrito</h2>
        <p className="text-muted-foreground">Você não tem permissão para cadastrar atletas.</p>
        <Button onClick={() => navigate("/dashboard/players")}>Voltar</Button>
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
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.position || !formData.nationality) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setLoading(true);

    try {
      let photo_url = null;

      // Upload photo if selected
      if (photoFile) {
        const fileExt = photoFile.name.split(".").pop();
        const fileName = `${generateSlug(formData.full_name)}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data } = await supabase.storage
          .from("player-photos")
          .upload(fileName, photoFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("player-photos")
          .getPublicUrl(fileName);
        
        photo_url = urlData.publicUrl;
      }

      // Calculate age from birth_date
      let age = null;
      if (formData.birth_date) {
        const birthDate = new Date(formData.birth_date);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
      }

      const slug = generateSlug(formData.full_name);

      const { data: newPlayer, error } = await supabase.from("players").insert({
        full_name: formData.full_name,
        slug,
        position: formData.position,
        secondary_positions: formData.secondary_positions,
        nationality: formData.nationality,
        birth_date: formData.birth_date || null,
        age,
        height: formData.height ? parseInt(formData.height) : null,
        dominant_foot: formData.dominant_foot || null,
        current_club: formData.current_club || null,
        country: formData.country || null,
        bio_public: formData.bio_public || null,
        highlight_video_url: formData.highlight_video_url || null,
        is_public: formData.is_public,
        photo_url,
        contract_end: formData.contract_end || null,
        contract_notes: formData.contract_notes || null,
        salary_info: formData.salary_amount ? formatFinancialValue(formData.salary_amount, formData.salary_currency) : null,
        release_clause: formData.release_clause_amount ? formatFinancialValue(formData.release_clause_amount, formData.release_clause_currency) : null,
        internal_notes: formData.internal_notes || null,
        agent_name: formData.agent_name || null,
        agent_contact: formData.agent_contact || null,
        created_by: user?.id,
      }).select("id").single();

      if (error) throw error;

      toast.success("Atleta cadastrado! Redirecionando para adicionar estatísticas...");
      // Redirect to edit page so user can add stats
      navigate(`/dashboard/players/${newPlayer.id}/edit`);
    } catch (error: any) {
      console.error("Error creating player:", error);
      toast.error(error.message || "Erro ao cadastrar atleta");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/players")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Novo Atleta</h1>
          <p className="text-muted-foreground">Cadastre um novo atleta no sistema</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="w-40 h-40 rounded-full overflow-hidden bg-secondary/50 flex items-center justify-center border-2 border-dashed border-border">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <div className="w-full">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    JPG, PNG ou WebP. Máx 8MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange("full_name", e.target.value)}
                    placeholder="Nome completo do atleta"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="position">Posição Principal *</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => handleChange("position", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeArray(positions).map((pos) => (
                        <SelectItem key={pos} value={pos}>
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Nacionalidade *</Label>
                  <Select
                    value={formData.nationality}
                    onValueChange={(value) => handleChange("nationality", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {safeArray(nationalities).map((nat) => (
                        <SelectItem key={nat} value={nat}>
                          {nat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleChange("birth_date", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={formData.height}
                    onChange={(e) => handleChange("height", e.target.value)}
                    placeholder="Ex: 180"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dominant_foot">Pé Dominante</Label>
                  <Select
                    value={formData.dominant_foot}
                    onValueChange={(value) => handleChange("dominant_foot", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Direito">Direito</SelectItem>
                      <SelectItem value="Esquerdo">Esquerdo</SelectItem>
                      <SelectItem value="Ambidestro">Ambidestro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_club">Clube Atual</Label>
                  <Input
                    id="current_club"
                    value={formData.current_club}
                    onChange={(e) => handleChange("current_club", e.target.value)}
                    placeholder="Nome do clube"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">País de Atuação</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                    placeholder="Ex: Brasil"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="highlight_video_url">Link do Vídeo de Destaque</Label>
                <Input
                  id="highlight_video_url"
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
                <Label htmlFor="bio_public">Biografia (Pública)</Label>
                <Textarea
                  id="bio_public"
                  value={formData.bio_public}
                  onChange={(e) => handleChange("bio_public", e.target.value)}
                  placeholder="Descrição pública do atleta..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => handleChange("is_public", checked)}
                />
                <Label htmlFor="is_public" className="cursor-pointer">
                  Exibir no site público
                </Label>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Private Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Informações Privadas
              <span className="text-xs font-normal text-muted-foreground ml-2">
                (Visíveis apenas para a equipe interna)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="contract_end">Fim do Contrato</Label>
                <Input
                  id="contract_end"
                  type="date"
                  value={formData.contract_end}
                  onChange={(e) => handleChange("contract_end", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent_name">Nome do Agente</Label>
                <Input
                  id="agent_name"
                  value={formData.agent_name}
                  onChange={(e) => handleChange("agent_name", e.target.value)}
                  placeholder="Nome do empresário"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent_contact">Contato do Agente</Label>
                <Input
                  id="agent_contact"
                  value={formData.agent_contact}
                  onChange={(e) => handleChange("agent_contact", e.target.value)}
                  placeholder="Email ou telefone"
                />
              </div>
            </div>

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

            <div className="space-y-2">
              <Label htmlFor="contract_notes">Notas de Contrato</Label>
              <Textarea
                id="contract_notes"
                value={formData.contract_notes}
                onChange={(e) => handleChange("contract_notes", e.target.value)}
                placeholder="Cláusulas especiais, observações, etc."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internal_notes">Notas Internas</Label>
              <Textarea
                id="internal_notes"
                value={formData.internal_notes}
                onChange={(e) => handleChange("internal_notes", e.target.value)}
                placeholder="Observações internas sobre o atleta..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Stats Info */}
        <Alert>
          <BarChart3 className="h-4 w-4" />
          <AlertDescription>
            <strong>Estatísticas:</strong> Após cadastrar o atleta, você será redirecionado para a página de edição onde poderá adicionar estatísticas por temporada e competição.
          </AlertDescription>
        </Alert>

        <Separator />

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/players")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Cadastrar Atleta
          </Button>
        </div>
      </form>

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
