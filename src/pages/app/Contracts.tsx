import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h1 className="m3-page-title">Contratos</h1>
        <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">
          {counts.total}
        </span>
      </div>

      {/* Search */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <Input
          placeholder="Buscar atleta, clube ou agente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10 rounded-full bg-zinc-900 border-zinc-800 text-sm h-9 w-full"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-zinc-900/50" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive text-sm">{error}</div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
          <ScrollText className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            {search.trim()
              ? "Nenhum atleta encontrado para esta busca"
              : "Nenhum contrato cadastrado"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGroups.map(group => (
            <AthleteContractRow key={group.player_id} group={group} />
          ))}
        </div>
      )}

      {!loading && filteredGroups.length > 0 && (
        <p className="text-xs text-zinc-600 text-center tabular-nums">
          {filteredGroups.length} atleta{filteredGroups.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
