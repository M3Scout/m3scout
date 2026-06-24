import { useAuth } from "@/hooks/authContext";
import GoalsMonitor from "./GoalsMonitor";

export default function MyGoalsPage() {
  const { linkedPlayerId } = useAuth();
  return <GoalsMonitor playerIdFilter={linkedPlayerId ?? undefined} />;
}
