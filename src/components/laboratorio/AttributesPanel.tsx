interface AttributesPanelProps {
  attributes: string[];
  values: Record<string, number>;
  references: string[];
  accent: string;
}

// Same hand-drawn SVG radar geometry used site-wide (see AtributoRadar.tsx on the
// player profile), generalized to an arbitrary number of axes.
const VIEW_W = 300;
const VIEW_H = 300;
const CX = 150;
const CY = 150;
const R = 96;
const LABEL_R = 130;
const GRID = "rgba(255,255,255,0.09)";

const toRad = (deg: number) => (deg * Math.PI) / 180;

function polarPoint(r: number, angleDeg: number) {
  return { x: CX + r * Math.cos(toRad(angleDeg)), y: CY + r * Math.sin(toRad(angleDeg)) };
}

export function AttributesPanel({ attributes, values, references, accent }: AttributesPanelProps) {
  const n = attributes.length;
  const angleFor = (i: number) => -90 + i * (360 / n);

  const gridPath = (f: number) =>
    attributes
      .map((_, i) => {
        const { x, y } = polarPoint(R * f, angleFor(i));
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  const polygonPath =
    attributes
      .map((label, i) => {
        const value = values[label] ?? 0;
        const { x, y } = polarPoint((value / 100) * R, angleFor(i));
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z";

  return (
    <div
      className="rounded-[8px] px-6 py-6 md:px-[26px]"
      style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}
    >
      <div className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase mb-4" style={{ color: "#62616a" }}>
        Atributos-chave
      </div>

      <div className="relative w-full mb-5" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="w-full h-full">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <path key={f} d={gridPath(f)} fill="none" stroke={GRID} strokeWidth={1} />
          ))}
          {attributes.map((label, i) => {
            const outer = polarPoint(R, angleFor(i));
            return (
              <line key={label} x1={CX} y1={CY} x2={outer.x.toFixed(2)} y2={outer.y.toFixed(2)} stroke={GRID} strokeWidth={1} />
            );
          })}
          <path d={polygonPath} fill={`${accent}30`} stroke={accent} strokeWidth={1.5} strokeLinejoin="round" />
          {attributes.map((label, i) => {
            const value = values[label] ?? 0;
            const { x, y } = polarPoint((value / 100) * R, angleFor(i));
            return <circle key={label} cx={x} cy={y} r={2.5} fill={accent} />;
          })}
        </svg>

        {attributes.map((label, i) => {
          const { x, y } = polarPoint(LABEL_R, angleFor(i));
          const left = (x / VIEW_W) * 100;
          const top = (y / VIEW_H) * 100;
          const value = Math.round(values[label] ?? 0);
          return (
            <div
              key={label}
              className="absolute flex flex-col items-center gap-1"
              style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -50%)", width: 84 }}
            >
              <span
                className="font-tactical-mono text-[9px] font-semibold tracking-wider uppercase leading-tight text-center"
                style={{ color: "#8a8992" }}
              >
                {label}
              </span>
              <span
                className="rounded px-[5px] py-[1px] text-[10px] font-bold text-white leading-none"
                style={{ background: accent, minWidth: 22, textAlign: "center" }}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-[13px]">
        {attributes.map((label) => {
          const value = values[label] ?? 0;
          return (
            <div key={label}>
              <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-[13.5px]" style={{ color: "#9c9ba3" }}>
                  {label}
                </span>
                <span className="font-tactical-mono text-[13px]" style={{ color: "#ededee" }}>
                  {value}
                </span>
              </div>
              <span className="block h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <span
                  className="block h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${value}%`, background: accent }}
                />
              </span>
            </div>
          );
        })}
      </div>

      <div className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase mt-6 mb-[13px]" style={{ color: "#62616a" }}>
        Inspirações no mundo real
      </div>
      <div className="flex flex-wrap gap-[9px]">
        {references.map((name) => (
          <span
            key={name}
            className="px-[13px] py-[7px] rounded-[8px] text-[13.5px] font-medium"
            style={{ color: "#c8c7cc", background: "#0c0b0d", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
