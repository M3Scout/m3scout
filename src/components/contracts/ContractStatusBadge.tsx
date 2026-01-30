import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";

interface ContractStatusBadgeProps {
  status: "expired" | "expiring" | "active" | "no_end_date";
  daysToExpire: number | null;
}

export function ContractStatusBadge({ status, daysToExpire }: ContractStatusBadgeProps) {
  switch (status) {
    case "expired":
      return (
        <Badge variant="error" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Vencido
        </Badge>
      );

    case "expiring":
      return (
        <Badge variant="warning" className="gap-1">
          <Clock className="h-3 w-3" />
          {daysToExpire === 0
            ? "Expira hoje"
            : daysToExpire === 1
            ? "Expira amanhã"
            : `Expira em ${daysToExpire} dias`}
        </Badge>
      );

    case "active":
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          Ativo
        </Badge>
      );

    case "no_end_date":
      return (
        <Badge variant="glass" className="gap-1">
          <HelpCircle className="h-3 w-3" />
          Sem data fim
        </Badge>
      );

    default:
      return null;
  }
}
