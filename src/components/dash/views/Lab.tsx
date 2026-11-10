import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { shortPos } from "../ui";

import { mountLab } from "./labEngine";

/* =====================================================================
   Lab. Tático — motor de painel.html com o elenco e os atributos reais
   ===================================================================== */

const COLS = ["ata_score_100", "tec_score_100", "tat_score_100", "def_score_100", "cri_score_100"] as const;

function useLabData(enabled: boolean) {
  return useQuery({
    queryKey: ["dash-m3", "lab-data"],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data: players } = await supabase.from("players")
        .select("id, full_name, position, age, photo_url")
        .or("is_archived.is.null,is_archived.eq.false").order("full_name");
      const list = players ?? [];
      const ids = list.map((p) => p.id);
      const { data: scores } = ids.length
        ? await supabase.from("player_attribute_scores")
          .select("player_id, season_year, ata_score_100, tec_score_100, tat_score_100, def_score_100, cri_score_100, details").in("player_id", ids)
        : { data: [] };
      const A: Record<string, { name: string; short: string; pos: string; age: number | null }> = {};
      const IMG: Record<string, string> = {};
      const latest: Record<string, number[]> = {};
      for (const p of list) {
        const parts = p.full_name.split(" ");
        A[p.id] = { name: p.full_name, short: parts[0], pos: shortPos(p.position), age: p.age };
        if (p.photo_url) IMG[p.id] = getOptimizedImageUrl(p.photo_url, { width: 200, quality: 80, format: "webp" }) || p.photo_url;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = ((scores ?? []) as any[]).filter((r) => r.player_id === p.id);
        if (!rows.length) continue;
        const y = Math.max(...rows.map((r) => r.season_year));
        let w = 0; const s = [0, 0, 0, 0, 0];
        rows.filter((r) => r.season_year === y).forEach((r) => {
          const m = Math.max(Number(r.details?.minutes ?? 0), 1);
          COLS.forEach((c, i) => (s[i] += (r[c] ?? 0) * m)); w += m;
        });
        latest[p.id] = s.map((v) => Math.round(v / (w || 1)));
      }
      // o motor lê ATTR[2026]: usamos a temporada mais recente de cada atleta
      return { A, IMG, ATTR: { 2026: latest } };
    },
  });
}

export function Lab() {
  const { session, permissionsLoading, rolesLoading } = useAuth();
  const ready = Boolean(session?.user) && !permissionsLoading && !rolesLoading;
  const { data, isLoading } = useLabData(ready);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data || !ref.current) return;
    return mountLab(ref.current, { ...data, toast: (m) => toast(m) });
  }, [data]);

  return (
    <div className="m3v">
      {isLoading || !data ? <p style={{ color: "var(--l3)", paddingTop: 48 }}>Carregando o elenco…</p> : null}
      <div ref={ref} />
    </div>
  );
}
