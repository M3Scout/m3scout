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
    <div className="rounded-xl border border-zinc-800/40 bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800/50 hover:bg-transparent">
            <TableHead className="w-[45%] text-zinc-400 font-medium">Notícia</TableHead>
            <TableHead className="w-[12%] text-zinc-400 font-medium">Status</TableHead>
            <TableHead className="w-[12%] text-zinc-400 font-medium">Categoria</TableHead>
            <TableHead className="w-[15%] text-zinc-400 font-medium">Data</TableHead>
            <TableHead className="w-[16%] text-zinc-400 font-medium text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {articles.map((article) => {
            const isPublished = article.status === "published";
            
            return (
              <TableRow 
                key={article.id} 
                className="border-zinc-800/30 hover:bg-zinc-800/30 transition-colors group"
              >
                {/* Article Info */}
                <TableCell className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="w-20 h-12 rounded-lg bg-zinc-800/50 overflow-hidden flex-shrink-0">
                      {article.featured_image_url ? (
                        <img 
                          src={article.featured_image_url} 
                          alt={article.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-zinc-600 text-[10px]">Sem img</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="font-medium text-white truncate max-w-[300px] cursor-default">
                            {article.title}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-sm">
                          {article.title}
                        </TooltipContent>
                      </Tooltip>
                      <p className="text-xs text-muted-foreground truncate font-mono mt-0.5">
                        /imprensa/{article.slug}
                      </p>
                    </div>
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge 
                    className={cn(
                      "text-xs font-semibold whitespace-nowrap",
                      isPublished 
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30" 
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30"
                    )}
                  >
                    {isPublished ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>

                {/* Category */}
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {article.category}
                  </Badge>
                </TableCell>

                {/* Date */}
                <TableCell className="text-sm text-muted-foreground">
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
