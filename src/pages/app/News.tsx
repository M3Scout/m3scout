import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { useIsMobile } from "@/hooks/use-mobile";
import { NewsFilters, type StatusFilter, type SortOption } from "@/components/news/NewsFilters";
import { NewsCardMobile } from "@/components/news/NewsCardMobile";
import { NewsTableDesktop } from "@/components/news/NewsTableDesktop";
import { NewsEmptyState } from "@/components/news/NewsEmptyState";
import { NewsListSkeleton } from "@/components/news/NewsListSkeleton";

type NewsArticle = {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  status: string;
  publish_date: string;
  created_at: string;
  featured_image_url: string | null;
};

const News = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const isMobile = useIsMobile();
  
  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSlug, setDeleteSlug] = useState<string>("");

  const canDelete = can("news", "delete");

  const { data: articles, isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("news_articles")
        .select("id, title, slug, category, excerpt, status, publish_date, created_at, featured_image_url")
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
      setDeleteSlug("");
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      toast.success(
        variables.newStatus === "published" 
          ? "Notícia publicada!" 
          : "Notícia despublicada"
      );
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (article: NewsArticle) => {
      const { data, error } = await supabase
        .from("news_articles")
        .insert({
          title: `${article.title} (cópia)`,
          slug: `${article.slug}-copia-${Date.now()}`,
          category: article.category,
          excerpt: article.excerpt,
          status: "draft",
          publish_date: new Date().toISOString(),
          content: "", // Will need to fetch original content if needed
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      toast.success("Notícia duplicada como rascunho");
      navigate(`/dashboard/news/${data.id}/edit`);
    },
    onError: () => {
      toast.error("Erro ao duplicar notícia");
    },
  });

  // Filter and sort articles
  const filteredArticles = useMemo(() => {
    if (!articles) return [];

    let result = [...articles];

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(searchLower) ||
          a.slug.toLowerCase().includes(searchLower) ||
          a.category.toLowerCase().includes(searchLower)
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((a) => a.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "updated":
          return new Date(b.publish_date).getTime() - new Date(a.publish_date).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [articles, search, statusFilter, sortBy]);

  const hasFilters = search.trim() !== "" || statusFilter !== "all";

  const handleDelete = (id: string) => {
    const article = articles?.find((a) => a.id === id);
    if (article) {
      setDeleteId(id);
      setDeleteSlug(article.slug);
    }
  };

  const handleClearFilters = () => {
    setSearch("");
    setStatusFilter("all");
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between animate-fade-in">
          <div>
            <h1 className="m3-page-title">NOTÍCIAS</h1>
            <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">
              Gerencie o conteúdo da Sala de Imprensa
            </p>
          </div>
          <Button asChild className="gap-2 shrink-0 bg-[#e63946] hover:bg-[#d62839] text-white rounded-full px-5 h-9 text-sm font-semibold">
            <Link to="/dashboard/news/new">
              <Plus className="w-4 h-4" />
              Nova Notícia
            </Link>
          </Button>
        </header>

        {/* Filters */}
        <div className="animate-fade-in" style={{ animationDelay: "50ms" }}>
          <NewsFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>

        {/* Content */}
        <div className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          {isLoading ? (
            <NewsListSkeleton isMobile={isMobile} />
          ) : filteredArticles.length === 0 ? (
            <NewsEmptyState 
              hasFilters={hasFilters} 
              onClearFilters={hasFilters ? handleClearFilters : undefined}
            />
          ) : isMobile ? (
            // Mobile: Cards
            <div className="space-y-4">
              {filteredArticles.map((article, index) => (
                <div
                  key={article.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <NewsCardMobile
                    article={article}
                    onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, newStatus: status })}
                    onDuplicate={(a) => duplicateMutation.mutate(a)}
                    onDelete={handleDelete}
                    canDelete={canDelete}
                    isToggling={toggleStatusMutation.isPending}
                  />
                </div>
              ))}
            </div>
          ) : (
            // Desktop: Table
            <NewsTableDesktop
              articles={filteredArticles}
              onToggleStatus={(id, status) => toggleStatusMutation.mutate({ id, newStatus: status })}
              onDuplicate={(a) => duplicateMutation.mutate(a)}
              onDelete={handleDelete}
              canDelete={canDelete}
              isToggling={toggleStatusMutation.isPending}
            />
          )}
        </div>

        {/* Results count */}
        {!isLoading && filteredArticles.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {filteredArticles.length} {filteredArticles.length === 1 ? "notícia" : "notícias"}
            {hasFilters && " encontrada(s)"}
          </p>
        )}

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => { setDeleteId(null); setDeleteSlug(""); }}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Excluir notícia?</AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400">
                Esta ação não pode ser desfeita. A notícia será removida permanentemente.
                <span className="block mt-2 font-mono text-xs text-zinc-500">
                  /imprensa/{deleteSlug}
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-zinc-800 border-zinc-700 text-white hover:bg-zinc-700 rounded-full">
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                className="bg-red-600 text-white hover:bg-red-700 rounded-full"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
};

export default News;
