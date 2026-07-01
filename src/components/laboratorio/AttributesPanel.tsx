import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

interface AttributesPanelProps {
  attributes: string[];
  values: Record<string, number>;
  references: string[];
  accent: string;
}

export function AttributesPanel({ attributes, values, references, accent }: AttributesPanelProps) {
  const radarData = attributes.map((attr) => ({ attribute: attr, value: values[attr] ?? 0 }));

  return (
    <div
      className="rounded-[18px] px-6 py-6 md:px-[26px]"
      style={{ background: "#0f1311", border: "1px solid #1c2120" }}
    >
      <div className="font-tactical-mono text-[11px] tracking-[0.16em] mb-4" style={{ color: "#6f7a73" }}>
        ATRIBUTOS-CHAVE
      </div>

      <div className="rounded-xl overflow-hidden mb-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #1a1f1d" }}>
        <ResponsiveContainer width="100%" height={180}>
          <RadarChart data={radarData} margin={{ top: 8, right: 20, bottom: 8, left: 20 }}>
            <PolarGrid stroke="rgba(255,255,255,0.07)" />
            <PolarAngleAxis dataKey="attribute" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "'JetBrains Mono', monospace" }} />
            <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.15} strokeWidth={2} dot={{ fill: accent, r: 2.5 }} animationDuration={400} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-[13px]">
        {attributes.map((label) => {
          const value = values[label] ?? 0;
          return (
            <div key={label}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[13.5px]" style={{ color: "#b3bbb4" }}>
                  {label}
                </span>
                <span className="font-tactical-mono text-[13px]" style={{ color: "#eef1ed" }}>
                  {value}
                </span>
              </div>
              <span className="block h-1.5 rounded-[5px] overflow-hidden" style={{ background: "#1a201d" }}>
                <span
                  className="block h-full rounded-[5px] transition-[width] duration-500"
                  style={{ width: `${value}%`, background: accent }}
                />
              </span>
            </div>
          );
        })}
      </div>

      <div className="font-tactical-mono text-[11px] tracking-[0.16em] mt-6 mb-[13px]" style={{ color: "#6f7a73" }}>
        INSPIRAÇÕES NO MUNDO REAL
      </div>
      <div className="flex flex-wrap gap-[9px]">
        {references.map((name) => (
          <span
            key={name}
            className="px-[13px] py-[7px] rounded-[9px] text-[13.5px] font-semibold"
            style={{ color: "#dfe3df", background: `${accent}14`, border: `1px solid ${accent}33` }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
