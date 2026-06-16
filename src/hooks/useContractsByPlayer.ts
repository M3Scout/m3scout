import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ContractWithPlayer } from "./useContracts";

export interface PlayerContractGroup {
  player_id: string;
  player_name: string;
  player_photo_url: string | null;
  player_position: string;
  agent_name: string | null;
  agent_contact: string | null;
  m3_contract_start: string | null;
  m3_contract_end: string | null;
  club_contracts: ContractWithPlayer[];
  worst_status: "expired" | "expiring" | "active" | "no_end_date";
}

const STATUS_PRIORITY: Record<string, number> = {
  expired: 0,
  expiring: 1,
  active: 2,
  no_end_date: 3,
};

function worstStatus(contracts: ContractWithPlayer[]): PlayerContractGroup["worst_status"] {
  if (!contracts.length) return "no_end_date";
  return contracts.reduce<ContractWithPlayer["status"]>((best, c) => {
    return STATUS_PRIORITY[c.status] < STATUS_PRIORITY[best] ? c.status : best;
  }, contracts[0].status);
}

export function useContractsByPlayer(filterStatus?: string, filterDays?: number) {
  const [allRaw, setAllRaw] = useState<ContractWithPlayer[]>([]);
  const [agentMap, setAgentMap] = useState<Record<string, { agent_name: string | null; agent_contact: string | null; m3_contract_start: string | null; m3_contract_end: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ total: 0, expired: 0, expiring: 0, active: 0 });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const { data, error: fetchError } = await supabase
          .from("player_contract_history")
          .select(`
            id, player_id, club_name, club_logo_url, contract_type, transfer_fee, start_date, end_date, sort_order,
            players!player_contract_history_player_id_fkey (
              full_name, photo_url, position, is_archived, agent_name, agent_contact,
              m3_contract_start, m3_contract_end
            )
          `)
          .order("sort_order", { ascending: true, nullsFirst: false });

        if (fetchError) throw fetchError;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const newAgentMap: Record<string, { agent_name: string | null; agent_contact: string | null; m3_contract_start: string | null; m3_contract_end: string | null }> = {};

        const processed: ContractWithPlayer[] = (data || [])
          .filter((c: any) => !c.players?.is_archived)
          .map((c: any) => {
            if (!newAgentMap[c.player_id]) {
              newAgentMap[c.player_id] = {
                agent_name: c.players?.agent_name ?? null,
                agent_contact: c.players?.agent_contact ?? null,
                m3_contract_start: c.players?.m3_contract_start ?? null,
                m3_contract_end: c.players?.m3_contract_end ?? null,
              };
            }

            let daysToExpire: number | null = null;
            let status: ContractWithPlayer["status"] = "no_end_date";

            if (c.end_date) {
              const endDate = new Date(c.end_date);
              endDate.setHours(0, 0, 0, 0);
              daysToExpire = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              status = daysToExpire < 0 ? "expired" : daysToExpire <= 90 ? "expiring" : "active";
            }

            return {
              id: c.id,
              player_id: c.player_id,
              player_name: c.players?.full_name || "Atleta desconhecido",
              player_photo_url: c.players?.photo_url || null,
              player_position: c.players?.position || "N/D",
              club_name: c.club_name,
              club_logo_url: c.club_logo_url ?? null,
              contract_type: c.contract_type,
              transfer_fee: c.transfer_fee ?? null,
              start_date: c.start_date,
              end_date: c.end_date,
              days_to_expire: daysToExpire,
              status,
              sort_order: c.sort_order ?? null,
            };
          });

        setAgentMap(newAgentMap);

        // Counts are per-athlete (how many athletes have at least 1 contract matching)
        const playerIds = [...new Set(processed.map(c => c.player_id))];
        const playerMap = new Map<string, ContractWithPlayer[]>();
        for (const c of processed) {
          if (!playerMap.has(c.player_id)) playerMap.set(c.player_id, []);
          playerMap.get(c.player_id)!.push(c);
        }

        setCounts({
          total: playerIds.length,
          expired:  playerIds.filter(id => playerMap.get(id)!.some(c => c.status === "expired")).length,
          expiring: playerIds.filter(id => playerMap.get(id)!.some(c => c.status === "expiring")).length,
          active:   playerIds.filter(id => playerMap.get(id)!.some(c => c.status === "active")).length,
        });

        setAllRaw(processed);
      } catch (err) {
        setError("Erro ao carregar contratos");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const playerGroups = useMemo((): PlayerContractGroup[] => {
    const map = new Map<string, PlayerContractGroup>();

    for (const c of allRaw) {
      if (!map.has(c.player_id)) {
        map.set(c.player_id, {
          player_id: c.player_id,
          player_name: c.player_name,
          player_photo_url: c.player_photo_url,
          player_position: c.player_position,
          agent_name: agentMap[c.player_id]?.agent_name ?? null,
          agent_contact: agentMap[c.player_id]?.agent_contact ?? null,
          m3_contract_start: agentMap[c.player_id]?.m3_contract_start ?? null,
          m3_contract_end: agentMap[c.player_id]?.m3_contract_end ?? null,
          club_contracts: [],
          worst_status: "no_end_date",
        });
      }
      map.get(c.player_id)!.club_contracts.push(c);
    }

    let groups = Array.from(map.values()).map(g => {
      const sorted = [...g.club_contracts].sort((a, b) => {
        if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
        if (a.sort_order !== null) return -1;
        if (b.sort_order !== null) return 1;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
      });
      return { ...g, club_contracts: sorted, worst_status: worstStatus(g.club_contracts) };
    });

    // Apply filter: keep athletes that have ≥1 contract matching the filter
    if (filterStatus) {
      groups = groups.filter(g =>
        g.club_contracts.some(c => {
          if (filterStatus === "expiring") {
            const days = filterDays ?? 90;
            return c.days_to_expire !== null && c.days_to_expire >= 0 && c.days_to_expire <= days;
          }
          return c.status === filterStatus;
        })
      );
    }

    // Sort: worst status first, then alphabetically
    groups.sort((a, b) => {
      const sp = STATUS_PRIORITY[a.worst_status] - STATUS_PRIORITY[b.worst_status];
      if (sp !== 0) return sp;
      return a.player_name.localeCompare(b.player_name, "pt-BR");
    });

    return groups;
  }, [allRaw, agentMap, filterStatus, filterDays]);

  return { playerGroups, loading, error, counts };
}
