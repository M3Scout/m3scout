import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { Ic } from "@/components/dash/icons";
import { Head, Seg, View } from "@/components/dash/ui";

type StatusFilter = "all" | "draft" | "published";
type SortOption = "newest" | "oldest" | "updated";
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
  
  // Filter state
  const [search, setSearch] = useState("");
  const mobileSearch = "";
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
      navigate(`/dashboard/noticias/${data.id}/editar`);
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
    if (search.trim() || mobileSearch.trim()) {
      const searchLower = (search || mobileSearch).toLowerCase();
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
  }, [articles, search, mobileSearch, statusFilter, sortBy]);

  const hasFilters = search.trim() !== "" || mobileSearch.trim() !== "" || statusFilter !== "all";

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

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(/\./g, "").replace(/ de /g, " ");
  const I = (d: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />
  );
  const ICON = {
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 3.9M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/>',
    copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  };

  return (
    <>
      <View>
        <Head title="Notícias">
          <Link className="btn r" to="/dashboard/noticias/nova"><Ic n="plus" />Nova notícia</Link>
        </Head>

        <div className="tools" style={{ ["--s" as string]: 1 }}>
          <label className="field">
            <Ic n="search" />
            <span className="sr">Buscar</span>
            <input type="search" placeholder="Buscar notícias" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <Seg
            label="Status"
            value={statusFilter}
            onPick={(v) => setStatusFilter(v as StatusFilter)}
            items={[{ v: "all", label: "Todas" }, { v: "published", label: "Publicadas" }, { v: "draft", label: "Ocultas" }]}
          />
          <select className="sel" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} aria-label="Ordenar">
            <option value="newest">Mais recentes</option>
            <option value="oldest">Mais antigas</option>
            <option value="updated">Data de publicação</option>
          </select>
        </div>

        <section className="nl" style={{ ["--s" as string]: 2 }}>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <div key={i} className="nr" style={{ height: 110, opacity: 0.4 }} />)
          ) : filteredArticles.length === 0 ? (
            <div className="empty">
              {hasFilters ? "Nenhuma notícia encontrada." : "Nenhuma notícia ainda."}
              {hasFilters && <button type="button" className="btn sm g" onClick={handleClearFilters}>Limpar filtros</button>}
            </div>
          ) : (
            filteredArticles.map((n) => {
              const pub = n.status === "published";
              return (
                <div className="nr" key={n.id} style={pub ? undefined : { opacity: 0.55 }}>
                  <span className="im">{n.featured_image_url && <img src={n.featured_image_url} alt="" loading="lazy" />}</span>
                  <div style={{ minWidth: 0 }}>
                    <h3><Link to={`/dashboard/noticias/${n.id}/editar`} style={{ textDecoration: "none" }}>{n.title}</Link></h3>
                    <p>{fmtDate(n.publish_date)}{n.category ? ` · ${n.category}` : ""} · /imprensa/{n.slug}</p>
                  </div>
                  <span className="pill c" style={{ ["--c" as string]: pub ? "var(--green)" : "var(--l3)" }}>{pub ? "Publicada" : "Oculta"}</span>
                  <div className="nr-a">
                    <a href={`/imprensa/${n.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Abrir no site" title="Abrir no site">{I(ICON.ext)}</a>
                    <button type="button" aria-label={pub ? "Ocultar" : "Publicar"} title={pub ? "Ocultar" : "Publicar"} disabled={toggleStatusMutation.isPending}
                      onClick={() => toggleStatusMutation.mutate({ id: n.id, newStatus: pub ? "draft" : "published" })}>{I(pub ? ICON.eyeoff : ICON.eye)}</button>
                    <button type="button" aria-label="Editar" title="Editar" onClick={() => navigate(`/dashboard/noticias/${n.id}/editar`)}>{I(ICON.edit)}</button>
                    <button type="button" aria-label="Duplicar" title="Duplicar" onClick={() => duplicateMutation.mutate(n)}>{I(ICON.copy)}</button>
                    {canDelete && <button className="del" type="button" aria-label="Excluir" title="Excluir" onClick={() => handleDelete(n.id)}>{I(ICON.trash)}</button>}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </View>

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
    </>
  );
};

export default News;
