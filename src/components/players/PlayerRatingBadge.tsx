import { Badge } from "@/components/ui/badge";
import { Star, AlertCircle, TrendingUp, CheckCircle2 } from "lucide-react";
import { SafeRatingBreakdownModalV2 } from "./SafeRatingBreakdownModalV2";
import { RatingBreakdownV2, getReliabilityLabelV2, getReliabilityVariantV2 } from "@/lib/playerRatingV2";
import { formatRating } from "@/lib/formatters";

interface PlayerRatingBadgeProps {
  rating: number | null | undefined;
  ratingDetails?: RatingBreakdownV2 | null;
  showReliability?: boolean;
  size?: "sm" | "md" | "lg";
  clickable?: boolean;
  playerId?: string;
  isAdmin?: boolean;
  onRecalculated?: () => void;
}

export function PlayerRatingBadge({
  rating,
  ratingDetails,
  showReliability = true,
  size = "md",
  clickable = true,
  playerId,
  isAdmin,
  onRecalculated,
}: PlayerRatingBadgeProps) {
  // Safe guard: if rating is not a valid number, don't render
  const safeRating = Number(rating);
  if (!Number.isFinite(safeRating)) {
    return <span className="text-muted-foreground text-sm">—</span>;
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-1.5",
  };

  const starSize = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const getRatingColor = (rating: number): string => {
    if (rating >= 4.0) return "bg-emerald-500/20 text-emerald-600 border-emerald-500/30";
    if (rating >= 3.0) return "bg-blue-500/20 text-blue-600 border-blue-500/30";
    if (rating >= 2.0) return "bg-amber-500/20 text-amber-600 border-amber-500/30";
    return "bg-red-500/20 text-red-600 border-red-500/30";
  };

  const reliability = ratingDetails?.reliability;
  const reliabilityIcon = reliability ? {
    low: <AlertCircle className="w-3 h-3" />,
    medium: <TrendingUp className="w-3 h-3" />,
    high: <CheckCircle2 className="w-3 h-3" />,
  }[reliability] : null;

  const badgeContent = (
    <div className={`flex items-center gap-2 ${clickable && ratingDetails ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}`}>
      <Badge
        variant="outline"
        className={`${sizeClasses[size]} ${getRatingColor(safeRating)} font-semibold`}
      >
        <Star className={`${starSize[size]} mr-1 fill-current`} />
        {formatRating(safeRating)}/5
      </Badge>
      {showReliability && reliability && (
        <Badge variant={getReliabilityVariantV2(reliability)} className="text-xs">
          {reliabilityIcon}
          <span className="ml-1">{getReliabilityLabelV2(reliability)}</span>
        </Badge>
      )}
    </div>
  );

  // If we have rating details, playerId, and it's clickable, wrap in modal
  if (clickable && ratingDetails && playerId) {
    return (
      <SafeRatingBreakdownModalV2
        details={ratingDetails}
        rating={safeRating}
        playerId={playerId}
        isAdmin={isAdmin}
        onRecalculated={onRecalculated}
        trigger={badgeContent}
      />
    );
  }

  return badgeContent;
}
