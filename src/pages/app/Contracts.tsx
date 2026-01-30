import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { FileText, ScrollText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  const initialDays = searchParams.get("days") ? parseInt(searchParams.get("days")!) : undefined;

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
        searchParams.set("days", "30");
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Contratos
          </CardTitle>
          <CardDescription>
            {filterStatus === "expiring"
              ? "Contratos que expiram nos próximos 30 dias"
              : filterStatus === "expired"
              ? "Contratos já vencidos"
              : filterStatus === "active"
              ? "Contratos ativos (mais de 30 dias)"
              : "Todos os contratos registrados"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">{error}</div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-12">
              <ScrollText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                {filterStatus
                  ? "Nenhum contrato encontrado com este filtro"
                  : "Nenhum contrato cadastrado"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Atleta</TableHead>
                    <TableHead>Clube</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-6">Ações</TableHead>
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
        </CardContent>
      </Card>
    </div>
  );
}
