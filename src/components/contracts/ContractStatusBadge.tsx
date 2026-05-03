import { cn } from "@/lib/utils";

interface ContractStatusBadgeProps {
  status: "expired" | "expiring" | "active" | "no_end_date";
  daysToExpire: number | null;
}

export function ContractStatusBadge({ status, daysToExpire }: ContractStatusBadgeProps) {
  const config = {
    expired: {
      label: "Vencido",
      className: "bg-[#e63946]/15 text-[#e63946] border-[#e63946]/20",
    },
    expiring: {
      label: daysToExpire === 0
        ? "Expira hoje"
        : daysToExpire === 1
        ? "Expira amanhã"
        : `${daysToExpire}d restantes`,
      className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    },
    active: {
      label: "Ativo",
      className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    },
    no_end_date: {
      label: "Sem data",
      className: "bg-zinc-800/50 text-zinc-500 border-zinc-700/30",
    },
  };

  const c = config[status];
  if (!c) return null;

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium border",
      c.className
    )}>
      {c.label}
    </span>
  );
}
