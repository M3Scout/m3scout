import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Ic } from "@/components/dash/icons";
import { Head, View } from "@/components/dash/ui";
import { useContractsByPlayer } from "@/hooks/useContractsByPlayer";
import { AthleteContractRow } from "@/components/contracts/AthleteContractRow";

export default function Contracts() {
  const [search, setSearch] = useState("");
  const [searchParams] = useSearchParams();

  const filterStatus = searchParams.get("status") ?? undefined;
  const filterDays = searchParams.has("days") ? Number(searchParams.get("days")) : undefined;

  const { playerGroups, loading, error, counts } = useContractsByPlayer(filterStatus, filterDays);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return playerGroups;
    return playerGroups.filter(g =>
      g.player_name.toLowerCase().includes(q) ||
      g.club_contracts.some(c => c.club_name?.toLowerCase().includes(q)) ||
      g.agent_name?.toLowerCase().includes(q)
    );
  }, [playerGroups, search]);

  return (
    <View>
      <Head title="Contratos" />

      <div className="tools" style={{ ["--s" as string]: 1 }}>
        <label className="field" style={{ maxWidth: "none" }}>
          <Ic n="search" />
          <span className="sr">Buscar</span>
          <input type="search" placeholder="Buscar atleta, clube ou agente" value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      <section style={{ ["--s" as string]: 2, display: "grid", gap: "var(--gap)" }}>
        {loading ? (
          [...Array(5)].map((_, i) => <div key={i} className="card" style={{ height: 94, opacity: 0.4 }} />)
        ) : error ? (
          <div className="empty">{error}</div>
        ) : filteredGroups.length === 0 ? (
          <div className="empty">{search.trim() ? "Nenhum atleta encontrado para esta busca." : "Nenhum contrato cadastrado."}</div>
        ) : (
          filteredGroups.map((group) => <AthleteContractRow key={group.player_id} group={group} />)
        )}
      </section>

      {!loading && filteredGroups.length > 0 && (
        <p style={{ margin: "18px 0 0", fontSize: 13, color: "var(--l3)", textAlign: "center" }}>
          {filteredGroups.length} atleta{filteredGroups.length !== 1 ? "s" : ""}
        </p>
      )}
    </View>
  );
}
