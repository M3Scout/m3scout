import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AdminSkeletonDashboard } from "@/components/admin/AdminSkeleton";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { KPICards } from "@/components/dashboard/KPICards";
import { TopPlayersCard } from "@/components/dashboard/TopPlayersCard";
import { RecentReportsCard } from "@/components/dashboard/RecentReportsCard";
import { RecentLeadsCard } from "@/components/dashboard/RecentLeadsCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { PositionChartCard } from "@/components/dashboard/PositionChartCard";
import { InsightsCard } from "@/components/dashboard/InsightsCard";
import CompetitionUsageWidget from "@/components/competitions/CompetitionUsageWidget";
import { motion, Variants } from "framer-motion";

// Stagger animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
    },
  },
};

interface DashboardStats {
  totalPlayers: number;
  totalReports: number;
  reportsThisMonth: number;
  totalLeads: number;
  expiringContracts: number;
}

interface PositionData {
  name: string;
  value: number;
}

interface RecentReport {
  id: string;
  player_name: string;
  competition_name: string;
  match_date: string;
  scout_name: string;
  rating: number;
  final_score: number;
}

interface RecentLead {
  id: string;
  name: string;
  subject: string;
  created_at: string;
  status: string;
}

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    totalReports: 0,
    reportsThisMonth: 0,
    totalLeads: 0,
    expiringContracts: 0,
  });
  const [positionData, setPositionData] = useState<PositionData[]>([]);
  const [recentReports, setRecentReports] = useState<RecentReport[]>([]);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [
          playersResult,
          reportsResult,
          leadsResult,
          contractsResult,
          positionsResult,
          recentReportsResult,
          recentLeadsResult,
        ] = await Promise.all([
          supabase.from("players").select("id", { count: "exact", head: true }).or("is_archived.is.null,is_archived.eq.false"),
          supabase.from("scouting_reports").select("id", { count: "exact", head: true }),
          supabase.from("leads").select("id", { count: "exact", head: true }),
          supabase
            .from("players")
            .select("id", { count: "exact", head: true })
            .gte("contract_end", new Date().toISOString().split("T")[0])
            .lte("contract_end", new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]),
          supabase.from("players").select("position").or("is_archived.is.null,is_archived.eq.false"),
          supabase
            .from("scouting_reports")
            .select(`
              id,
              match_date,
              rating,
              final_score,
              created_at,
              scout_id,
              players (full_name),
              competitions (name)
            `)
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("leads")
            .select("id, name, subject, created_at, status")
            .order("created_at", { ascending: false })
            .limit(5),
        ]);

        const firstDayOfMonth = new Date();
        firstDayOfMonth.setDate(1);
        firstDayOfMonth.setHours(0, 0, 0, 0);
        
        const { count: reportsThisMonth } = await supabase
          .from("scouting_reports")
          .select("id", { count: "exact", head: true })
          .gte("created_at", firstDayOfMonth.toISOString());

        setStats({
          totalPlayers: playersResult.count || 0,
          totalReports: reportsResult.count || 0,
          reportsThisMonth: reportsThisMonth || 0,
          totalLeads: leadsResult.count || 0,
          expiringContracts: contractsResult.count || 0,
        });

        if (positionsResult.data) {
          const positionCounts: Record<string, number> = {};
          positionsResult.data.forEach((p) => {
            const pos = p.position || "N/D";
            positionCounts[pos] = (positionCounts[pos] || 0) + 1;
          });
          
          const sortedPositions = Object.entries(positionCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);
          
          setPositionData(sortedPositions);
        }

        if (recentReportsResult.data) {
          const scoutIds = [
            ...new Set(
              recentReportsResult.data
                .map((r: any) => r.scout_id)
                .filter(Boolean)
            ),
          ];

          let scoutNames: Record<string, string> = {};
          if (scoutIds.length) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name")
              .in("user_id", scoutIds);

            if (profiles) {
              profiles.forEach((p) => {
                scoutNames[p.user_id] = p.full_name || "Scout";
              });
            }
          }

          const reports = recentReportsResult.data.map((r: any) => ({
            id: r.id,
            player_name: r.players?.full_name || "Atleta desconhecido",
            competition_name: r.competitions?.name || "—",
            match_date: r.match_date,
            scout_name: scoutNames[r.scout_id] || "—",
            rating: r.rating,
            final_score: r.final_score,
          }));

          setRecentReports(reports);
        }

        if (recentLeadsResult.data) {
          setRecentLeads(recentLeadsResult.data);
        }

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <AdminSkeletonDashboard />;
  }

  return (
    <motion.div 
      className="space-y-6 pb-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Section */}
      <motion.div variants={itemVariants}>
        <DashboardHero />
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants}>
        <KPICards 
          totalPlayers={stats.totalPlayers}
          reportsThisMonth={stats.reportsThisMonth}
          totalLeads={stats.totalLeads}
          expiringContracts={stats.expiringContracts}
        />
      </motion.div>

      {/* Insights + Top Players Grid - Shared container with equal heights */}
      <motion.div 
        variants={itemVariants} 
        className="grid lg:grid-cols-3 gap-6 items-stretch"
      >
        {/* Insights - New strategic section */}
        <div className="lg:col-span-1 flex">
          <InsightsCard />
        </div>

        {/* Top Players */}
        <div className="lg:col-span-2 flex">
          <TopPlayersCard />
        </div>
      </motion.div>

      {/* Position Chart + Reports Grid - Shared container with equal heights */}
      <motion.div 
        variants={itemVariants} 
        className="grid lg:grid-cols-3 gap-6 items-stretch"
      >
        {/* Position Chart */}
        <div className="lg:col-span-1 flex">
          <PositionChartCard data={positionData} />
        </div>

        {/* Recent Reports */}
        <div className="lg:col-span-2 flex">
          <RecentReportsCard reports={recentReports} />
        </div>
      </motion.div>

      {/* Leads + Quick Actions Grid */}
      <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <RecentLeadsCard leads={recentLeads} />

        {/* Quick Actions */}
        <QuickActionsCard />
      </motion.div>

      {/* Competition Usage - Admin Only */}
      {isAdmin && (
        <motion.div variants={itemVariants}>
          <div className="rounded-xl border border-zinc-800/50 bg-gradient-to-br from-zinc-900 to-zinc-950 overflow-hidden">
            <CompetitionUsageWidget />
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;
