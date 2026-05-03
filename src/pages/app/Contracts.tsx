import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ScrollText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useContracts } from "@/hooks/useContracts";
import { ContractFilters } from "@/components/contracts/ContractFilters";
import { ContractRow } from "@/components/contracts/ContractRow";

export default function Contracts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get("status");
  const initialDays = searchParams.get("days") ? parseInt(searchParams.get("days")!) : 90;

  const [filterStatus, setFilterStatus] = useState<string | null>(initialStatus);

  const { contracts, loading, error, counts } = useContracts(
    filterStatus || undefined,
    initialDays
  );

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
        <h1 className="text-2xl font-extrabold tracking-tight">Contratos</h1>
        <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wide">
          Gestão de contratos dos atletas
        </p>
      </div>

      {/* Filters */}
      <ContractFilters
        currentStatus={filterStatus}
        counts={counts}
        onFilterChange={handleFilterChange}
      />

      {/* List */}
      {loading ? (
        <div className="space-y-2.5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl bg-zinc-900/50" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-8 text-destructive text-sm">{error}</div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 rounded-xl bg-zinc-900/30 border border-zinc-800/30">
          <ScrollText className="h-10 w-10 mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">
            {filterStatus
              ? "Nenhum contrato encontrado com este filtro"
              : "Nenhum contrato cadastrado"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <ContractRow key={contract.id} contract={contract} />
          ))}
        </div>
      )}

      {/* Count */}
      {!loading && contracts.length > 0 && (
        <p className="text-xs text-zinc-600 text-center tabular-nums">
          {contracts.length} contrato{contracts.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
