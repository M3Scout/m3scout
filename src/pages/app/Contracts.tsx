import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, ScrollText } from "lucide-react";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

  // Update URL when filter changes
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
    <div className="space-y-6 pb-8 px-[var(--padding-mobile)] md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Contratos</h1>
            <p className="text-sm text-muted-foreground">
              Gestão de contratos dos atletas
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ContractFilters
        currentStatus={filterStatus}
        counts={counts}
        onFilterChange={handleFilterChange}
      />

      {/* Table */}
      <div className="rounded-xl bg-zinc-900/80 backdrop-blur-sm border border-white/[0.04] shadow-[0_4px_24px_-6px_hsl(222_50%_3%/0.5)]">
        <div className="p-6 pb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Lista de Contratos
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filterStatus === "expiring"
              ? "Contratos que expiram nos próximos 90 dias"
              : filterStatus === "expired"
              ? "Contratos já vencidos"
              : filterStatus === "active"
              ? "Contratos ativos (mais de 90 dias)"
              : "Todos os contratos registrados"}
          </p>
        </div>
        <div className="px-6 pb-6">
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full bg-zinc-800/50" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12 rounded-lg bg-zinc-950/60 border border-white/[0.04]">
              <ScrollText className="h-12 w-12 mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-500">
                {filterStatus
                  ? "Nenhum contrato encontrado com este filtro"
                  : "Nenhum contrato cadastrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/[0.04] hover:bg-transparent">
                    <TableHead className="pl-6 text-zinc-400">Atleta</TableHead>
                    <TableHead className="text-zinc-400">Clube</TableHead>
                    <TableHead className="text-zinc-400">Tipo</TableHead>
                    <TableHead className="text-zinc-400">Vencimento</TableHead>
                    <TableHead className="text-zinc-400">Status</TableHead>
                    <TableHead className="pr-6 text-zinc-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <ContractRow key={contract.id} contract={contract} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
