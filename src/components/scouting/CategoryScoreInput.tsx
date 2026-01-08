import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { getScoreColor } from "@/lib/scoring";

interface CategoryScoreInputProps {
  category: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  value: number;
  onChange: (value: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  weight: number;
}

export function CategoryScoreInput({
  category,
  label,
  description,
  icon,
  value,
  onChange,
  notes,
  onNotesChange,
  weight,
}: CategoryScoreInputProps) {
  return (
    <div className="glass-card p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          <div>
            <Label className="text-base font-semibold">{label}</Label>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={cn("text-2xl font-bold", getScoreColor(value))}>
            {value}
          </span>
          <p className="text-xs text-muted-foreground">Peso: {weight * 100}%</p>
        </div>
      </div>

      <div className="space-y-2">
        <Slider
          value={[value]}
          onValueChange={([v]) => onChange(v)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      <Textarea
        placeholder={`Observações sobre ${label.toLowerCase()}...`}
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        className="input-dark min-h-[80px] text-sm"
      />
    </div>
  );
}
