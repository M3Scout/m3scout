import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Eye } from "lucide-react";
import { toast } from "sonner";

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
  });

  const [slugEdited, setSlugEdited] = useState(false);

  // Fetch existing article if editing
  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("news_articles")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
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
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/app/news")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? "Editar Notícia" : "Nova Notícia"}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? "Atualize os dados da notícia" : "Preencha os dados para criar uma nova notícia"}
          </p>
        </div>
      </div>

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Título da notícia"
          />
        </div>

        {/* Slug */}
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/imprensa/</span>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, slug: e.target.value }));
                setSlugEdited(true);
              }}
              placeholder="slug-da-noticia"
            />
          </div>
        </div>

        {/* Category & Status */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Data de Publicação</Label>
            <Input
              type="datetime-local"
              value={formData.publish_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, publish_date: e.target.value }))
              }
            />
          </div>
        </div>

        {/* Featured Image */}
        <div className="space-y-2">
          <Label htmlFor="featured_image_url">URL da Imagem Destaque</Label>
          <Input
            id="featured_image_url"
            value={formData.featured_image_url}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, featured_image_url: e.target.value }))
            }
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>

        {/* Excerpt */}
        <div className="space-y-2">
          <Label htmlFor="excerpt">Resumo / Chamada</Label>
          <Textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, excerpt: e.target.value }))
            }
            placeholder="Breve descrição para os cards de listagem"
            rows={2}
          />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <Label htmlFor="content">Conteúdo *</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, content: e.target.value }))
            }
            placeholder="Conteúdo completo da notícia (suporta texto simples)"
            rows={12}
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => handleSubmit(e, "draft")}
            disabled={saveMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e, "published")}
            disabled={saveMutation.isPending}
          >
            <Eye className="w-4 h-4 mr-2" />
            {formData.status === "published" ? "Atualizar Publicação" : "Publicar"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NewsForm;
