import { Layers, ThumbsUp, ThumbsDown } from "lucide-react";
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
      className="rounded-[18px] p-5 md:p-6"
      style={{ background: "#0f1311", border: "1px solid #1c2120" }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <Layers className="w-4 h-4" style={{ color: "#3fcf6e" }} strokeWidth={2} />
        <span className="font-tactical-mono text-[11px] tracking-[0.18em]" style={{ color: "#6f7a73" }}>
          ESQUEMA TÁTICO BASE
        </span>
      </div>

      <Select value={selectedFormation.key} onValueChange={onSelect}>
        <SelectTrigger
          className="h-12 rounded-xl font-archivo font-bold text-[20px] px-4"
          style={{ background: "#0c0f0d", border: "1px solid #243a2f", color: "#f3f5f2" }}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="font-archivo"
          style={{ background: "#0f1311", border: "1px solid #1c2120", color: "#e9ece9" }}
        >
          {formations.map((f) => (
            <SelectItem
              key={f.key}
              value={f.key}
              className="font-semibold focus:bg-white/5"
            >
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col gap-3.5 mt-5">
        <div>
          <div className="font-tactical-mono text-[10px] tracking-[0.16em] mb-1.5" style={{ color: "#6f7a73" }}>
            COMO FUNCIONA
          </div>
          <p className="text-[13.5px] leading-relaxed" style={{ color: "#dadfda" }}>
            {selectedFormation.description.howItWorks}
          </p>
        </div>

        <div className="rounded-xl px-3.5 py-3" style={{ background: "#10281a", border: "1px solid #1d3d2a" }}>
          <div className="flex items-center gap-2 mb-1">
            <ThumbsUp className="w-3.5 h-3.5 shrink-0" style={{ color: "#3fcf6e" }} strokeWidth={2} />
            <span className="font-tactical-mono text-[10px] tracking-[0.14em]" style={{ color: "#3fcf6e" }}>
              VANTAGENS
            </span>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#c7ded0" }}>
            {selectedFormation.description.pros}
          </p>
        </div>

        <div className="rounded-xl px-3.5 py-3" style={{ background: "#2a1414", border: "1px solid #422020" }}>
          <div className="flex items-center gap-2 mb-1">
            <ThumbsDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#ff5a5f" }} strokeWidth={2} />
            <span className="font-tactical-mono text-[10px] tracking-[0.14em]" style={{ color: "#ff5a5f" }}>
              DESVANTAGENS
            </span>
          </div>
          <p className="text-[13px] leading-relaxed" style={{ color: "#e0c2c3" }}>
            {selectedFormation.description.cons}
          </p>
        </div>
      </div>
    </div>
  );
}
