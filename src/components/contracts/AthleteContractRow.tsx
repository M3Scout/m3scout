import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, Building2, Briefcase, Eye, CalendarClock } from "lucide-react";
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const m3Days = group.m3_contract_end
    ? Math.ceil((new Date(group.m3_contract_end + "T00:00:00").getTime() - today.getTime()) / 86400000)
    : null;
  const m3Expired  = m3Days !== null && m3Days < 0;
  const m3Critical = m3Days !== null && m3Days >= 0 && m3Days <= 30;
  const m3Warning  = m3Days !== null && m3Days > 30 && m3Days <= 90;

  return (
    <div className={cn(
      "rounded-xl border transition-all duration-200",
      expanded
        ? "border-zinc-700/50 bg-zinc-900/70"
        : "border-zinc-800/30 bg-zinc-900/50 hover:border-zinc-700/40 hover:bg-zinc-900/70"
    )}>
      {/* ── Collapsed header ── */}
      <button
        className="w-full flex items-center gap-4 px-4 py-4"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="h-[62px] w-[62px] rounded-lg border border-zinc-800 bg-zinc-800 shrink-0 overflow-hidden flex items-center justify-center">
          {group.player_photo_url ? (
            <img src={group.player_photo_url} alt={group.player_name} className="h-full w-full object-cover object-top" />
          ) : (
            <span className="text-zinc-500 text-[13px] font-medium">{initials}</span>
          )}
        </div>

        <div className="flex-1 min-w-0 text-left">
          <p className="text-[15px] font-bold text-zinc-100 truncate">{group.player_name}</p>
          <p className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium mt-0.5">{group.player_position}</p>
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

          {/* Agência / Contrato M3 */}
          <div className="px-4 pt-3 pb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <Briefcase size={11} className="text-zinc-500" />
              <span className="font-editorial-mono text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                Contrato M3
              </span>
            </div>

            {group.m3_contract_end ? (() => {
              const color = m3Expired || m3Critical ? "#ec4525" : m3Warning ? "#f59e0b" : "#22c55e";
              const label = m3Expired ? "VENCIDO" : m3Critical ? "CRÍTICO" : m3Warning ? "EXPIRANDO" : "ATIVO";
              const endFormatted = format(new Date(group.m3_contract_end + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });

              return (
                <div className="rounded-lg border bg-zinc-950/60 px-3 py-2.5"
                  style={{ borderColor: `${color}40` }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CalendarClock size={11} style={{ color }} className="shrink-0" />
                      <div>
                        <p className="text-[10px] text-zinc-500 font-editorial-mono uppercase tracking-wider">
                          Vencimento
                        </p>
                        <p className="text-[13px] font-semibold" style={{ color }}>
                          {endFormatted}
                        </p>
                      </div>
                    </div>
                    <span className="font-editorial-mono text-[9px] uppercase tracking-wider border px-1.5 py-0.5 rounded-md shrink-0"
                      style={{ color, borderColor: color }}>
                      {label}
                    </span>
                  </div>
                  {(m3Expired || m3Critical || m3Warning) && m3Days !== null && (
                    <p className="font-editorial-mono text-[10px] mt-1.5" style={{ color }}>
                      {m3Expired ? `Expirou há ${Math.abs(m3Days)} dias` : `${m3Days} dias restantes`}
                    </p>
                  )}
                </div>
              );
            })() : (
              <p className="text-[11px] text-zinc-600 italic font-editorial-mono">
                Contrato com M3 não registrado
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
