import { useEffect, useState } from "react";
import { ScrollText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { AthleteContractRow } from "@/components/contracts/AthleteContractRow";
import type { PlayerContractGroup } from "@/hooks/useContractsByPlayer";
import type { ContractWithPlayer } from "@/hooks/useContracts";

const STATUS_PRIORITY: Record<string, number> = {
  expired: 0, expiring: 1, active: 2, no_end_date: 3,
};

function worstStatus(contracts: ContractWithPlayer[]): PlayerContractGroup["worst_status"] {
  if (!contracts.length) return "no_end_date";
  return contracts.reduce<ContractWithPlayer["status"]>((best, c) =>
    STATUS_PRIORITY[c.status] < STATUS_PRIORITY[best] ? c.status : best,
    contracts[0].status
  );
}

export default function MyContracts() {
  const { linkedPlayerId } = useAuth();
  const [group, setGroup]   = useState<PlayerContractGroup | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!linkedPlayerId) { setLoading(false); return; }

    const fetch = async () => {
      try {
        const [{ data: hist, error: e1 }, { data: playerRows, error: e2 }] = await Promise.all([
          supabase
            .from("player_contract_history")
            .select("id, player_id, club_name, club_logo_url, contract_type, transfer_fee, start_date, end_date, sort_order")
            .eq("player_id", linkedPlayerId)
            .eq("is_archived", false)
            .order("sort_order", { ascending: true, nullsFirst: false }),
          supabase
            .from("players")
            .select("full_name, photo_url, position, agent_name, agent_contact, m3_contract_start, m3_contract_end")
            .eq("id", linkedPlayerId)
            .limit(1),
        ]);

        if (e1) throw e1;
        if (e2) throw e2;

        const player = playerRows?.[0] ?? null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const club_contracts: ContractWithPlayer[] = (hist ?? []).map((c: any) => {
          let daysToExpire: number | null = null;
          let status: ContractWithPlayer["status"] = "no_end_date";
          if (c.end_date) {
            const endDate = new Date(c.end_date);
            endDate.setHours(0, 0, 0, 0);
            daysToExpire = Math.ceil((endDate.getTime() - today.getTime()) / 86400000);
            status = daysToExpire < 0 ? "expired" : daysToExpire <= 90 ? "expiring" : "active";
          }
          return {
            id: c.id,
            player_id: c.player_id,
            player_name: player?.full_name ?? "",
            player_photo_url: player?.photo_url ?? null,
            player_position: player?.position ?? "",
            club_name: c.club_name,
            club_logo_url: c.club_logo_url ?? null,
            contract_type: c.contract_type,
            transfer_fee: c.transfer_fee ?? null,
            start_date: c.start_date,
            end_date: c.end_date ?? null,
            days_to_expire: daysToExpire,
            status,
            sort_order: c.sort_order ?? null,
          };
        });

        const sorted = [...club_contracts].sort((a, b) => {
          const dateDiff = new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
          if (dateDiff !== 0) return dateDiff;
          if (a.sort_order !== null && b.sort_order !== null) return a.sort_order - b.sort_order;
          return 0;
        });

        setGroup({
          player_id:         linkedPlayerId,
          player_name:       player?.full_name         ?? "",
          player_photo_url:  player?.photo_url         ?? null,
          player_position:   player?.position          ?? "",
          agent_name:        player?.agent_name        ?? null,
          agent_contact:     player?.agent_contact     ?? null,
          m3_contract_start: player?.m3_contract_start ?? null,
          m3_contract_end:   player?.m3_contract_end   ?? null,
          club_contracts:    sorted,
          worst_status:      worstStatus(sorted),
        });
      } catch (e) {
        console.error("[MyContracts]", e);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [linkedPlayerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      {/* Header — igual ao /dashboard/contratos */}
      <div className="flex items-center gap-3">
        <h1 className="m3-page-title">Contratos</h1>
        {group && (
          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">
            {group.club_contracts.length}
          </span>
        )}
      </div>

      {!group || group.club_contracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
          <ScrollText className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Nenhum contrato cadastrado</p>
        </div>
      ) : (
        <AthleteContractRow group={group} />
      )}
    </div>
  );
}
