import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AthleteKPICardsProps {
  matches: number;
  minutes: number;
  goals: number;
  assists: number;
  averageRating: number | null;
  athleteId: string;
}

interface CounterProps {
  index: number;
  label: string;
  value: number | string;
  highlight?: boolean;
  wide?: boolean;
  href?: string;
}

function Counter({ index, label, value, highlight = false, wide = false, href }: CounterProps) {
  const inner = (
    <div
      className={cn(
        "counter relative rounded-xl border transition-colors duration-[250ms] hover:bg-zinc-800/50",
        "py-[22px] px-[20px] md:py-[28px] md:px-[24px]",
        wide && "col-span-2 lg:col-span-1",
      )}
      style={
        highlight
          ? {
              background: "linear-gradient(165deg, rgba(236,69,37,0.14), rgba(20,19,24,1) 70%)",
              borderColor: "rgba(236,69,37,0.25)",
            }
          : { background: "#141318", borderColor: "rgba(255,255,255,0.08)" }
      }
    >
      {/* index — top-right */}
      <span className="absolute top-[14px] right-[16px] font-mono text-[11px] text-zinc-500">
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* main number */}
      <div
        className={cn(
          "font-display font-semibold leading-[0.9] tracking-[-0.03em] tabular-nums",
          highlight ? "text-[#ec4525]" : "text-[#ededee]",
        )}
        style={{ fontSize: "clamp(32px,4vw,52px)" }}
      >
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </div>

      {/* label */}
      <div className="font-editorial-mono text-[10px] tracking-[0.16em] uppercase text-zinc-500 mt-[12px]">
        {label}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function AthleteKPICards({
  matches,
  minutes,
  goals,
  assists,
  athleteId,
}: AthleteKPICardsProps) {
  const base = `/dashboard/atletas/${athleteId}?tab=stats`;

  const minutesDisplay =
    minutes >= 1000 ? minutes.toLocaleString("pt-BR") : String(minutes);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 w-full">
      <Counter index={0} label="Jogos"   value={matches}                        href={base} />
      <Counter index={1} label="Minutos" value={minutesDisplay}                 href={base} />
      <Counter index={2} label="G+A"     value={goals + assists} highlight wide href={base} />
      <Counter index={3} label="Gols"    value={goals}           highlight      href={base} />
      <Counter index={4} label="Assist." value={assists}                        href={base} />
    </div>
  );
}
