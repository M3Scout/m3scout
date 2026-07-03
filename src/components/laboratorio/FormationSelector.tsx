import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TacticalFormation } from "./types";

interface FormationSelectorProps {
  formations: TacticalFormation[];
  selectedFormation: TacticalFormation;
  onSelect: (key: string) => void;
}

export function FormationSelector({ formations, selectedFormation, onSelect }: FormationSelectorProps) {
  return (
    <div
      className="rounded-[8px] p-5 md:p-6"
      style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}
    >
      <div className="font-tactical-mono text-[11px] tracking-[0.18em] uppercase mb-4" style={{ color: "#62616a" }}>
        Esquema tático base
      </div>

      <Select value={selectedFormation.key} onValueChange={onSelect}>
        <SelectTrigger
          className="h-12 rounded-[8px] font-archivo font-semibold text-[19px] px-4"
          style={{ background: "#0c0b0d", border: "1px solid rgba(255,255,255,0.1)", color: "#ededee" }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="font-archivo"
          style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.1)", color: "#ededee" }}
        >
          {formations.map((f) => (
            <SelectItem
              key={f.key}
              value={f.key}
              className="font-medium focus:bg-white/5"
            >
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col gap-4 mt-5">
        <div>
          <div className="font-tactical-mono text-[10px] tracking-[0.16em] uppercase mb-1.5" style={{ color: "#62616a" }}>
            Como funciona
          </div>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "#c8c7cc" }}>
            {selectedFormation.description.howItWorks}
          </p>
        </div>

        <div className="pl-3.5" style={{ borderLeft: "2px solid #3fcf6e" }}>
          <div className="font-tactical-mono text-[10px] tracking-[0.14em] uppercase mb-1" style={{ color: "#3fcf6e" }}>
            Vantagens
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#9c9ba3" }}>
            {selectedFormation.description.pros}
          </p>
        </div>

        <div className="pl-3.5" style={{ borderLeft: "2px solid #ec4525" }}>
          <div className="font-tactical-mono text-[10px] tracking-[0.14em] uppercase mb-1" style={{ color: "#ec4525" }}>
            Desvantagens
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#9c9ba3" }}>
            {selectedFormation.description.cons}
          </p>
        </div>
      </div>
    </div>
  );
}
