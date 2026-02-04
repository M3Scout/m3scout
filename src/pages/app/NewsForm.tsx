import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { toast } from "sonner";
import { ImageCropEditor, type CropPosition } from "@/components/news/ImageCropEditor";
import { NewsImageUpload } from "@/components/news/NewsImageUpload";

const categories = [
  "Institucional",
  "Atletas",
  "Parcerias",
  "Mercado",
  "Internacional",
];

const generateSlug = (title: string) => {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
};

type FormData = {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  status: string;
  publish_date: string;
  hero_crop: CropPosition | null;
  card_crop: CropPosition | null;
};

const NewsForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!id;

  const [formData, setFormData] = useState<FormData>({
    title: "",
    slug: "",
    category: "",
    excerpt: "",
    content: "",
    featured_image_url: "",
    status: "draft",
    publish_date: new Date().toISOString().slice(0, 16),
    hero_crop: null,
    card_crop: null,
  });

  const [slugEdited, setSlugEdited] = useState(false);

  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("id", id)
        .limit(1);
      if (error) throw error;
      const article = Array.isArray(data) ? data[0] ?? null : null;
      return article;
    },
    enabled: isEditing,
  });

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        slug: article.slug,
        category: article.category,
        excerpt: article.excerpt || "",
        content: article.content,
        featured_image_url: article.featured_image_url || "",
        status: article.status,
        publish_date: new Date(article.publish_date).toISOString().slice(0, 16),
        hero_crop: article.hero_crop as CropPosition | null,
        card_crop: article.card_crop as CropPosition | null,
      });
      setSlugEdited(true);
    }
  }, [article]);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: slugEdited ? prev.slug : generateSlug(title),
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        title: data.title,
        slug: data.slug,
        category: data.category,
        excerpt: data.excerpt || null,
        content: data.content,
        featured_image_url: data.featured_image_url || null,
        status: data.status,
        publish_date: new Date(data.publish_date).toISOString(),
        created_by: user?.id,
        hero_crop: data.hero_crop,
        card_crop: data.card_crop,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("news_articles")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("news_articles")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      queryClient.invalidateQueries({ queryKey: ["news-article", id] });
      queryClient.invalidateQueries({ queryKey: ["public-news"] });
      toast.success(isEditing ? "Notícia atualizada" : "Notícia criada");
      navigate("/app/news");
    },
    onError: (error: Error) => {
      if (error.message.includes("unique")) {
        toast.error("Este slug já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao salvar notícia");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent, status?: string) => {
    e.preventDefault();
    
    if (!formData.title || !formData.category || !formData.content) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    saveMutation.mutate({
      ...formData,
      status: status || formData.status,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-zinc-500">Carregando...</p>
      </div>
    );
  }

  const inputClasses = "bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-primary/30 focus-visible:border-zinc-700";

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <header className="admin-header animate-fade-in">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/app/news")}
            className="w-8 h-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="admin-title">
              {isEditing ? "Editar Notícia" : "Nova Notícia"}
            </h1>
            <p className="admin-subtitle">
              {isEditing ? "Atualize os dados da notícia" : "Preencha os dados para criar"}
            </p>
          </div>
        </div>
      </header>

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6 animate-fade-in delay-75">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-xs uppercase tracking-wide text-zinc-500">
            Título *
          </Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Título da notícia"
            className={inputClasses}
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug" className="text-xs uppercase tracking-wide text-zinc-500">
            Slug (URL)
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">/imprensa/</span>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, slug: e.target.value }));
                setSlugEdited(true);
              }}
              placeholder="slug-da-noticia"
              className={inputClasses}
            />
          </div>
        </div>

        {/* Category & Publish Date */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-zinc-500">
              Categoria *
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger className={inputClasses}>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {categories.map((cat) => (
                  <SelectItem 
                    key={cat} 
                    value={cat}
                    className="text-white focus:bg-zinc-800 focus:text-white"
                  >
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-zinc-500">
              Data de Publicação
            </Label>
            <Input
              type="datetime-local"
              value={formData.publish_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, publish_date: e.target.value }))
              }
              className={inputClasses}
            />
          </div>
        </div>

        {/* Featured Image Upload */}
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-zinc-500">
            Imagem Destaque
          </Label>
          <NewsImageUpload
            value={formData.featured_image_url}
            onChange={(url) =>
              setFormData((prev) => ({ 
                ...prev, 
                featured_image_url: url,
                // Reset crops when image changes
                hero_crop: null,
                card_crop: null,
              }))
            }
          />
        </div>

        {/* Image Crop Editor */}
        {formData.featured_image_url && (
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-zinc-500">
              Enquadramento da Imagem
            </Label>
            <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/30">
              <ImageCropEditor
                imageUrl={formData.featured_image_url}
                heroCrop={formData.hero_crop}
                cardCrop={formData.card_crop}
                onHeroCropChange={(crop) => 
                  setFormData((prev) => ({ ...prev, hero_crop: crop }))
                }
                onCardCropChange={(crop) => 
                  setFormData((prev) => ({ ...prev, card_crop: crop }))
                }
              />
            </div>
          </div>
        )}

        {/* Excerpt */}
        <div className="space-y-2">
          <Label htmlFor="excerpt" className="text-xs uppercase tracking-wide text-zinc-500">
            Resumo / Chamada
          </Label>
          <Textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
            }
            placeholder="Breve descrição para os cards de listagem"
            rows={2}
            className={inputClasses + " resize-none"}
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content" className="text-xs uppercase tracking-wide text-zinc-500">
            Conteúdo *
          </Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Conteúdo completo da notícia"
            rows={12}
            className={inputClasses + " resize-none"}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-zinc-800">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e, "draft")}
            disabled={saveMutation.isPending}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, "published")}
            disabled={saveMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            <Eye className="w-4 h-4 mr-2" />
            {formData.status === "published" ? "Atualizar" : "Publicar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewsForm;
