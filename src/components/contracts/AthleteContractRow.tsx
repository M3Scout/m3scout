import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Building2, Briefcase, Eye, Phone, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ContractStatusBadge } from "./ContractStatusBadge";
import { cn } from "@/lib/utils";
import type { PlayerContractGroup } from "@/hooks/useContractsByPlayer";

const contractTypeLabels: Record<string, string> = {
  permanent: "Definitivo",
  loan: "Empréstimo",
  trial: "Teste",
  youth: "Base/Formação",
};

interface AthleteContractRowProps {
  group: PlayerContractGroup;
}

export function AthleteContractRow({ group }: AthleteContractRowProps) {
  const [expanded, setExpanded] = useState(false);

  const initials = group.player_name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const worstContract = group.club_contracts.find(c => c.status === group.worst_status);
  const hasAgentInfo = group.agent_name || group.agent_contact;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      expanded
        ? "border-zinc-700/50 bg-zinc-900/70"
        : "border-zinc-800/30 bg-zinc-900/50 hover:border-zinc-700/40 hover:bg-zinc-900/70"
    )}>
      {/* ── Collapsed header ── */}
      <button
        className="w-full flex items-center gap-3 px-4 py-3"
        onClick={() => setExpanded(v => !v)}
      >
        <Avatar className="h-9 w-9 border border-zinc-800 shrink-0">
          <AvatarImage src={group.player_photo_url || undefined} alt={group.player_name} />
          <AvatarFallback className="bg-zinc-800 text-zinc-500 text-[10px]">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-bold text-zinc-100 truncate">{group.player_name}</p>
          <p className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">{group.player_position}</p>
        </div>

        <span className="hidden sm:block text-[10px] text-zinc-600 font-editorial-mono shrink-0">
          {group.club_contracts.length} contrato{group.club_contracts.length !== 1 ? "s" : ""}
        </span>

        <div className="shrink-0">
          <ContractStatusBadge
            status={group.worst_status}
            daysToExpire={worstContract?.days_to_expire ?? null}
          />
        </div>

        <ChevronDown
          size={15}
          className={cn("text-zinc-600 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
        />
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-zinc-800/40">

          {/* Clubes */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-3">
              <Building2 size={11} className="text-zinc-500" />
              <span className="font-editorial-mono text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                Clubes
              </span>
            </div>

            <div className="space-y-2">
              {group.club_contracts.map(c => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-3 py-2.5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-zinc-200 truncate">{c.club_name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5 tabular-nums">
                      {contractTypeLabels[c.contract_type] || c.contract_type}
                      {c.start_date && (
                        <> · {format(new Date(c.start_date + "T00:00:00"), "MM/yyyy", { locale: ptBR })}</>
                      )}
                      {c.end_date && (
                        <> → {format(new Date(c.end_date + "T00:00:00"), "MM/yyyy", { locale: ptBR })}</>
                      )}
                    </p>
                  </div>
                  <ContractStatusBadge status={c.status} daysToExpire={c.days_to_expire} />
                </div>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-zinc-800/40" />

          {/* Agência */}
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Briefcase size={11} className="text-zinc-500" />
              <span className="font-editorial-mono text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                Agência
              </span>
            </div>

            {hasAgentInfo ? (
              <div className="rounded-lg border border-zinc-800/50 bg-zinc-950/60 px-3 py-2.5 space-y-1.5">
                {group.agent_name && (
                  <div className="flex items-center gap-2">
                    <User size={11} className="text-zinc-500 shrink-0" />
                    <p className="text-[13px] font-semibold text-zinc-200">{group.agent_name}</p>
                  </div>
                )}
                {group.agent_contact && (
                  <div className="flex items-center gap-2">
                    <Phone size={11} className="text-zinc-500 shrink-0" />
                    <p className="text-[12px] text-zinc-400">{group.agent_contact}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-zinc-600 italic font-editorial-mono">
                Sem agente registrado
              </p>
            )}
          </div>

          {/* Footer: Ver Atleta */}
          <div className="px-4 pb-3 flex justify-end border-t border-zinc-800/40 pt-3">
            <Link
              to={`/dashboard/atletas/${group.player_id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-medium text-zinc-400 hover:text-zinc-100 bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-700/30 transition-all duration-200"
              onClick={e => e.stopPropagation()}
            >
              <Eye className="w-3 h-3" />
              Ver Atleta
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
