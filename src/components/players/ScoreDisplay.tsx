import { formatFixed } from "@/lib/formatters";

interface ScoreDisplayProps {
  score: number;
  maxScore?: number;
  variant?: "badge" | "bar";
  size?: "sm" | "md" | "lg";
}

/**
 * Editorial score display component
 * - Badge variant: solid red background with white number
 * - Bar variant: horizontal micro-bar with proportional fill
 */
export function ScoreDisplay({ 
  score, 
  maxScore = 5, 
  variant = "badge",
  size = "md" 
}: ScoreDisplayProps) {
  const percentage = (score / maxScore) * 100;
  
  const sizeClasses = {
    sm: {
      badge: "px-2 py-1 text-xs",
      bar: "h-[3px] w-12",
      text: "text-xs",
    },
    md: {
      badge: "px-3 py-1.5 text-sm",
      bar: "h-1 w-16",
      text: "text-sm",
    },
    lg: {
      badge: "px-4 py-2 text-base",
      bar: "h-1 w-20",
      text: "text-base",
    },
  };

  if (variant === "bar") {
    return (
      <div className="flex items-center gap-2">
        {/* Score Value */}
        <span 
          className={`font-semibold tabular-nums ${sizeClasses[size].text} text-white`}
        >
          {formatFixed(score, 1)}
        </span>
        
        {/* Micro Bar */}
        <div className="flex flex-col gap-1">
          <div className={`${sizeClasses[size].bar} bg-zinc-800 relative overflow-hidden`}>
            <div 
              className="absolute inset-y-0 left-0 bg-[#e52421]"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Badge variant (default) - solid red background, white text
  return (
    <div 
      className={`${sizeClasses[size].badge} bg-[#e52421] inline-flex items-center justify-center`}
    >
      <span className="font-semibold tabular-nums text-white">
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
  const percentage = (score / maxScore) * 100;
  
  return (
    <div className="flex items-center gap-3">
      {/* Score Badge */}
      <div className="px-3 py-1.5 bg-[#e52421] inline-flex items-center justify-center">
        <span className="text-sm font-semibold tabular-nums text-white">
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
            className="h-full bg-[#e52421]"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
