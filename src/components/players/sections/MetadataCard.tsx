import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Hash, Link as LinkIcon, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetadataCardProps {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

interface MetaRowProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function MetaRow({ icon: Icon, label, value, mono }: MetaRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/30 last:border-0">
      <div className="flex items-center gap-2">
        <Icon className="w-3 h-3 text-zinc-600" />
        <span className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</span>
      </div>
      <span className={cn(
        "text-xs text-zinc-400",
        mono && "font-mono text-[11px] bg-zinc-900/60 px-1.5 py-0.5 rounded"
      )}>
        {value}
      </span>
    </div>
  );
}

export function MetadataCard({ id, slug, createdAt, updatedAt }: MetadataCardProps) {
  return (
    <Card className="border-zinc-800/30 bg-gradient-to-b from-zinc-950/80 to-zinc-950/60 shadow-none">
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-zinc-600" />
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-600">
            Metadados
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="space-y-0">
          <MetaRow 
            icon={Hash} 
            label="ID" 
            value={id.slice(0, 8) + "..."} 
            mono 
          />
          <MetaRow 
            icon={LinkIcon} 
            label="Slug" 
            value={slug} 
          />
          <MetaRow 
            icon={Clock} 
            label="Criado" 
            value={new Date(createdAt).toLocaleDateString("pt-BR")} 
          />
          <MetaRow 
            icon={RefreshCw} 
            label="Atualizado" 
            value={new Date(updatedAt).toLocaleDateString("pt-BR")} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
