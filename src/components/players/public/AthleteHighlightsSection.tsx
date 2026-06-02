interface AthleteHighlightsSectionProps {
  strengths: string[] | null;
}

export function AthleteHighlightsSection({ strengths }: AthleteHighlightsSectionProps) {
  if (!Array.isArray(strengths) || strengths.length === 0) return null;

  return (
    <section className="py-24 relative" id="tecnico">

      {/* .sec-head */}
      <div className="flex items-end justify-between gap-6 mb-11 flex-wrap">
        <div>
          <div className="font-editorial-mono text-[11px] tracking-[0.24em] uppercase text-[#62616a] font-medium inline-flex gap-[10px] items-center">
            <span className="text-[#ec4525] font-semibold">02</span>
            <span className="w-[34px] h-px bg-white/15 flex-none" />
            Perfil Técnico
          </div>
          <h2
            className="font-display font-semibold leading-[1.02] tracking-[-0.025em] mt-[14px] text-[#ededee]"
            style={{ fontSize: "clamp(28px,3.4vw,44px)" }}
          >
            Pontos fortes
          </h2>
        </div>
        <p className="font-editorial-mono text-[12px] text-[#62616a] tracking-[0.04em] max-w-[280px] text-right">
          Características que definem a identidade técnica do atleta.
        </p>
      </div>

      {/* .forcas — vertical list, border separators, hover indent */}
      <div className="forcas flex flex-col">
        {strengths.map((strength, i) => (
          <div
            key={strength}
            className="forca group flex items-center gap-[20px] py-[22px] border-b border-white/[0.075] first:border-t first:border-white/[0.075] cursor-default pl-0 hover:pl-[14px] transition-all duration-[250ms]"
          >
            {/* .fn — mono index */}
            <span className="fn font-editorial-mono text-[13px] font-semibold text-[#62616a] w-[24px] flex-none group-hover:text-[#ec4525] transition-colors duration-200">
              {String(i + 1).padStart(2, "0")}
            </span>

            {/* .ft — strength title */}
            <div className="ft flex-1 min-w-0">
              <h3 className="font-display text-[22px] font-semibold tracking-[-0.01em] text-[#ededee] group-hover:text-[#ec4525] transition-colors duration-200 leading-tight">
                {strength}
              </h3>
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
