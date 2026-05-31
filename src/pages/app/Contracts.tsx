import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useContracts } from "@/hooks/useContracts";
import { ContractFilters } from "@/components/contracts/ContractFilters";
import { ContractRow } from "@/components/contracts/ContractRow";

const contractTypeLabels: Record<string, string> = {
  permanent: "Definitivo",
  loan: "Empréstimo",
  trial: "Teste",
  youth: "Base/Formação",
};

export default function Contracts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status");
  const initialDays = searchParams.get("days") ? parseInt(searchParams.get("days")!) : 90;

  const [filterStatus, setFilterStatus] = useState<string | null>(initialStatus);
  const [search, setSearch] = useState("");

  const { contracts, loading, error, counts } = useContracts(
    filterStatus || undefined,
    initialDays
  );

  const filteredContracts = useMemo(() => {
    if (!search.trim()) return contracts;
    const q = search.toLowerCase();
    return contracts.filter(c =>
      c.player_name.toLowerCase().includes(q) ||
      c.club_name?.toLowerCase().includes(q) ||
      (contractTypeLabels[c.contract_type] || c.contract_type).toLowerCase().includes(q)
    );
  }, [contracts, search]);

  const handleFilterChange = (status: string | null) => {
    setFilterStatus(status);
    if (status) {
      searchParams.set("status", status);
      if (status === "expiring") {
        searchParams.set("days", "90");
      } else {
        searchParams.delete("days");
      }
    } else {
      searchParams.delete("status");
      searchParams.delete("days");
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="space-y-5 pb-8 px-[var(--padding-mobile)] md:px-0">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="m3-page-title">Contratos</h1>
          <span className="inline-flex items-center justify-center min-w-[28px] h-6 px-2 rounded-full text-[13px] font-bold text-white bg-[#e63946]">{contracts.length}</span>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            placeholder="Buscar atleta, clube ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-zinc-900 border-zinc-800 text-sm h-9"
          />
        </div>
        <ContractFilters
          currentStatus={filterStatus}
          counts={counts}
          onFilterChange={handleFilterChange}
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
      ) : filteredContracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
          <ScrollText className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            {search.trim()
              ? "Nenhum contrato encontrado para esta busca"
              : filterStatus
              ? "Nenhum contrato encontrado com este filtro"
              : "Nenhum contrato cadastrado"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContracts.map((contract) => (
            <ContractRow key={contract.id} contract={contract} />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && filteredContracts.length > 0 && (
        <p className="text-xs text-zinc-600 text-center tabular-nums">
          {filteredContracts.length} contrato{filteredContracts.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
