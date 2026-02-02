import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, EyeOff, Edit, Copy, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface NewsCardMobileProps {
  article: NewsArticle;
  onToggleStatus: (id: string, newStatus: string) => void;
  onDuplicate: (article: NewsArticle) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
  isToggling: boolean;
}

export function NewsCardMobile({
  article,
  onToggleStatus,
  onDuplicate,
  onDelete,
  canDelete,
  isToggling,
}: NewsCardMobileProps) {
  const isPublished = article.status === "published";

  return (
    <div className="group rounded-2xl bg-gradient-to-b from-zinc-900/95 via-zinc-900/90 to-zinc-950/95 border border-zinc-800/40 overflow-hidden shadow-lg hover:border-zinc-700/60 transition-all duration-200">
      {/* Thumbnail + Status */}
      <div className="relative aspect-video bg-zinc-800/50">
        {article.featured_image_url ? (
          <img 
            src={article.featured_image_url} 
            alt={article.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-zinc-600 text-sm">Sem imagem</span>
          </div>
        )}
        
        {/* Status Badge - positioned over image */}
        <div className="absolute top-3 left-3">
          <Badge 
            className={cn(
              "text-xs font-semibold px-2.5 py-1 shadow-lg",
              isPublished 
                ? "bg-emerald-500/90 text-white border-0 hover:bg-emerald-500" 
                : "bg-amber-500/90 text-zinc-900 border-0 hover:bg-amber-500"
            )}
          >
            {isPublished ? "Publicado" : "Rascunho"}
          </Badge>
        </div>

        {/* Category Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-zinc-900/80 backdrop-blur-sm text-xs">
            {article.category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-white line-clamp-2 leading-snug">
          {article.title}
        </h3>

        {/* Slug */}
        <p className="text-xs text-muted-foreground truncate font-mono">
          /imprensa/{article.slug}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {format(new Date(article.publish_date), "dd MMM yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-zinc-800/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-zinc-800"
                onClick={() => window.open(`/imprensa/${article.slug}`, '_blank')}
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
                className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-zinc-800"
                onClick={() => onToggleStatus(article.id, isPublished ? "draft" : "published")}
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
                className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-zinc-800"
                asChild
                aria-label="Editar notícia"
              >
                <Link to={`/app/news/${article.id}/edit`}>
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
                className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-zinc-800"
                onClick={() => onDuplicate(article)}
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
                  className="h-10 w-10 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 ml-auto"
                  onClick={() => onDelete(article.id)}
                  aria-label="Excluir notícia"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </div>
  );
}
