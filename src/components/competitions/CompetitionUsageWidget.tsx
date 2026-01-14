import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, Users, Calendar, Eye, Edit, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CompetitionUsage {
  id: string;
  name: string;
  display_name: string | null;
  tier: string;
  final_coefficient: number;
  base_coefficient: number;
  visibility_score: number | null;
  usage_count: number;
  unique_players: number;
  last_used_at: string | null;
}

import { TIER_COLORS, getTierFromCoefficient } from "@/lib/tierClassification";

const CompetitionUsageWidget = () => {
  const [usageData, setUsageData] = useState<CompetitionUsage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedComp, setSelectedComp] = useState<CompetitionUsage | null>(null);
  const [editBaseCoef, setEditBaseCoef] = useState(1.0);
  const [editVisibility, setEditVisibility] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    setLoading(true);
    
    try {
      // Get usage from player_stats (competition_id is used there)
      const { data: statsData, error: statsError } = await supabase
        .from("player_stats")
        .select("competition_id, player_id, updated_at")
        .not("competition_id", "is", null);

      if (statsError) throw statsError;

      // Get usage from scouting_reports
      const { data: reportsData, error: reportsError } = await supabase
        .from("scouting_reports")
        .select("competition_id, player_id, updated_at");

      if (reportsError) throw reportsError;

      // Aggregate usage by competition
      const usageMap = new Map<string, { count: number; players: Set<string>; lastUsed: string | null }>();
      
      [...(statsData || []), ...(reportsData || [])].forEach((row) => {
        const existing = usageMap.get(row.competition_id) || { count: 0, players: new Set(), lastUsed: null };
        existing.count++;
        existing.players.add(row.player_id);
        if (!existing.lastUsed || row.updated_at > existing.lastUsed) {
          existing.lastUsed = row.updated_at;
        }
        usageMap.set(row.competition_id, existing);
      });

      // Get competition details
      const competitionIds = Array.from(usageMap.keys());
      if (competitionIds.length === 0) {
        setUsageData([]);
        setLoading(false);
        return;
      }

      const { data: compsData, error: compsError } = await supabase
        .from("competitions")
        .select("id, name, display_name, tier, final_coefficient, base_coefficient, visibility_score")
        .in("id", competitionIds);

      if (compsError) throw compsError;

      // Combine data
      const combined: CompetitionUsage[] = (compsData || []).map((comp) => {
        const usage = usageMap.get(comp.id)!;
        return {
          ...comp,
          usage_count: usage.count,
          unique_players: usage.players.size,
          last_used_at: usage.lastUsed,
        };
      });

      // Sort by usage_count DESC
      combined.sort((a, b) => b.usage_count - a.usage_count);

      // Keep top 20
      setUsageData(combined.slice(0, 20));
    } catch (error) {
      console.error("Error fetching usage data:", error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (comp: CompetitionUsage) => {
    setSelectedComp(comp);
    setEditBaseCoef(comp.base_coefficient);
    setEditVisibility(comp.visibility_score ?? 50);
    setEditDialogOpen(true);
  };

  const handleQuickSave = async () => {
    if (!selectedComp) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("competitions")
        .update({
          base_coefficient: editBaseCoef,
          visibility_score: editVisibility,
        })
        .eq("id", selectedComp.id);

      if (error) throw error;

      toast.success("Competição atualizada!");
      setEditDialogOpen(false);
      fetchUsageData();
    } catch (error: any) {
      console.error("Error updating competition:", error);
      toast.error(error.message || "Erro ao atualizar competição");
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (comp: CompetitionUsage) => {
    const newVisibility = (comp.visibility_score ?? 0) > 0 ? 0 : 50;
    
    try {
      const { error } = await supabase
        .from("competitions")
        .update({ visibility_score: newVisibility })
        .eq("id", comp.id);

      if (error) throw error;

      toast.success(newVisibility > 0 ? "Competição visível" : "Competição oculta");
      fetchUsageData();
    } catch (error: any) {
      console.error("Error toggling visibility:", error);
      toast.error("Erro ao alterar visibilidade");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Competições Mais Utilizadas
          </CardTitle>
          <CardDescription>
            Top 20 competições por uso em estatísticas de jogadores e relatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : usageData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma competição em uso ainda</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Competição</TableHead>
                    <TableHead className="text-center">Tier</TableHead>
                    <TableHead className="text-center">Final</TableHead>
                    <TableHead className="text-center">
                      <TrendingUp className="w-4 h-4 inline mr-1" />
                      Usos
                    </TableHead>
                    <TableHead className="text-center">
                      <Users className="w-4 h-4 inline mr-1" />
                      Jogadores
                    </TableHead>
                    <TableHead className="text-center">Último Uso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageData.map((comp) => (
                    <TableRow key={comp.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">
                        {comp.display_name || comp.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={TIER_COLORS[getTierFromCoefficient(comp.final_coefficient)] || TIER_COLORS.C}>
                          {getTierFromCoefficient(comp.final_coefficient)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-mono text-sm">
                        ×{comp.final_coefficient.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center font-semibold text-primary">
                        {comp.usage_count}
                      </TableCell>
                      <TableCell className="text-center">
                        {comp.unique_players}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {comp.last_used_at 
                          ? format(new Date(comp.last_used_at), "dd/MM/yyyy")
                          : "—"
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibility(comp)}
                            title={comp.visibility_score && comp.visibility_score > 0 ? "Ocultar" : "Tornar visível"}
                          >
                            <Eye className={`w-4 h-4 ${(comp.visibility_score ?? 0) > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(comp)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Link to="/app/competitions">
                            <Button variant="ghost" size="icon">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edição Rápida</DialogTitle>
            <DialogDescription>
              {selectedComp?.display_name || selectedComp?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Coeficiente Base</label>
              <Input
                type="number"
                step="0.05"
                min="0.05"
                max="5.00"
                value={editBaseCoef}
                onChange={(e) => setEditBaseCoef(parseFloat(e.target.value) || 0.05)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">0.05 – 5.00</p>
            </div>

            <div>
              <label className="text-sm font-medium">Visibilidade</label>
              <Slider
                value={[editVisibility]}
                onValueChange={([val]) => setEditVisibility(val)}
                max={100}
                step={1}
                className="mt-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Oculto (0)</span>
                <span className="font-medium">{editVisibility}</span>
                <span>Máxima (100)</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleQuickSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompetitionUsageWidget;
