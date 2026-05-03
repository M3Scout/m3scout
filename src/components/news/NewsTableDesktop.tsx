import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, EyeOff, Edit, Copy, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string | null;
  status: string;
  publish_date: string;
  created_at: string;
  featured_image_url: string | null;
}

interface NewsTableDesktopProps {
  articles: NewsArticle[];
  onToggleStatus: (id: string, newStatus: string) => void;
  onDuplicate: (article: NewsArticle) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  isToggling: boolean;
}

export function NewsTableDesktop({
  articles,
  onToggleStatus,
  onDuplicate,
  onDelete,
  canDelete,
  isToggling,
}: NewsTableDesktopProps) {
  return (
    <div className="rounded-xl border border-zinc-800/40 bg-zinc-900/50 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/50 hover:bg-transparent">
            <TableHead className="text-zinc-500 font-medium text-xs uppercase tracking-wider">Notícia</TableHead>
            <TableHead className="w-[100px] text-zinc-500 font-medium text-xs uppercase tracking-wider">Status</TableHead>
            <TableHead className="w-[100px] text-zinc-500 font-medium text-xs uppercase tracking-wider">Categoria</TableHead>
            <TableHead className="w-[130px] text-zinc-500 font-medium text-xs uppercase tracking-wider text-right">Data</TableHead>
            <TableHead className="w-[140px] text-zinc-500 font-medium text-xs uppercase tracking-wider text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => {
            const isPublished = article.status === "published";
            
            return (
              <TableRow 
                key={article.id} 
                className="border-zinc-800/20 hover:bg-zinc-800/20 transition-colors group"
              >
                {/* Article Info */}
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-10 rounded-lg bg-zinc-800/50 overflow-hidden flex-shrink-0">
                      {article.featured_image_url ? (
                        <img 
                          src={article.featured_image_url} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-zinc-700 text-[9px]">Sem img</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-zinc-100 truncate max-w-[280px]">
                        {article.title}
                      </p>
                      <p className="text-[11px] text-zinc-600 truncate max-w-[200px] font-mono mt-0.5">
                        /imprensa/{article.slug}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge 
                    variant="outline"
                    className={cn(
                      "text-[10px] font-medium px-2 py-0.5 border",
                      isPublished 
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                        : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                    )}
                  >
                    {isPublished ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>

                {/* Category */}
                <TableCell>
                  <Badge variant="outline" className="text-[10px] font-medium text-zinc-400 border-zinc-700/50 bg-zinc-800/30 px-2 py-0.5">
                    {article.category}
                  </Badge>
                </TableCell>

                {/* Date */}
                <TableCell className="text-xs text-zinc-500 tabular-nums text-right whitespace-nowrap">
                  {format(new Date(article.publish_date), "dd MMM yyyy", { locale: ptBR })}
                </TableCell>

                {/* Actions */}
                <TableCell>
                  <div className="flex items-center justify-end gap-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-zinc-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`/imprensa/${article.slug}`, '_blank');
                          }}
                          aria-label="Ver notícia"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-zinc-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleStatus(article.id, isPublished ? "draft" : "published");
                          }}
                          disabled={isToggling}
                          aria-label={isPublished ? "Despublicar" : "Publicar"}
                        >
                          {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{isPublished ? "Despublicar" : "Publicar"}</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-zinc-800"
                          asChild
                          aria-label="Editar notícia"
                        >
                          <Link 
                            to={`/app/news/${article.id}/edit`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-white hover:bg-zinc-800"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDuplicate(article);
                          }}
                          aria-label="Duplicar notícia"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Duplicar</TooltipContent>
                    </Tooltip>

                    {canDelete && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(article.id);
                            }}
                            aria-label="Excluir notícia"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Excluir</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
