import { useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Match, MatchPlayer, MatchEvent, MatchEventType } from "@/hooks/useLiveMatch";
import { FileDown, Loader2 } from "lucide-react";
import { exportToPdf } from "@/lib/pdfExport";
import { toast } from "sonner";
import logoM3 from "@/assets/logo-m3.png";
import { useTeamSettings } from "@/hooks/useTeamSettings";

// Event type labels
const EVENT_LABELS: Record<MatchEventType, string> = {
  goal: "Gol",
  assist: "Assistência",
  shot: "Finalização Fora",
  shot_on_target: "Finalização Gol",
  key_pass: "Passe Decisivo",
  chance_created: "Chance Criada",
  dribble_success: "Drible Certo",
  dribble_attempt: "Drible Tentativa",
  tackle: "Desarme",
  interception: "Interceptação",
  recovery: "Recuperação",
  clearance: "Corte",
  duel_won: "Duelo Ganho",
  duel_total: "Duelo Total",
  ground_duel_won: "Duelo no Chão",
  ground_duel_total: "Duelo no Chão (Perdido)",
  aerial_duel_won: "Duelo Aéreo",
  aerial_duel_total: "Duelo Aéreo (Perdido)",
  yellow: "Amarelo",
  red: "Vermelho",
  foul_committed: "Falta Cometida",
  foul_suffered: "Falta Sofrida",
  pass_success: "Passe Certo",
  pass_total: "Passe Total",
  possession_lost: "Bola Perdida",
  save: "Defesa",
  goal_conceded: "Gol Sofrido",
  clean_sheet: "Clean Sheet",
  penalty_saved: "Pênalti Def.",
  error_led_to_goal: "Erro→Gol",
  box_save: "Def. Área",
  punch: "Soco",
  high_claim: "Bola Alta",
  sweeper_action: "Saída Gol",
  substitution: "Substituição",
  // Player presence events
  player_on: "Entrou",
  player_off: "Saiu",
};

interface MatchSummaryPdfProps {
  match: Match;
  matchPlayers: MatchPlayer[];
  matchEvents: MatchEvent[];
  playerEventCounts: Record<string, Partial<Record<MatchEventType, number>>>;
}

