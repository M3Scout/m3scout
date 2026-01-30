import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TableCell, TableRow } from "@/components/ui/table";
import { ContractStatusBadge } from "./ContractStatusBadge";
import { ExternalLink } from "lucide-react";
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
    <TableRow className="border-white/[0.04] hover:bg-zinc-800/30 transition-colors">
      {/* Athlete */}
      <TableCell className="pl-6">
        <Link
          to={`/app/players/${contract.player_id}`}
          className="flex items-center gap-3 group"
        >
          <Avatar className="h-9 w-9 border border-white/[0.06]">
            <AvatarImage src={contract.player_photo_url || undefined} alt={contract.player_name} />
            <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate text-foreground group-hover:text-primary transition-colors">{contract.player_name}</p>
            <p className="text-xs text-zinc-500">{contract.player_position}</p>
          </div>
        </Link>
      </TableCell>

      {/* Club */}
      <TableCell className="text-zinc-400">
        {contract.club_name}
      </TableCell>

      {/* Type */}
      <TableCell className="text-zinc-300">
        {contractTypeLabels[contract.contract_type] || contract.contract_type}
      </TableCell>

      {/* End Date */}
      <TableCell className="tabular-nums text-zinc-400">
        {contract.end_date
          ? format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR })
          : "—"}
      </TableCell>

      {/* Status Badge */}
      <TableCell>
        <ContractStatusBadge status={contract.status} daysToExpire={contract.days_to_expire} />
      </TableCell>

      {/* Actions */}
      <TableCell className="pr-6">
        <Link 
          to={`/app/players/${contract.player_id}`}
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver atleta
        </Link>
      </TableCell>
    </TableRow>
  );
}
