import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ContractWithPlayer {
  id: string;
  player_id: string;
  player_name: string;
  player_photo_url: string | null;
  player_position: string;
  club_name: string;
  contract_type: string;
  start_date: string;
  end_date: string | null;
  days_to_expire: number | null;
  status: "expired" | "expiring" | "active" | "no_end_date";
  sort_order: number | null;
}

export function useContracts(filterStatus?: string, filterDays?: number) {
  const [contracts, setContracts] = useState<ContractWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState({
    total: 0,
    expired: 0,
    expiring: 0,
    active: 0,
  });

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        setLoading(true);
        
        // Fetch all contracts with player info
        const { data, error: fetchError } = await supabase
          .from("player_contract_history")
          .select(`
            id,
            player_id,
            club_name,
            contract_type,
            start_date,
            end_date,
            players!player_contract_history_player_id_fkey (
              full_name,
              photo_url,
              position,
              is_archived
            )
          `)
          .order("end_date", { ascending: true, nullsFirst: false });

        if (fetchError) throw fetchError;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const processed: ContractWithPlayer[] = (data || [])
          .filter((c: any) => !c.players?.is_archived)
          .map((c: any) => {
            let daysToExpire: number | null = null;
            let status: ContractWithPlayer["status"] = "no_end_date";

            if (c.end_date) {
              const endDate = new Date(c.end_date);
              endDate.setHours(0, 0, 0, 0);
              daysToExpire = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

              if (daysToExpire < 0) {
                status = "expired";
              } else if (daysToExpire <= 90) {
                status = "expiring";
              } else {
                status = "active";
              }
            }

            return {
              id: c.id,
              player_id: c.player_id,
              player_name: c.players?.full_name || "Atleta desconhecido",
              player_photo_url: c.players?.photo_url || null,
              player_position: c.players?.position || "N/D",
              club_name: c.club_name,
              contract_type: c.contract_type,
              start_date: c.start_date,
              end_date: c.end_date,
              days_to_expire: daysToExpire,
              status,
            };
          });

        // Calculate counts
        const countExpired = processed.filter((c) => c.status === "expired").length;
        const countExpiring = processed.filter((c) => c.status === "expiring").length;
        const countActive = processed.filter((c) => c.status === "active").length;

        setCounts({
          total: processed.length,
          expired: countExpired,
          expiring: countExpiring,
          active: countActive,
        });

        // Apply filters
        let filtered = processed;

        if (filterStatus) {
          if (filterStatus === "expiring" && filterDays) {
            filtered = processed.filter(
              (c) => c.days_to_expire !== null && c.days_to_expire >= 0 && c.days_to_expire <= filterDays
            );
          } else if (filterStatus === "expiring") {
            // Default to 90 days if no filterDays specified
            filtered = processed.filter(
              (c) => c.days_to_expire !== null && c.days_to_expire >= 0 && c.days_to_expire <= 90
            );
          } else {
            filtered = processed.filter((c) => c.status === filterStatus);
          }
        }

        // Sort by days_to_expire (ascending), expired first, then expiring, then active
        filtered.sort((a, b) => {
          // Handle no_end_date at the end
          if (a.status === "no_end_date" && b.status !== "no_end_date") return 1;
          if (b.status === "no_end_date" && a.status !== "no_end_date") return -1;
          
          // Sort by days_to_expire
          if (a.days_to_expire === null) return 1;
          if (b.days_to_expire === null) return -1;
          return a.days_to_expire - b.days_to_expire;
        });

        setContracts(filtered);
      } catch (err) {
        console.error("Error fetching contracts:", err);
        setError("Erro ao carregar contratos");
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [filterStatus, filterDays]);

  return { contracts, loading, error, counts };
}
