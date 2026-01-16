import { Link } from "react-router-dom";
import { Users, FileText, GitCompare, MessageSquare, Plus, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const actions = [
  {
    title: "Novo Atleta",
    description: "Cadastrar jogador",
    icon: Users,
    link: "/app/players/new",
    color: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
    borderColor: "hover:border-blue-500/30",
  },
  {
    title: "Novo Relatório",
    description: "Avaliar jogador",
    icon: FileText,
    link: "/app/reports/new",
    color: "from-violet-500/20 to-purple-600/10",
    iconColor: "text-violet-400",
    borderColor: "hover:border-violet-500/30",
  },
  {
    title: "Comparar",
    description: "Analisar atletas",
    icon: GitCompare,
    link: "/app/compare",
    color: "from-emerald-500/20 to-green-600/10",
    iconColor: "text-emerald-400",
    borderColor: "hover:border-emerald-500/30",
  },
  {
    title: "Ver Leads",
    description: "Contatos recebidos",
    icon: MessageSquare,
    link: "/app/leads",
    color: "from-amber-500/20 to-yellow-600/10",
    iconColor: "text-amber-400",
    borderColor: "hover:border-amber-500/30",
  },
];

export const QuickActionsCard = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-red-600/10 flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">O que fazer agora?</h2>
            <p className="text-[10px] text-zinc-500">Ações rápidas disponíveis</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => (
            <Link
              key={action.title}
              to={action.link}
              className={`group relative flex flex-col p-4 rounded-xl bg-gradient-to-br ${action.color} border border-zinc-800/50 ${action.borderColor} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-lg bg-zinc-900/50 flex items-center justify-center mb-3 ${action.iconColor} group-hover:scale-110 transition-transform`}>
                <action.icon className="w-5 h-5" />
              </div>
              
              {/* Text */}
              <div>
                <p className="text-sm font-medium text-white group-hover:text-primary transition-colors">
                  {action.title}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {action.description}
                </p>
              </div>

              {/* Arrow */}
              <ArrowRight className="absolute top-4 right-4 w-4 h-4 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
