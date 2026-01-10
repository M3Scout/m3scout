import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Database,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  errors: string[];
}

const CompetitionsImport = () => {
  const [competitionsFile, setCompetitionsFile] = useState<File | null>(null);
  const [stateTiersFile, setStateTiersFile] = useState<File | null>(null);
  const [isImportingCompetitions, setIsImportingCompetitions] = useState(false);
  const [isImportingStateTiers, setIsImportingStateTiers] = useState(false);
  const [competitionsResult, setCompetitionsResult] = useState<ImportResult | null>(null);
  const [stateTiersResult, setStateTiersResult] = useState<ImportResult | null>(null);

  const parseCSV = (text: string): Record<string, string>[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const rows: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        rows.push(row);
      }
    }
    
    return rows;
  };

  const handleImportCompetitions = async () => {
    if (!competitionsFile) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setIsImportingCompetitions(true);
    setCompetitionsResult(null);

    try {
      const text = await competitionsFile.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error("Arquivo CSV vazio ou inválido");
      }

      let inserted = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          // Map CSV columns to database columns
          const mappedType = mapCompetitionType(row.type || row.competition_type || 'league') as 'league' | 'cup' | 'state_league' | 'continental';
          
          const name = row.name || row.competition_name || '';
          const country = row.country || 'Brasil';
          const state = row.state || null;
          const division = row.division || row.division_label || null;
          const phase = row.phase || row.phase_label || null;

          if (!name) {
            errors.push(`Linha ignorada: nome vazio`);
            continue;
          }

          // Upsert by unique key
          const { data: existing } = await supabase
            .from('competitions')
            .select('id')
            .eq('country', country)
            .eq('name', name)
            .eq('division', division)
            .eq('phase', phase)
            .maybeSingle();

          const competitionData = {
            name,
            country,
            state,
            type: mappedType,
            division,
            phase,
            base_coefficient: parseFloat(row.base_coefficient) || 1.0,
            computed_coefficient: parseFloat(row.computed_coefficient) || parseFloat(row.base_coefficient) || 1.0,
            visibility_score: parseInt(row.visibility_score) || 50,
            is_active: true,
          };

          if (existing) {
            const { error } = await supabase
              .from('competitions')
              .update(competitionData)
              .eq('id', existing.id);
            
            if (error) throw error;
            updated++;
          } else {
            const { error } = await supabase
              .from('competitions')
              .insert(competitionData);
            
            if (error) throw error;
            inserted++;
          }
        } catch (rowError: any) {
          errors.push(`Erro na linha: ${rowError.message}`);
        }
      }

      setCompetitionsResult({ success: true, inserted, updated, errors });
      toast.success(`Importação concluída: ${inserted} inseridos, ${updated} atualizados`);
    } catch (error: any) {
      setCompetitionsResult({ success: false, inserted: 0, updated: 0, errors: [error.message] });
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImportingCompetitions(false);
    }
  };

  const handleImportStateTiers = async () => {
    if (!stateTiersFile) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setIsImportingStateTiers(true);
    setStateTiersResult(null);

    try {
      const text = await stateTiersFile.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        throw new Error("Arquivo CSV vazio ou inválido");
      }

      let inserted = 0;
      let updated = 0;
      const errors: string[] = [];

      for (const row of rows) {
        try {
          const tierData = {
            state: row.state || row.state_code || '',
            state_name: row.state_name || null,
            tier: parseInt(row.tier) || 1,
            tier_label: row.tier_label || null,
            base_coefficient: parseFloat(row.base_coefficient) || 1.0,
            notes: row.notes || null,
          };

          if (!tierData.state) {
            errors.push(`Linha ignorada: estado vazio`);
            continue;
          }

          // Upsert by state + tier
          const { data: existing } = await supabase
            .from('brazil_state_tiers')
            .select('id')
            .eq('state', tierData.state)
            .eq('tier', tierData.tier)
            .maybeSingle();

          if (existing) {
            const { error } = await supabase
              .from('brazil_state_tiers')
              .update(tierData)
              .eq('id', existing.id);
            
            if (error) throw error;
            updated++;
          } else {
            const { error } = await supabase
              .from('brazil_state_tiers')
              .insert(tierData);
            
            if (error) throw error;
            inserted++;
          }
        } catch (rowError: any) {
          errors.push(`Erro na linha: ${rowError.message}`);
        }
      }

      setStateTiersResult({ success: true, inserted, updated, errors });
      toast.success(`Importação concluída: ${inserted} inseridos, ${updated} atualizados`);
    } catch (error: any) {
      setStateTiersResult({ success: false, inserted: 0, updated: 0, errors: [error.message] });
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImportingStateTiers(false);
    }
  };

  const mapCompetitionType = (type: string): string => {
    const typeMap: Record<string, string> = {
      'league': 'league',
      'liga': 'league',
      'campeonato': 'league',
      'cup': 'cup',
      'copa': 'cup',
      'state_league': 'state_league',
      'estadual': 'state_league',
      'continental': 'continental',
      'libertadores': 'continental',
      'sulamericana': 'continental',
    };
    return typeMap[type.toLowerCase()] || 'league';
  };

  const ResultDisplay = ({ result, label }: { result: ImportResult | null; label: string }) => {
    if (!result) return null;

    return (
      <div className={`p-4 rounded-lg ${result.success ? 'bg-primary/10 border border-primary/30' : 'bg-destructive/10 border border-destructive/30'}`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircle className="w-5 h-5 text-primary" />
          ) : (
            <AlertCircle className="w-5 h-5 text-destructive" />
          )}
          <span className="font-medium">{label}</span>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>✓ {result.inserted} registros inseridos</p>
          <p>↻ {result.updated} registros atualizados</p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-destructive">Erros ({result.errors.length}):</p>
              <ul className="list-disc list-inside text-xs max-h-32 overflow-y-auto">
                {result.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {result.errors.length > 10 && (
                  <li>... e mais {result.errors.length - 10} erros</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/app/competitions"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para competições
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          Importar Competições
        </h1>
        <p className="text-muted-foreground mt-2">
          Importe arquivos CSV para atualizar as competições e coeficientes.
          A reimportação atualiza registros existentes automaticamente.
        </p>
      </div>

      {/* Import Competitions */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Competições (competitions_brazil_core_cbf.csv)</h2>
            <p className="text-sm text-muted-foreground">
              Colunas esperadas: name, country, state, type, division, phase, base_coefficient, computed_coefficient, visibility_score
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="competitionsFile">Arquivo CSV</Label>
            <Input
              id="competitionsFile"
              type="file"
              accept=".csv"
              onChange={(e) => setCompetitionsFile(e.target.files?.[0] || null)}
              className="input-dark"
            />
          </div>

          {competitionsFile && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {competitionsFile.name} ({Number.isFinite(competitionsFile.size) ? (competitionsFile.size / 1024).toFixed(1) : "—"} KB)
            </p>
          )}

          <Button
            onClick={handleImportCompetitions}
            disabled={!competitionsFile || isImportingCompetitions}
            variant="gradient"
          >
            {isImportingCompetitions ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar Competições
              </>
            )}
          </Button>

          <ResultDisplay result={competitionsResult} label="Resultado da importação" />
        </div>
      </div>

      {/* Import State Tiers */}
      <div className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-accent" />
          <div>
            <h2 className="text-lg font-semibold">Níveis Estaduais (brazil_state_tiers_cbf.csv)</h2>
            <p className="text-sm text-muted-foreground">
              Colunas esperadas: state, state_name, tier, tier_label, base_coefficient, notes
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stateTiersFile">Arquivo CSV</Label>
            <Input
              id="stateTiersFile"
              type="file"
              accept=".csv"
              onChange={(e) => setStateTiersFile(e.target.files?.[0] || null)}
              className="input-dark"
            />
          </div>

          {stateTiersFile && (
            <p className="text-sm text-muted-foreground">
              Arquivo selecionado: {stateTiersFile.name} ({Number.isFinite(stateTiersFile.size) ? (stateTiersFile.size / 1024).toFixed(1) : "—"} KB)
            </p>
          )}

          <Button
            onClick={handleImportStateTiers}
            disabled={!stateTiersFile || isImportingStateTiers}
            variant="gradient"
          >
            {isImportingStateTiers ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar Níveis Estaduais
              </>
            )}
          </Button>

          <ResultDisplay result={stateTiersResult} label="Resultado da importação" />
        </div>
      </div>

      {/* Info Box */}
      <div className="glass-card p-6 bg-primary/5 border-primary/20">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-primary" />
          Sobre a Reimportação
        </h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>• <strong>Competições:</strong> Chave única = country + state + name + division + phase</li>
          <li>• <strong>Níveis Estaduais:</strong> Chave única = state + tier</li>
          <li>• Se a chave já existir, o registro será atualizado (não duplicado)</li>
          <li>• O <code>computed_coefficient</code> será usado automaticamente nos relatórios de scouting</li>
        </ul>
      </div>
    </div>
  );
};

export default CompetitionsImport;
