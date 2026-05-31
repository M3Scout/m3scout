import { Link } from "react-router-dom";
import { Users, FileText, GitCompare, MessageSquare, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, cardHover, cardTap } from "@/lib/animations";

const actions = [
  {
    title: "Novo Atleta",
    description: "Cadastrar jogador",
    icon: Users,
    link: "/dashboard/players/new",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "hover:border-blue-500/30",
  },
  {
    title: "Novo Relatório",
    description: "Avaliar jogador",
    icon: FileText,
    link: "/dashboard/reports/new",
    color: "from-violet-500/20 to-purple-600/10",
    iconColor: "text-violet-400",
    borderColor: "hover:border-violet-500/30",
  },
  {
    title: "Comparar",
    description: "Analisar atletas",
    icon: GitCompare,
    link: "/dashboard/compare",
    color: "from-emerald-500/20 to-green-600/10",
    iconColor: "text-emerald-400",
    borderColor: "hover:border-emerald-500/30",
  },
  {
    title: "Ver Leads",
    description: "Contatos recebidos",
    icon: MessageSquare,
    link: "/dashboard/leads",
    color: "from-amber-500/20 to-yellow-600/10",
    iconColor: "text-amber-400",
    borderColor: "hover:border-amber-500/30",
  },
];

export const QuickActionsCard = () => {
  return (
    <motion.div 
      {...fadeInUp}
      transition={{ delay: 0.4 }}
      className="rounded-[var(--radius-card)] bg-zinc-900/60 backdrop-blur-sm shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800/40 bg-zinc-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[var(--radius-button)] bg-gradient-to-br from-primary/20 to-red-600/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">O que fazer agora?</h2>
            <p className="text-[10px] text-muted-foreground">Ações rápidas disponíveis</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {actions.map((action) => (
            <motion.div
              key={action.title}
              whileHover={cardHover}
              whileTap={cardTap}
            >
              <Link
                to={action.link}
                className={`group relative flex flex-col p-3 sm:p-4 rounded-[var(--radius-button)] bg-gradient-to-br ${action.color} ${action.borderColor} transition-all duration-300 hover:shadow-lg min-h-[var(--tap-target)]`}
              >
                {/* Icon */}
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-[var(--radius-button)] bg-zinc-900/50 flex items-center justify-center mb-2 sm:mb-3 ${action.iconColor} group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                
                {/* Text */}
                <div>
                  <p className="text-xs sm:text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 hidden sm:block">
                    {action.description}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight className="absolute top-3 right-3 sm:top-4 sm:right-4 w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
