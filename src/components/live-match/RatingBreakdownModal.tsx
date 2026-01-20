/**
 * Modal to display detailed rating breakdown for a player
 * Shows how the rating was calculated with all contributing factors
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MatchRatingResult, CategoryBreakdown, BreakdownItem } from "@/lib/matchRatingEngine";
import { getRatingBgColor, getRatingColor } from "@/lib/matchRatingEngine";

interface RatingBreakdownModalProps {
  rating: MatchRatingResult;
  playerName: string;
  children: React.ReactNode;
}

function formatDelta(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

function DeltaIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
  if (value < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
  return <Minus className="h-3 w-3 text-muted-foreground" />;
}

function BreakdownItemRow({ item }: { item: BreakdownItem }) {
  if (item.count === 0) return null;
  
  return (
    <div className="flex items-center justify-between py-1.5 text-xs border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2">
        <DeltaIcon value={item.rawDelta} />
        <span className="text-muted-foreground">{item.label}</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
          {item.count}× ({item.weight > 0 ? "+" : ""}{item.weight})
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-right">
        <span className={cn(
          "font-mono text-[11px]",
          item.rawDelta > 0 ? "text-green-500" : item.rawDelta < 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {formatDelta(item.rawDelta)}
        </span>
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: CategoryBreakdown }) {
  const hasItems = category.items.length > 0;
  const isPositive = category.raw > 0;
  const isNegative = category.raw < 0;
  
  return (
    <AccordionItem value={category.key} className="border-b border-border/50">
      <AccordionTrigger className="py-2 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{category.label}</span>
            {hasItems && (
              <Badge variant="secondary" className="text-[10px] h-4">
                {category.items.length}
              </Badge>
            )}
          </div>
          <span className={cn(
            "font-mono text-sm font-semibold",
            isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
          )}>
            {formatDelta(category.raw)}
          </span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-2">
        {hasItems ? (
          <div className="pl-2 space-y-0">
            {category.items.map((item, idx) => (
              <BreakdownItemRow key={idx} item={item} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pl-2">Nenhum evento nesta categoria</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function RatingBreakdownModal({ rating, playerName, children }: RatingBreakdownModalProps) {
  if (!rating.hasRating || !rating.detailedBreakdown) {
    return <>{children}</>;
  }
  
  const { detailedBreakdown, baseRating, rawImpact, impactAfterMinutes, minutesFactor, minutesPlayed } = rating;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <span>Como a nota foi calculada</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Player & Final Rating */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
            <span className="font-semibold">{playerName}</span>
            <div className="flex items-center gap-2">
              <div className={cn(
                "px-3 py-1.5 rounded-md font-bold text-white text-lg",
                rating.bgColor
              )}>
                {rating.rating!.toFixed(1)}
              </div>
              <span className={cn("text-sm font-medium", rating.color)}>
                {rating.label}
              </span>
            </div>
          </div>
          
          {/* Base & Minutes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <span>Base</span>
              </div>
              <span className="text-lg font-bold">{baseRating.toFixed(1)}</span>
            </div>
            <div className="p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                <span>Fator Minutos</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold">×{minutesFactor}</span>
                <span className="text-xs text-muted-foreground">({minutesPlayed}/90)</span>
              </div>
            </div>
          </div>
          
          {/* Caps Applied */}
          {detailedBreakdown.capsApplied.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Limites aplicados</span>
              </div>
              {detailedBreakdown.capsApplied.map((cap, idx) => (
                <div key={idx} className="text-sm">
                  <span className="text-muted-foreground">{cap.label}:</span>{" "}
                  <span className="text-red-400 line-through">+{cap.before.toFixed(2)}</span>{" "}
                  <span className="text-green-500">→ +{cap.after.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Category Breakdown */}
          <div>
            <h4 className="text-sm font-medium mb-2">Contribuição por Categoria</h4>
            <Accordion type="multiple" className="border rounded-lg">
              {detailedBreakdown.categories.map((category) => (
                <CategorySection key={category.key} category={category} />
              ))}
            </Accordion>
          </div>
          
          {/* Summary Calculation */}
          <div className="p-3 rounded-lg border bg-muted/30 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Impacto Bruto</span>
              <span className={cn(
                "font-mono font-medium",
                rawImpact > 0 ? "text-green-500" : rawImpact < 0 ? "text-red-500" : ""
              )}>
                {formatDelta(rawImpact)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">× Fator Minutos ({minutesFactor})</span>
              <span className={cn(
                "font-mono font-medium",
                impactAfterMinutes > 0 ? "text-green-500" : impactAfterMinutes < 0 ? "text-red-500" : ""
              )}>
                {formatDelta(impactAfterMinutes)}
              </span>
            </div>
            <hr className="border-border/50" />
            <div className="flex justify-between font-semibold">
              <span>Nota Final</span>
              <span className={rating.color}>
                {baseRating} + ({formatDelta(impactAfterMinutes)}) = <strong>{rating.rating!.toFixed(1)}</strong>
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
