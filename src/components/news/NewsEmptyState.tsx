import { Link } from "react-router-dom";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NewsEmptyStateProps {
  hasFilters: boolean;
  onClearFilters?: () => void;
}

export function NewsEmptyState({ hasFilters, onClearFilters }: NewsEmptyStateProps) {
  if (hasFilters) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-zinc-500" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Nenhuma notícia encontrada
        </h3>
        <p className="text-muted-foreground text-sm max-w-sm mb-6">
          Tente ajustar os filtros ou a busca para encontrar o que procura.
        </p>
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Nenhuma notícia ainda
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-6">
        Comece a criar conteúdo para a Sala de Imprensa. Suas notícias aparecerão aqui.
      </p>
      <Button asChild className="gap-2">
        <Link to="/dashboard/news/new">
          <Plus className="w-4 h-4" />
          Criar primeira notícia
        </Link>
      </Button>
    </div>
  );
}
