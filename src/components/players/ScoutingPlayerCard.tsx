import { Link } from "react-router-dom";
import { ScoreDisplay } from "./ScoreDisplay";

interface ScoutingPlayerCardProps {
  id: string;
  slug: string;
  name: string;
  position: string;
  secondaryPositions?: string[];
  age: number;
  nationality: string;
  currentClub: string;
  imageUrl: string;
  autoRating?: number | null;
  // Additional scouting data
  height?: number | null;
  weight?: number | null;
  dominantFoot?: string | null;
  contractStatus?: string | null;
  contractEnd?: string | null;
  estimatedLevel?: string | null;
  overallRating?: number | null;
  potentialRating?: number | null;
}

const formatContractEnd = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  const month = date.toLocaleDateString("pt-BR", { month: "short" });
  const year = date.getFullYear();
  return `${month} ${year}`;
};

const getContractStatusLabel = (status: string | null | undefined): string => {
  const statusMap: Record<string, string> = {
    contracted: "Contratado",
    free_agent: "Livre",
    loan: "Emprestado",
    youth: "Base",
  };
  return status ? statusMap[status] || status : "—";
};

const getLevelLabel = (level: string | null | undefined): string => {
  const levelMap: Record<string, string> = {
    elite: "Elite",
    top: "Top",
    high: "Alto",
    medium: "Médio",
    developing: "Formação",
  };
  return level ? levelMap[level] || level : "—";
};

export function ScoutingPlayerCard({
  id,
  slug,
  name,
  position,
  secondaryPositions = [],
  age,
  nationality,
  currentClub,
  imageUrl,
  autoRating,
  height,
  weight,
  dominantFoot,
  contractStatus,
  contractEnd,
  estimatedLevel,
  overallRating,
  potentialRating,
}: ScoutingPlayerCardProps) {
  // App routes use id for reliability (slug may not be unique)
  const href = `/app/players/${id}`;

  return (
    <Link to={href} className="group block">
      <article className="relative bg-zinc-950 overflow-hidden border border-zinc-900 hover:border-zinc-800 transition-colors">
        {/* Main Content Grid */}
        <div className="flex">
          {/* Image Column */}
          <div className="relative w-28 sm:w-32 flex-shrink-0">
            <div className="aspect-[3/4] overflow-hidden">
              <img
                src={imageUrl}
                alt={name}
                className="w-full h-full object-cover"
              />
              {/* Subtle gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-zinc-950/20" />
            </div>
          </div>

          {/* Info Column */}
          <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
            {/* Header: Name + Score */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-white text-base font-semibold tracking-tight leading-tight truncate">
                  {name}
                </h3>
                {autoRating !== null && autoRating !== undefined && (
                  <ScoreDisplay score={autoRating} variant="badge" size="sm" />
                )}
              </div>

              {/* Position Row */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                  {position}
                </span>
                {secondaryPositions.slice(0, 2).map((pos) => (
                  <span
                    key={pos}
                    className="text-[9px] uppercase tracking-wide text-zinc-600"
                  >
                    {pos}
                  </span>
                ))}
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {/* Age + Nationality */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600">Idade</span>
                  <span className="text-zinc-300">{age > 0 ? age : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600">País</span>
                  <span className="text-zinc-300 truncate">{nationality || "—"}</span>
                </div>

                {/* Height + Foot */}
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600">Altura</span>
                  <span className="text-zinc-300">{height ? `${height}cm` : "—"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-600">Pé</span>
                  <span className="text-zinc-300 capitalize">{dominantFoot || "—"}</span>
                </div>

                {/* Club + Contract */}
                <div className="flex items-center gap-1.5 col-span-2">
                  <span className="text-zinc-600">Clube</span>
                  <span className="text-zinc-300 truncate">{currentClub || "—"}</span>
                </div>
              </div>
            </div>

            {/* Footer: Contract + Level */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900">
              <div className="flex items-center gap-3">
                {/* Contract Status */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-600">Contrato</span>
                  <span className="text-[11px] text-zinc-400">
                    {getContractStatusLabel(contractStatus)}
                    {contractEnd && ` · ${formatContractEnd(contractEnd)}`}
                  </span>
                </div>
              </div>

              {/* Level Badge */}
              {estimatedLevel && (
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 border border-zinc-800 px-2 py-0.5">
                  {getLevelLabel(estimatedLevel)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Ratings Bar (if available) */}
        {(overallRating || potentialRating) && (
          <div className="px-4 py-2 bg-zinc-900/50 border-t border-zinc-900 flex items-center gap-4">
            {overallRating && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest text-zinc-600">OVR</span>
                <span className="text-xs text-zinc-300 font-medium">{overallRating}</span>
              </div>
            )}
            {potentialRating && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-widest text-zinc-600">POT</span>
                <span className="text-xs text-zinc-300 font-medium">{potentialRating}</span>
              </div>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}
