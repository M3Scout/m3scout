import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ArrowLeftRight, Briefcase, Eye, CalendarClock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerContractGroup } from "@/hooks/useContractsByPlayer";
import type { ContractWithPlayer } from "@/hooks/useContracts";

const GREEN = "#22c55e";

function transferInfo(c: ContractWithPlayer): { fee: string; label: string } {
  const hasFee = (() => {
    const f = c.transfer_fee?.replace(/\s/g, "");
    return !!f && f !== "R$0,00" && f !== "R$0.00" && f !== "0";
  })();

  if (c.contract_type === "loan") return { fee: "-", label: "Empréstimo" };
  if (c.contract_type === "youth") return { fee: "-", label: "Base/Formação" };
  if (hasFee) return { fee: c.transfer_fee!, label: "" };
  return { fee: "", label: "Sem custo" };
}

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
        ? "border-zinc-700/50"
        : "border-zinc-700/30 hover:border-zinc-700/50"
    )}
    style={{ background: "#1f2225" }}>
      {/* ── Collapsed header ── */}
      <button
        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-colors duration-200 hover:bg-[#141617]"
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

        <span className="text-[10px] text-zinc-600 font-editorial-mono shrink-0">
          {group.club_contracts.length} contrato{group.club_contracts.length !== 1 ? "s" : ""}
        </span>

        <ChevronDown
          size={15}
          className={cn("text-zinc-600 shrink-0 transition-transform duration-200", expanded && "rotate-180")}
        />
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-zinc-800/40">

          {/* Histórico de Transferências */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center gap-1.5 mb-3">
              <ArrowLeftRight size={11} className="text-zinc-500" />
              <span className="font-editorial-mono text-[10px] tracking-[0.22em] uppercase text-zinc-500">
                Histórico de Transferências
              </span>
            </div>

            <div className="divide-y divide-zinc-800/50">
              {group.club_contracts.map(c => {
                const ti = transferInfo(c);
                return (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    {/* Logo */}
                    <div className="w-10 h-10 rounded-lg bg-zinc-800/60 border border-zinc-700/40 shrink-0 overflow-hidden flex items-center justify-center">
                      {c.club_logo_url ? (
                        <img src={c.club_logo_url} alt={c.club_name} className="w-full h-full object-contain p-0.5" />
                      ) : (
                        <Shield size={18} className="text-zinc-600" />
                      )}
                    </div>

                    {/* Club + dates */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-zinc-100 truncate">{c.club_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-[11px] font-bold text-zinc-300 tabular-nums">
                          {c.start_date && format(new Date(c.start_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                          {c.end_date && (
                            <> → {format(new Date(c.end_date + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}</>
                          )}
                        </p>
                        {c.days_to_expire !== null && c.days_to_expire >= 0 && c.days_to_expire <= 90 && (
                          <span className="text-[10px] font-medium tabular-nums" style={{
                            color: c.days_to_expire <= 30 ? "#ec4525" : c.days_to_expire <= 60 ? "#f59e0b" : "#62616a"
                          }}>
                            · {c.days_to_expire}d
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Transfer value / type */}
                    <div className="text-right shrink-0">
                      {ti.fee && <p className="text-[15px] font-bold tabular-nums" style={{ color: GREEN }}>{ti.fee}</p>}
                      {ti.label && (
                        <p className={ti.fee ? "text-[11px] font-medium" : "text-[15px] font-bold"} style={{ color: GREEN }}>
                          {ti.label}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
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
