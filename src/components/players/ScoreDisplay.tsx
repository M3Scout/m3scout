import { formatFixed } from "@/lib/formatters";

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  variant?: "circle" | "bar";
  size?: "sm" | "md" | "lg";
}

/**
 * Editorial score display component
 * - Circle variant: thin outline with number inside
 * - Bar variant: horizontal micro-bar with proportional fill
 */
export function ScoreDisplay({ 
  score, 
  maxScore = 5, 
  variant = "circle",
  size = "md" 
}: ScoreDisplayProps) {
  const percentage = (score / maxScore) * 100;
  const isHighScore = score >= maxScore * 0.8; // 80%+ is considered high
  
  const sizeClasses = {
    sm: {
      circle: "w-10 h-10 text-xs",
      bar: "h-[3px] w-12",
      text: "text-xs",
    },
    md: {
      circle: "w-12 h-12 text-sm",
      bar: "h-1 w-16",
      text: "text-sm",
    },
    lg: {
      circle: "w-14 h-14 text-base",
      bar: "h-1 w-20",
      text: "text-base",
    },
  };

  if (variant === "bar") {
    return (
      <div className="flex items-center gap-2">
        {/* Score Value */}
        <span 
          className={`font-medium tabular-nums ${sizeClasses[size].text} ${
            isHighScore ? "text-[#e52421]" : "text-white"
          }`}
        >
          {formatFixed(score, 1)}
        </span>
        
        {/* Micro Bar */}
        <div className="flex flex-col gap-1">
          <div className={`${sizeClasses[size].bar} bg-zinc-800 relative overflow-hidden`}>
            <div 
              className={`absolute inset-y-0 left-0 ${
                isHighScore ? "bg-[#e52421]" : "bg-zinc-400"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Circle variant (default)
  return (
    <div 
      className={`${sizeClasses[size].circle} flex items-center justify-center border ${
        isHighScore 
          ? "border-[#e52421] text-[#e52421]" 
          : "border-zinc-600 text-white"
      }`}
    >
      <span className="font-medium tabular-nums">
        {formatFixed(score, 1)}
      </span>
    </div>
  );
}

/**
 * Editorial score with label - for detailed views
 */
interface LabeledScoreProps {
  score: number;
  maxScore?: number;
  label?: string;
}

export function LabeledScore({ 
  score, 
  maxScore = 5, 
  label = "Avaliação" 
}: LabeledScoreProps) {
  const isHighScore = score >= maxScore * 0.8;
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="flex items-center gap-3">
      {/* Score Circle */}
      <div 
        className={`w-11 h-11 flex items-center justify-center border ${
          isHighScore 
            ? "border-[#e52421] text-[#e52421]" 
            : "border-zinc-600 text-white"
        }`}
      >
        <span className="text-sm font-medium tabular-nums">
          {formatFixed(score, 1)}
        </span>
      </div>
      
      {/* Label & Bar */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1">
          {label}
        </p>
        <div className="h-[2px] bg-zinc-800 w-full max-w-[80px]">
          <div 
            className={`h-full ${isHighScore ? "bg-[#e52421]" : "bg-zinc-500"}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
