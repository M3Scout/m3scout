import { Link } from "react-router-dom";
import { FileText, Users, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export const DashboardHero = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-zinc-800/50"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjEiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyIvPjwvZz48L3N2Zz4=')] opacity-50" />
      </div>

      <div className="relative px-6 sm:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Visão Geral
            </h1>
            <p className="text-sm sm:text-base text-zinc-400 max-w-md">
              Resumo estratégico da sua operação de scouting
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/app/players">
              <Button 
                variant="outline" 
                size="sm"
                className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Ver Atletas
              </Button>
            </Link>
            <Link to="/app/compare">
              <Button 
                variant="outline" 
                size="sm"
                className="border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Comparar
              </Button>
            </Link>
            <Link to="/app/reports/new">
              <Button 
                size="sm"
                className="bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 text-white shadow-lg shadow-primary/20"
              >
                <FileText className="w-4 h-4 mr-2" />
                Novo Relatório
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
