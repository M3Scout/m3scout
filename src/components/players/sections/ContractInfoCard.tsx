import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Building, MapPin, Users, Calendar } from "lucide-react";

interface ContractInfoCardProps {
  currentClub: string | null;
  country: string | null;
  agentName: string | null;
  agentContact: string | null;
  contractEnd: string | null;
  contractStatus: string | null;
}

function getStatusColor(status: string | null): string {
  switch (status?.toLowerCase()) {
    case "free":
    case "livre":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "contracted":
    case "contratado":
      return "bg-primary/20 text-primary border-primary/30";
    case "loan":
    case "emprestado":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:
      return "bg-secondary text-muted-foreground";
  }
}

function getStatusLabel(status: string | null): string {
  switch (status?.toLowerCase()) {
    case "free":
    case "livre":
      return "Livre";
    case "contracted":
    case "contratado":
      return "Contratado";
    case "loan":
    case "emprestado":
      return "Emprestado";
    default:
      return status || "—";
  }
}

export function ContractInfoCard({
  currentClub,
  country,
  agentName,
  agentContact,
  contractEnd,
  contractStatus,
}: ContractInfoCardProps) {
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getDaysUntilEnd = (date: string) => {
    const end = new Date(date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="w-5 h-5 text-primary" />
          Informações Contratuais
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {contractStatus && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge className={getStatusColor(contractStatus)}>
                {getStatusLabel(contractStatus)}
              </Badge>
            </div>
          )}
          
          {currentClub && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Building className="w-3 h-3" />
                Clube
              </p>
              <p className="font-medium text-sm">{currentClub}</p>
            </div>
          )}
          
          {country && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                País
              </p>
              <p className="font-medium text-sm">{country}</p>
            </div>
          )}
          
          {agentName && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                Agente
              </p>
              <p className="font-medium text-sm">{agentName}</p>
              {agentContact && (
                <p className="text-xs text-muted-foreground">{agentContact}</p>
              )}
            </div>
          )}
          
          {contractEnd && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fim do Contrato
              </p>
              <p className="font-medium text-sm">{formatDate(contractEnd)}</p>
              {getDaysUntilEnd(contractEnd) > 0 && getDaysUntilEnd(contractEnd) <= 180 && (
                <Badge variant="destructive" className="text-xs mt-1">
                  {getDaysUntilEnd(contractEnd)} dias restantes
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
