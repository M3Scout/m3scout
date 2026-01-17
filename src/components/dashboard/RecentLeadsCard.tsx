import { Link } from "react-router-dom";
import { MessageSquare, ChevronRight, Clock, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { safeArray } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { fadeInUp, cardHover, cardTap } from "@/lib/animations";

interface RecentLead {
  id: string;
  name: string;
  subject: string;
  created_at: string;
  status: string;
}

interface RecentLeadsCardProps {
  leads: RecentLead[];
}

const getStatusBadge = (status: string) => {
  if (status === "new") {
    return (
      <Badge variant="success" className="text-[10px] px-2 py-0.5">
        Novo
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground border-zinc-700 text-[10px] px-2 py-0.5">
      Contatado
    </Badge>
  );
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

export const RecentLeadsCard = ({ leads }: RecentLeadsCardProps) => {
  const newLeadsCount = leads.filter(l => l.status === "new").length;

  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.35 }}
      className="rounded-[var(--radius-card)] border border-[var(--border-glass)] bg-[var(--bg-glass)] backdrop-blur-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-[var(--border-glass)] bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-amber-500/20 to-yellow-600/10 flex items-center justify-center relative">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            {newLeadsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[10px] font-bold text-primary-foreground rounded-full flex items-center justify-center">
                {newLeadsCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Leads Recentes</h2>
            <p className="text-[10px] text-muted-foreground">Contatos do site público</p>
          </div>
        </div>
        
        <Link 
          to="/app/leads" 
          className="text-xs text-muted-foreground hover:text-zinc-300 transition-colors flex items-center gap-0.5"
        >
          Ver todos
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Content */}
      <div className="p-3">
        {leads.length > 0 ? (
          <div className="space-y-2">
            {safeArray(leads).slice(0, 4).map((lead) => (
              <motion.div
                key={lead.id}
                whileHover={cardHover}
                whileTap={cardTap}
              >
                <Link
                  to="/app/leads"
                  className="group flex items-center gap-3 p-3 rounded-[var(--radius-button)] bg-zinc-900/30 border border-transparent hover:border-[var(--border-glass)] hover:bg-zinc-800/30 transition-all duration-200"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-sm font-medium text-zinc-300 shrink-0">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                      {lead.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {lead.subject}
                    </p>
                  </div>

                  {/* Status & Time */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {getStatusBadge(lead.status)}
                    <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(lead.created_at)}
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Mail className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p className="text-sm text-muted-foreground">Nenhum lead ainda</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Leads aparecerão quando visitantes entrarem em contato
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};
