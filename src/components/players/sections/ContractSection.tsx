import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Building2, Calendar, User, Globe, DollarSign } from "lucide-react";

interface ContractData {
  current_club?: string | null;
  contract_start?: string | null;
  contract_end?: string | null;
  agent_name?: string | null;
  agent_contact?: string | null;
  release_clause?: string | null;
  contract_status?: string | null;
  passports?: string[] | null;
  contract_notes?: string | null;
  salary_info?: string | null;
}

interface ContractSectionProps {
  data: ContractData;
}

const getStatusColor = (status: string | null | undefined) => {
  switch (status) {
    case "free":
    case "livre":
      return "bg-green-500/10 text-green-600 border-green-500/20";
    case "contracted":
    case "contratado":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "loan":
    case "emprestimo":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getStatusLabel = (status: string | null | undefined) => {
  switch (status) {
    case "free":
    case "livre":
      return "Livre";
    case "contracted":
    case "contratado":
      return "Contratado";
    case "loan":
    case "emprestimo":
      return "Empréstimo";
    default:
      return status || "—";
  }
};

const InfoItem = ({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string | null | undefined;
}) => (
  <div className="flex items-start gap-3">
    <div className="p-2 rounded-lg bg-primary/10 mt-0.5">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value || <span className="text-muted-foreground">—</span>}</p>
    </div>
  </div>
);

export const ContractSection = ({ data }: ContractSectionProps) => {
  const hasPassports = data.passports && data.passports.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Situação Contratual
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge variant="outline" className={getStatusColor(data.contract_status)}>
            {getStatusLabel(data.contract_status)}
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem icon={Building2} label="Clube Atual" value={data.current_club} />
          <InfoItem icon={User} label="Empresário/Agência" value={data.agent_name} />
          <InfoItem 
            icon={Calendar} 
            label="Início do Contrato" 
            value={data.contract_start ? new Date(data.contract_start).toLocaleDateString("pt-BR") : null} 
          />
          <InfoItem 
            icon={Calendar} 
            label="Fim do Contrato" 
            value={data.contract_end ? new Date(data.contract_end).toLocaleDateString("pt-BR") : null} 
          />
          <InfoItem icon={DollarSign} label="Multa Rescisória" value={data.release_clause} />
          {data.agent_contact && (
            <InfoItem icon={User} label="Contato do Agente" value={data.agent_contact} />
          )}
        </div>

        {/* Passports */}
        {hasPassports && (
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Passaportes</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.passports!.map((passport) => (
                <Badge key={passport} variant="secondary">
                  {passport}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Salary Info */}
        {data.salary_info && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Informações Salariais</p>
            <p className="text-sm">{data.salary_info}</p>
          </div>
        )}

        {/* Contract Notes */}
        {data.contract_notes && (
          <div className="pt-4 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Notas de Contrato</p>
            <p className="text-sm">{data.contract_notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