export function MatchSummaryPdfButton({
  match,
  matchPlayers,
  matchEvents,
  playerEventCounts,
}: MatchSummaryPdfProps) {
  const [isExporting, setIsExporting] = useState(false);
  const templateRef = useRef<HTMLDivElement>(null);
  const { teamName: settingsTeamName } = useTeamSettings();

  const handleExport = async () => {
    if (!templateRef.current) return;
    
    setIsExporting(true);
    try {
      const filename = `resumo-jogo-${match.opponent_name.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(match.match_date), 'yyyy-MM-dd')}.pdf`;
      
      await exportToPdf(templateRef.current, {
        filename,
        outputResolution: 3, // Higher quality for crisp text
        onProgress: (progress) => {
          console.log(`PDF Export progress: ${progress}%`);
        },
      });
      
      toast.success("PDF exportado com sucesso!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Erro ao exportar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Calculate stats by half
  const getHalfStats = () => {
    const first = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, shots: 0, saves: 0 };
    const second = { goals: 0, assists: 0, yellowCards: 0, redCards: 0, shots: 0, saves: 0 };

    matchEvents.forEach((event) => {
      const stats = event.half === 2 ? second : first;
      switch (event.event_type) {
        case "goal": stats.goals += event.value; break;
        case "assist": stats.assists += event.value; break;
        case "yellow": stats.yellowCards += event.value; break;
        case "red": stats.redCards += event.value; break;
        case "shot":
        case "shot_on_target": stats.shots += event.value; break;
        case "save": stats.saves += event.value; break;
      }
    });

    return { first, second };
  };

  // Group events by half
  const getEventsByHalf = () => {
    const first: MatchEvent[] = [];
    const second: MatchEvent[] = [];

    matchEvents.forEach((event) => {
      if (event.half === 2) {
        second.push(event);
      } else {
        first.push(event);
      }
    });

    // Sort by minute
    const sortByMinute = (a: MatchEvent, b: MatchEvent) => (a.minute ?? 0) - (b.minute ?? 0);
    
    return {
      firstHalf: first.sort(sortByMinute),
      secondHalf: second.sort(sortByMinute),
    };
  };

  const getPlayerName = (playerId: string) => {
    const mp = matchPlayers.find((p) => p.player_id === playerId);
    return mp?.player?.full_name || "Jogador";
  };

  const halfStats = getHalfStats();
  const eventsByHalf = getEventsByHalf();
  const competitionName = match.competition?.display_name || match.competition?.name || "Competição";
  const teamName = match.team_name_display || settingsTeamName || "Time";

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Exportando...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Exportar PDF
          </>
        )}
      </Button>

      {/* Hidden PDF Template */}
      <div className="fixed -left-[9999px] top-0">
        <div
          ref={templateRef}
          className="w-[794px] bg-white text-black p-8"
          style={{ fontFamily: "Inter, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-gray-200">
            <div className="flex items-center gap-4">
              <img src={logoM3} alt="M3 Scouting" className="h-12 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Resumo do Jogo</h1>
                <p className="text-sm text-gray-600">{competitionName}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{teamName} vs {match.opponent_name}</p>
              <p className="text-sm text-gray-600">
                {format(new Date(match.match_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Global Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-100 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{matchPlayers.length}</p>
              <p className="text-xs text-gray-600">Jogadores</p>
            </div>
            <div className="text-center p-4 bg-gray-100 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{matchEvents.length}</p>
              <p className="text-xs text-gray-600">Eventos</p>
            </div>
            <div className="text-center p-4 bg-green-100 rounded-lg">
              <p className="text-3xl font-bold text-green-700">
                {halfStats.first.goals + halfStats.second.goals}
              </p>
              <p className="text-xs text-gray-600">Gols</p>
            </div>
            <div className="text-center p-4 bg-blue-100 rounded-lg">
              <p className="text-3xl font-bold text-blue-700">
                {halfStats.first.assists + halfStats.second.assists}
              </p>
              <p className="text-xs text-gray-600">Assistências</p>
            </div>
          </div>

          {/* Stats by Half */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Estatísticas por Tempo</h2>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-100 text-center text-sm font-semibold">
                <div className="p-2 border-r border-gray-200">1º TEMPO</div>
                <div className="p-2 border-r border-gray-200 text-gray-600">Estatística</div>
                <div className="p-2">2º TEMPO</div>
              </div>
              <div className="divide-y divide-gray-200">
                <StatRow label="⚽ Gols" first={halfStats.first.goals} second={halfStats.second.goals} />
                <StatRow label="👟 Assistências" first={halfStats.first.assists} second={halfStats.second.assists} />
                <StatRow label="🟨 Amarelos" first={halfStats.first.yellowCards} second={halfStats.second.yellowCards} />
                <StatRow label="🟥 Vermelhos" first={halfStats.first.redCards} second={halfStats.second.redCards} />
                <StatRow label="🎯 Chutes" first={halfStats.first.shots} second={halfStats.second.shots} />
                <StatRow label="🧤 Defesas" first={halfStats.first.saves} second={halfStats.second.saves} />
              </div>
            </div>
          </div>

          {/* Events by Half */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Eventos por Tempo</h2>
            <div className="grid grid-cols-2 gap-4">
              {/* First Half */}
              <div className="border rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2 text-gray-700">1º TEMPO ({eventsByHalf.firstHalf.length})</h3>
                <div className="space-y-1 max-h-[200px] overflow-hidden">
                  {eventsByHalf.firstHalf.slice(0, 12).map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-xs">
                      <span className="bg-gray-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {event.display_minute || `${event.minute}'`}
                      </span>
                      <span className="font-medium">{EVENT_LABELS[event.event_type]}</span>
                      <span className="text-gray-500 truncate">- {getPlayerName(event.player_id)}</span>
                    </div>
                  ))}
                  {eventsByHalf.firstHalf.length > 12 && (
                    <p className="text-xs text-gray-500">+{eventsByHalf.firstHalf.length - 12} eventos...</p>
                  )}
                </div>
              </div>

              {/* Second Half */}
              <div className="border rounded-lg p-3">
                <h3 className="font-semibold text-sm mb-2 text-gray-700">2º TEMPO ({eventsByHalf.secondHalf.length})</h3>
                <div className="space-y-1 max-h-[200px] overflow-hidden">
                  {eventsByHalf.secondHalf.slice(0, 12).map((event) => (
                    <div key={event.id} className="flex items-center gap-2 text-xs">
                      <span className="bg-gray-200 px-1.5 py-0.5 rounded font-mono text-[10px]">
                        {event.display_minute || `${event.minute}'`}
                      </span>
                      <span className="font-medium">{EVENT_LABELS[event.event_type]}</span>
                      <span className="text-gray-500 truncate">- {getPlayerName(event.player_id)}</span>
                    </div>
                  ))}
                  {eventsByHalf.secondHalf.length > 12 && (
                    <p className="text-xs text-gray-500">+{eventsByHalf.secondHalf.length - 12} eventos...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Player Stats */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Estatísticas por Jogador</h2>
            <div className="grid grid-cols-2 gap-2">
              {matchPlayers.slice(0, 16).map((mp) => {
                if (!mp.player) return null;
                const counts = playerEventCounts[mp.player_id] || {};
                const statEntries = Object.entries(counts)
                  .filter(([_, v]) => (v ?? 0) > 0)
                  .slice(0, 5);

                return (
                  <div key={mp.id} className="border rounded p-2 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{mp.player.full_name}</p>
                      <p className="text-[10px] text-gray-500">{mp.player.position}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {statEntries.map(([type, value]) => (
                          <span 
                            key={type} 
                            className="bg-gray-100 text-[9px] px-1 py-0.5 rounded"
                          >
                            {EVENT_LABELS[type as MatchEventType]}: {value}
                          </span>
                        ))}
                        {statEntries.length === 0 && (
                          <span className="text-[9px] text-gray-400">Sem estatísticas</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Gerado por M3 Scouting • {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

interface StatRowProps {
  label: string;
  first: number;
  second: number;
}

function StatRow({ label, first, second }: StatRowProps) {
  if (first === 0 && second === 0) return null;
  
  return (
    <div className="grid grid-cols-3 text-center">
      <div className="p-2 border-r border-gray-200 font-bold">{first}</div>
      <div className="p-2 border-r border-gray-200 text-xs text-gray-600 flex items-center justify-center">{label}</div>
      <div className="p-2 font-bold">{second}</div>
    </div>
  );
}
