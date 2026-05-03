import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContractStatusBadge } from "./ContractStatusBadge";
import { Eye } from "lucide-react";
import type { ContractWithPlayer } from "@/hooks/useContracts";

interface ContractRowProps {
  contract: ContractWithPlayer;
}

const contractTypeLabels: Record<string, string> = {
  permanent: "Definitivo",
  loan: "Empréstimo",
  trial: "Teste",
  youth: "Base/Formação",
};

export function ContractRow({ contract }: ContractRowProps) {
  const initials = contract.player_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-zinc-900/50 border border-zinc-800/30 hover:border-zinc-700/40 hover:bg-zinc-900/70 transition-all duration-200">
      {/* Athlete */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="h-9 w-9 border border-zinc-800 shrink-0">
          <AvatarImage src={contract.player_photo_url || undefined} alt={contract.player_name} />
          <AvatarFallback className="bg-zinc-800 text-zinc-500 text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-100 truncate">{contract.player_name}</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">{contract.player_position}</p>
        </div>
      </div>

      {/* Club */}
      <div className="hidden sm:block w-[140px] shrink-0">
        <p className="text-xs text-zinc-300 font-medium truncate">{contract.club_name}</p>
        <p className="text-[10px] text-zinc-600">{contractTypeLabels[contract.contract_type] || contract.contract_type}</p>
      </div>

      {/* End Date */}
      <div className="hidden md:block w-[100px] shrink-0 text-right">
        <p className="text-xs text-zinc-400 tabular-nums font-medium">
          {contract.end_date
            ? format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR })
            : "—"}
        </p>
      </div>

      {/* Status */}
      <div className="w-[110px] shrink-0 flex justify-center">
        <ContractStatusBadge status={contract.status} daysToExpire={contract.days_to_expire} />
      </div>

      {/* Action */}
      <Link
        to={`/app/players/${contract.player_id}`}
        className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/30 transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <Eye className="w-3 h-3" />
        Ver Atleta
      </Link>
    </div>
  );
}
