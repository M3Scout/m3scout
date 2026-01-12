import { useState, useEffect } from "react";
import {
  Clock,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatFixed } from "@/lib/formatters";
import { safeArray } from "@/lib/utils";

interface PublicStatsSectionProps {
  playerId: string;
}

interface SeasonStats {
  season_year: number;
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  tackles: number;
  interceptions: number;
  recoveries: number;
}

const currentYear = new Date().getFullYear();

type TabValue = "current" | "per90" | "career";

export function PublicStatsSection({ playerId }: PublicStatsSectionProps) {
  const [currentSeasonStats, setCurrentSeasonStats] = useState<SeasonStats | null>(null);
  const [careerStats, setCareerStats] = useState<SeasonStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("current");

  useEffect(() => {
    const fetchStats = async () => {
      const { data, error } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", playerId)
        .order("season_year", { ascending: false });

      if (error) {
        console.error("Error fetching stats:", error);
        setLoading(false);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        const statsBySeason = data.reduce((acc, stat) => {
          const year = stat.season_year;
          if (!acc[year]) {
            acc[year] = {
              season_year: year,
              matches: 0,
              minutes: 0,
              goals: 0,
              assists: 0,
              yellow_cards: 0,
              red_cards: 0,
              tackles: 0,
              interceptions: 0,
              recoveries: 0,
            };
          }
          acc[year].matches += stat.matches || 0;
          acc[year].minutes += stat.minutes || 0;
          acc[year].goals += stat.goals || 0;
          acc[year].assists += stat.assists || 0;
          acc[year].yellow_cards += stat.yellow_cards || 0;
          acc[year].red_cards += stat.red_cards || 0;
          acc[year].tackles += stat.tackles || 0;
          acc[year].interceptions += stat.interceptions || 0;
          acc[year].recoveries += stat.recoveries || 0;
          return acc;
        }, {} as Record<number, SeasonStats>);

        const seasons = Object.values(statsBySeason).sort(
          (a, b) => b.season_year - a.season_year
        );

        setCareerStats(seasons);
        
        const current = seasons.find((s) => s.season_year === currentYear);
        if (current) {
          setCurrentSeasonStats(current);
        }
      }

      setLoading(false);
    };

    fetchStats();
  }, [playerId]);

  const calculatePer90 = (value: number, minutes: number): string => {
    if (minutes < 90) return "—";
    return formatFixed((value / minutes) * 90, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
      </div>
    );
  }

  const safeCareerStats = Array.isArray(careerStats) ? careerStats : [];
  if (safeCareerStats.length === 0) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Estatísticas</p>
        <div className="h-px bg-zinc-900 mb-8" />
        <p className="text-center text-zinc-600 text-sm py-12">
          Sem estatísticas disponíveis
        </p>
      </div>
    );
  }

  const tabs: { value: TabValue; label: string; shortLabel: string }[] = [
    { value: "current", label: "Temporada Atual", shortLabel: String(currentYear) },
    { value: "per90", label: "Por 90 min", shortLabel: "P/90" },
    { value: "career", label: "Carreira", shortLabel: "Carreira" },
  ];

  return (
    <div>
      {/* Section Title */}
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Estatísticas</p>
      <div className="h-px bg-zinc-900 mb-8" />

      {/* Minimal Tabs */}
      <div className="flex gap-6 mb-8 border-b border-zinc-900">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`pb-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.value
                ? "text-white"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.shortLabel}</span>
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-px bg-[#e52421]" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "current" && (
        <>
          {currentSeasonStats ? (
            <div className="space-y-8">
              {/* Primary Stats */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 sm:gap-6">
                <StatRow label="Jogos" value={currentSeasonStats.matches} />
                <StatRow label="Minutos" value={currentSeasonStats.minutes} />
                <StatRow label="Gols" value={currentSeasonStats.goals} highlight />
                <StatRow label="Assistências" value={currentSeasonStats.assists} />
                <StatRow 
                  label="G+A" 
                  value={currentSeasonStats.goals + currentSeasonStats.assists} 
                  highlight 
                />
              </div>

              {/* Secondary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 pt-6 border-t border-zinc-900">
                <StatRow label="Desarmes" value={currentSeasonStats.tackles} small />
                <StatRow label="Interceptações" value={currentSeasonStats.interceptions} small />
                <StatRow label="Recuperações" value={currentSeasonStats.recoveries} small />
                <div className="flex gap-6">
                  <StatRow 
                    label="Amarelos" 
                    value={currentSeasonStats.yellow_cards} 
                    variant="warning" 
                    small 
                  />
                  <StatRow 
                    label="Vermelhos" 
                    value={currentSeasonStats.red_cards} 
                    variant="danger" 
                    small 
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState message={`Sem dados para ${currentYear}`} />
          )}
        </>
      )}

      {activeTab === "per90" && (
        <>
          {currentSeasonStats && currentSeasonStats.minutes >= 90 ? (
            <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <StatRow 
                  label="Gols/90" 
                  value={calculatePer90(currentSeasonStats.goals, currentSeasonStats.minutes)} 
                  highlight 
                />
                <StatRow 
                  label="Assist./90" 
                  value={calculatePer90(currentSeasonStats.assists, currentSeasonStats.minutes)} 
                />
                <StatRow 
                  label="G+A/90" 
                  value={calculatePer90(
                    currentSeasonStats.goals + currentSeasonStats.assists,
                    currentSeasonStats.minutes
                  )} 
                  highlight 
                />
                <StatRow 
                  label="Min/Gol" 
                  value={
                    currentSeasonStats.goals > 0
                      ? Math.round(currentSeasonStats.minutes / currentSeasonStats.goals)
                      : "—"
                  } 
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 pt-6 border-t border-zinc-900">
                <StatRow 
                  label="Desarmes/90" 
                  value={calculatePer90(currentSeasonStats.tackles, currentSeasonStats.minutes)} 
                  small 
                />
                <StatRow 
                  label="Intercep./90" 
                  value={calculatePer90(currentSeasonStats.interceptions, currentSeasonStats.minutes)} 
                  small 
                />
                <StatRow 
                  label="Recup./90" 
                  value={calculatePer90(currentSeasonStats.recoveries, currentSeasonStats.minutes)} 
                  small 
                />
              </div>
            </div>
          ) : (
            <EmptyState message="Mínimo de 90 minutos necessário" />
          )}
        </>
      )}

      {activeTab === "career" && (
        <div className="space-y-8">
          {/* Career Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-900">
                  <th className="text-left text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                    Temporada
                  </th>
                  <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                    J
                  </th>
                  <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                    Min
                  </th>
                  <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                    G
                  </th>
                  <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                    A
                  </th>
                  <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium">
                    G+A
                  </th>
                  <th className="text-center text-[10px] uppercase tracking-widest text-zinc-600 pb-3 font-medium hidden sm:table-cell">
                    Cartões
                  </th>
                </tr>
              </thead>
              <tbody>
                {safeArray(careerStats).map((season) => (
                  <tr key={season.season_year} className="border-b border-zinc-900/50">
                    <td className="py-3 text-white text-sm font-medium">
                      {season.season_year}
                      {season.season_year === currentYear && (
                        <span className="ml-2 text-[9px] uppercase tracking-widest text-zinc-500 border border-zinc-800 px-1.5 py-0.5">
                          Atual
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-center text-zinc-400 text-sm">{season.matches}</td>
                    <td className="py-3 text-center text-zinc-400 text-sm">{season.minutes}</td>
                    <td className="py-3 text-center text-white text-sm font-medium">{season.goals}</td>
                    <td className="py-3 text-center text-zinc-400 text-sm">{season.assists}</td>
                    <td className="py-3 text-center text-white text-sm font-medium">
                      {season.goals + season.assists}
                    </td>
                    <td className="py-3 text-center text-sm hidden sm:table-cell">
                      <span className="text-amber-500">{season.yellow_cards}</span>
                      <span className="text-zinc-700 mx-1">/</span>
                      <span className="text-red-500">{season.red_cards}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Career Totals */}
          <div className="pt-6 border-t border-zinc-900">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-4">Totais</p>
            <div className="grid grid-cols-4 gap-4 sm:gap-6">
              <StatRow 
                label="Jogos" 
                value={careerStats.reduce((sum, s) => sum + s.matches, 0)} 
                small 
              />
              <StatRow 
                label="Gols" 
                value={careerStats.reduce((sum, s) => sum + s.goals, 0)} 
                highlight 
                small 
              />
              <StatRow 
                label="Assist." 
                value={careerStats.reduce((sum, s) => sum + s.assists, 0)} 
                small 
              />
              <StatRow 
                label="G+A" 
                value={careerStats.reduce((sum, s) => sum + s.goals + s.assists, 0)} 
                highlight 
                small 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== MINIMAL STAT ROW ========== */
interface StatRowProps {
  label: string;
  value: number | string;
  highlight?: boolean;
  variant?: "default" | "warning" | "danger";
  small?: boolean;
}

function StatRow({ label, value, highlight, variant, small }: StatRowProps) {
  const valueClass =
    variant === "warning"
      ? "text-amber-500"
      : variant === "danger"
      ? "text-red-500"
      : highlight
      ? "text-white"
      : "text-zinc-300";

  return (
    <div>
      <p className={`font-semibold tabular-nums ${small ? "text-lg" : "text-2xl"} ${valueClass}`}>
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-zinc-600 mt-1">{label}</p>
    </div>
  );
}

/* ========== EMPTY STATE ========== */
function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-center text-zinc-600 text-sm py-12">
      {message}
    </p>
  );
}
