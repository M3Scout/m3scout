import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContractsByPlayer } from "@/hooks/useContractsByPlayer";
import { ContractFilters } from "@/components/contracts/ContractFilters";
import { AthleteContractRow } from "@/components/contracts/AthleteContractRow";

export default function Contracts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status");
  const initialDays = searchParams.get("days") ? parseInt(searchParams.get("days")!) : 90;

  const [filterStatus, setFilterStatus] = useState<string | null>(initialStatus);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");

  const { playerGroups, loading, error, counts } = useContractsByPlayer(
    filterStatus || undefined,
    initialDays
  );

  const filteredGroups = useMemo(() => {
    const q = (search || mobileSearch).toLowerCase().trim();
    if (!q) return playerGroups;
    return playerGroups.filter(g =>
      g.player_name.toLowerCase().includes(q) ||
      g.club_contracts.some(c => c.club_name?.toLowerCase().includes(q)) ||
      g.agent_name?.toLowerCase().includes(q)
    );
  }, [playerGroups, search, mobileSearch]);

  const handleFilterChange = (status: string | null) => {
    setFilterStatus(status);
    if (status) {
      searchParams.set("status", status);
      if (status === "expiring") searchParams.set("days", "90");
      else searchParams.delete("days");
    } else {
      searchParams.delete("status");
      searchParams.delete("days");
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="m3-page-title">Contratos</h1>
            <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">
              {counts.total}
            </span>
          </div>
          <button className="sm:hidden" onClick={() => setSearchOpen(v => !v)}>
            <Search size={18} className="text-zinc-400" />
          </button>
        </div>
        {searchOpen && (
          <div className="sm:hidden mt-1">
            <input
              autoFocus
              value={mobileSearch}
              onChange={e => setMobileSearch(e.target.value)}
              placeholder="Buscar atleta, clube ou agente..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none"
            />
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar atleta, clube ou agente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-zinc-900 border-zinc-800 text-sm h-9"
          />
        </div>

        <div className="w-full sm:w-auto">
          {/* Mobile filter tabs */}
          <div className="sm:hidden flex w-full border-b border-zinc-800">
            {[
              { key: null,        label: "Todos",     count: counts.total    },
              { key: "expired",   label: "Vencidos",  count: counts.expired  },
              { key: "expiring",  label: "Expirando", count: counts.expiring },
              { key: "active",    label: "Ativos",    count: counts.active   },
            ].map(f => {
              const isActive = filterStatus === f.key;
              return (
                <button
                  key={f.key ?? "all"}
                  onClick={() => handleFilterChange(f.key)}
                  className={[
                    "flex-1 py-2 text-xs font-medium text-center transition-all duration-200 border-b-2",
                    isActive
                      ? "text-zinc-100 border-[#e63946]"
                      : "text-zinc-500 border-transparent hover:text-zinc-300",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="hidden sm:block">
            <ContractFilters
              currentStatus={filterStatus}
              counts={counts}
              onFilterChange={handleFilterChange}
            />
          </div>
        </div>
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
            {(search || mobileSearch).trim()
              ? "Nenhum atleta encontrado para esta busca"
              : filterStatus
              ? "Nenhum atleta encontrado com este filtro"
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
