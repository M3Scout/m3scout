import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <TableRow>
      {/* Athlete */}
      <TableCell>
        <Link
          to={`/app/players/${contract.player_id}`}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage src={contract.player_photo_url || undefined} alt={contract.player_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{contract.player_name}</p>
            <p className="text-xs text-muted-foreground">{contract.player_position}</p>
          </div>
        </Link>
      </TableCell>

      {/* Club */}
      <TableCell className="text-muted-foreground">
        {contract.club_name}
      </TableCell>

      {/* Type */}
      <TableCell>
        {contractTypeLabels[contract.contract_type] || contract.contract_type}
      </TableCell>

      {/* End Date */}
      <TableCell className="tabular-nums">
        {contract.end_date
          ? format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR })
          : "—"}
      </TableCell>

      {/* Status Badge */}
      <TableCell>
        <ContractStatusBadge status={contract.status} daysToExpire={contract.days_to_expire} />
      </TableCell>

      {/* Actions */}
      <TableCell>
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/app/players/${contract.player_id}`}>
            <ExternalLink className="h-4 w-4 mr-1" />
            Ver atleta
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}
