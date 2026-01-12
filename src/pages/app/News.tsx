import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Search, Edit, Trash2, Eye, EyeOff, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  status: string;
  publish_date: string;
  created_at: string;
};

const News = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, slug, category, excerpt, status, publish_date, created_at")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as NewsArticle[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("news_articles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      toast.success("Notícia excluída com sucesso");
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir notícia");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("news_articles")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      toast.success("Status atualizado");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const filteredArticles = articles?.filter((article) =>
    article.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="admin-header animate-fade-in">
        <div>
          <h1 className="admin-title">Notícias</h1>
          <p className="admin-subtitle">Gerencie o conteúdo da Sala de Imprensa</p>
        </div>
        <Link to="/app/news/new">
          <Button className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            Nova Notícia
          </Button>
        </Link>
      </header>

      {/* Search */}
      <div className="relative max-w-sm animate-fade-in delay-75">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Buscar notícias..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-zinc-900/50 border-zinc-800 text-white placeholder:text-zinc-600 focus-visible:ring-primary/30 focus-visible:border-zinc-700"
        />
      </div>

      {/* News List */}
      <div className="admin-card animate-fade-in delay-100">
        <div className="admin-card-body p-0">
          {isLoading ? (
            <div className="py-12 text-center text-zinc-500">Carregando...</div>
          ) : filteredArticles?.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              Nenhuma notícia encontrada
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/50">
              {filteredArticles?.map((article, index) => (
                <div 
                  key={article.id}
                  className="flex items-center gap-4 p-4 hover:bg-zinc-800/30 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-medium text-white truncate">
                        {article.title}
                      </p>
                      <span className={
                        article.status === "published" 
                          ? "admin-badge-success" 
                          : "admin-badge-default"
                      }>
                        {article.status === "published" ? "Publicado" : "Rascunho"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-500">
                      <span>/imprensa/{article.slug}</span>
                      <span>•</span>
                      <span>{article.category}</span>
                      <span>•</span>
                      <span>
                        {format(new Date(article.publish_date), "dd MMM yyyy", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: article.id,
                          newStatus: article.status === "published" ? "draft" : "published",
                        })
                      }
                      className="w-8 h-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                      title={article.status === "published" ? "Despublicar" : "Publicar"}
                    >
                      {article.status === "published" ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      asChild
                      className="w-8 h-8 text-zinc-500 hover:text-white hover:bg-zinc-800"
                    >
                      <Link to={`/app/news/${article.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(article.id)}
                      className="w-8 h-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Excluir notícia?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Esta ação não pode ser desfeita. A notícia será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default News;
