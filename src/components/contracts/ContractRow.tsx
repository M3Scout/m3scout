import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContractStatusBadge } from "./ContractStatusBadge";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
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

  const firstName = contract.player_name.split(" ")[0];

  return (
    /*
     * Grid layout — fixed columns at every breakpoint so cells line up
     * perfectly regardless of content length in adjacent columns.
     *
     * Mobile  : [athlete 1fr] [status 124px] [action 96px]
     * SM 640+ : [athlete 1fr] [club 144px] [status 124px] [action 96px]
     * MD 768+ : [athlete 1fr] [club 144px] [date 104px] [status 124px] [action 96px]
     *
     * Club and Date cells use explicit col-start so Status/Action placement
     * doesn't shift when those cells are hidden (display:none removes from flow).
     */
    <div
      className={cn(
        "grid items-center gap-x-3 px-4 py-3 rounded-xl",
        "bg-zinc-900/50 border border-zinc-800/30",
        "hover:border-zinc-700/40 hover:bg-zinc-900/70 transition-all duration-200",
        // column template per breakpoint
        "grid-cols-[1fr_124px_96px]",
        "sm:grid-cols-[1fr_144px_124px_96px]",
        "md:grid-cols-[1fr_144px_104px_124px_96px]",
      )}
    >
      {/* ── Col 1 (all breakpoints): Athlete ── */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar className="h-9 w-9 border border-zinc-800 shrink-0">
          <AvatarImage src={contract.player_photo_url || undefined} alt={contract.player_name} />
          <AvatarFallback className="bg-zinc-800 text-zinc-500 text-[10px]">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-100 truncate">
            <span className="sm:hidden">{firstName}</span>
            <span className="hidden sm:inline">{contract.player_name}</span>
          </p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">
            {contract.player_position}
          </p>
        </div>
      </div>

      {/* ── Col 2 (sm+): Club ── */}
      <div className="hidden sm:block sm:col-start-2">
        <p className="text-xs text-zinc-300 font-medium truncate">{contract.club_name}</p>
        <p className="text-[10px] text-zinc-600">
          {contractTypeLabels[contract.contract_type] || contract.contract_type}
        </p>
      </div>

      {/* ── Col 3 (md+): End Date ── */}
      <div className="hidden md:block md:col-start-3">
        <p className="text-xs text-zinc-400 tabular-nums font-medium">
          {contract.end_date
            ? format(new Date(contract.end_date), "dd/MM/yyyy", { locale: ptBR })
            : "—"}
        </p>
      </div>

      {/* ── Status: col 2 mobile / col 3 sm / col 4 md ── */}
      <div className="col-start-2 sm:col-start-3 md:col-start-4 flex items-center">
        <ContractStatusBadge
          status={contract.status}
          daysToExpire={contract.days_to_expire}
        />
      </div>

      {/* ── Ver Atleta: col 3 mobile / col 4 sm / col 5 md ── */}
      <div className="col-start-3 sm:col-start-4 md:col-start-5 flex items-center justify-end">
        <Link
          to={`/app/players/${contract.player_id}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/30 transition-all duration-200 whitespace-nowrap"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="w-3 h-3" />
          Ver Atleta
        </Link>
      </div>
    </div>
  );
}
