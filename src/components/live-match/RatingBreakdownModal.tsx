/**
 * Modal to display detailed rating breakdown for a player
 * Shows how the rating was calculated with all contributing factors
 * 
 * Professional Scouting Model v2.0:
 * - Base: 6.0
 * - Minutes Factor: 0-29m=×0.6, 30-59m=×0.8, 60-79m=×0.9, 80+m=×1.0
 * - Anti-inflation: max 6.9 without goal/assist/relevant defensive action
 * - Offensive cap: max +1.0 for attack+creation+passing
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Info, TrendingUp, TrendingDown, Minus, Clock, AlertTriangle, Shield, Target, Zap } from "lucide-react";
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
  
  const weightSign = item.weight >= 0 ? "+" : "";
  const deltaSign = item.rawDelta >= 0 ? "+" : "";
  
  return (
    <div className="flex items-center justify-between py-1.5 text-xs border-b border-border/30 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <DeltaIcon value={item.rawDelta} />
        <span className="text-muted-foreground truncate">{item.label}</span>
      </div>
      <div className="flex items-center gap-2 text-right shrink-0">
        {/* Show count × weight formula */}
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {item.count} × {weightSign}{item.weight.toFixed(3)}
        </span>
        <span className="text-muted-foreground/50">=</span>
        {item.capped && item.originalDelta !== undefined && (
          <span className="font-mono text-[10px] text-red-400 line-through">
            {formatDelta(item.originalDelta)}
          </span>
        )}
        <span className={cn(
          "font-mono text-[11px] font-medium min-w-[40px] text-right",
          item.rawDelta > 0 ? "text-green-500" : item.rawDelta < 0 ? "text-red-500" : "text-muted-foreground"
        )}>
          {deltaSign}{item.rawDelta.toFixed(2)}
        </span>
        {item.capped && (
          <Badge variant="secondary" className="text-[9px] h-3.5 px-1 bg-amber-500/20 text-amber-500 border-amber-500/30 shrink-0">
            CAP
          </Badge>
        )}
      </div>
    </div>
  );
}

function CategorySection({ category }: { category: CategoryBreakdown }) {
  const hasItems = category.items.length > 0;
  const isPositive = category.raw > 0;
  const isNegative = category.raw < 0;
  
  // Category icons
  const getCategoryIcon = () => {
    switch (category.key) {
      case "attack": return <Target className="h-3.5 w-3.5" />;
      case "defense": return <Shield className="h-3.5 w-3.5" />;
      case "creation": return <Zap className="h-3.5 w-3.5" />;
      default: return null;
    }
  };
  
  return (
    <AccordionItem value={category.key} className="border-b border-border/50">
      <AccordionTrigger className="py-2 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            {getCategoryIcon()}
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
            {/* Category subtotal */}
            <div className="flex items-center justify-between pt-2 mt-1 border-t border-border/50">
              <span className="text-xs text-muted-foreground font-medium">Total da categoria</span>
              <span className={cn(
                "font-mono text-xs font-semibold",
                isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
              )}>
                {formatDelta(category.raw)}
              </span>
            </div>
          </div>
        ) : category.raw !== 0 ? (
          // Has score but no items (shouldn't happen with new logic, but fallback)
          <div className="pl-2 space-y-2">
            <div className="flex items-center justify-between py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <DeltaIcon value={category.raw} />
                <span className="text-muted-foreground">Contribuição total</span>
              </div>
              <span className={cn(
                "font-mono text-[11px]",
                isPositive ? "text-green-500" : isNegative ? "text-red-500" : "text-muted-foreground"
              )}>
                {formatDelta(category.raw)}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pl-2">Sem contribuição nesta categoria</p>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

function getMinutesFactorLabel(minutesPlayed: number): string {
  if (minutesPlayed < 30) return "0-29 min";
  if (minutesPlayed < 60) return "30-59 min";
  if (minutesPlayed < 80) return "60-79 min";
  return "80+ min";
}

export function RatingBreakdownModal({ rating, playerName, children }: RatingBreakdownModalProps) {
  // Don't show modal for players without rating (0 minutes)
  if (!rating.hasRating) {
    return <>{children}</>;
  }
  
  // If rating exists but no breakdown (persisted rating), show abbreviated modal
  const hasBreakdown = !!rating.detailedBreakdown;
  const { detailedBreakdown, baseRating, rawImpact, impactAfterMinutes, minutesFactor, minutesPlayed } = rating;
  const antiInflationApplied = detailedBreakdown?.antiInflationApplied ?? false;
  const hasImpactfulAction = detailedBreakdown?.hasImpactfulAction ?? true;
  
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
          
          {/* Professional Scouting Model Badge */}
          <div className="flex items-center gap-2 px-2">
            <Badge variant="outline" className="text-[10px] bg-zinc-800/50">
              Modelo de Scouting Profissional v2.0
            </Badge>
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
                <span className="text-xs text-muted-foreground">
                  ({getMinutesFactorLabel(minutesPlayed)})
                </span>
              </div>
            </div>
          </div>
          
          {/* Anti-Inflation & Impact Status - only show if we have breakdown data */}
          {hasBreakdown && !hasImpactfulAction && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Sem ação de impacto</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Sem gol, assistência ou ação defensiva relevante (2+ desarmes/interc./cortes).
                {antiInflationApplied && " Nota limitada a 6.9."}
              </p>
            </div>
          )}
          
          {hasBreakdown && hasImpactfulAction && (
            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
              <div className="flex items-center gap-1.5 text-xs text-green-500">
                <Target className="h-3.5 w-3.5" />
                <span className="font-medium">Ação de impacto registrada</span>
              </div>
            </div>
          )}
          
          {/* Caps Applied - only if we have breakdown data */}
          {hasBreakdown && detailedBreakdown!.capsApplied.length > 0 && (
            <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
              <div className="flex items-center gap-1.5 text-xs text-amber-500 mb-2">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="font-medium">Limites aplicados</span>
              </div>
              {detailedBreakdown!.capsApplied.map((cap, idx) => (
                <div key={idx} className="text-sm mb-1 last:mb-0">
                  <span className="text-muted-foreground">{cap.label}:</span>{" "}
                  <span className="text-red-400 line-through">{cap.before > 0 ? "+" : ""}{cap.before.toFixed(2)}</span>{" "}
                  <span className="text-green-500">→ {cap.after > 0 ? "+" : ""}{cap.after.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Category Breakdown - only if we have data */}
          {hasBreakdown ? (
            <div>
              <h4 className="text-sm font-medium mb-2">Contribuição por Categoria</h4>
              <Accordion type="multiple" className="border rounded-lg">
                {detailedBreakdown!.categories.map((category) => (
                  <CategorySection 
                    key={category.key} 
                    category={category} 
                  />
                ))}
              </Accordion>
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-zinc-700/50 bg-zinc-900/50 text-center">
              <Info className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Detalhamento indisponível para esta partida.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                A nota foi calculada pelo motor de scouting e persistida no banco de dados.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-[10px] text-amber-500/70 mt-2 font-mono">
                  [DEV] Rating persistido sem breakdown - considere rebuild
                </p>
              )}
            </div>
          )}
          
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
          
          {/* Scoring Legend */}
          <div className="p-3 rounded-lg border bg-card text-xs space-y-1.5">
            <p className="font-medium text-muted-foreground mb-2">Regras Anti-Inflação</p>
            <div className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span className="text-muted-foreground">Limite ofensivo (Ataque + Criação + Passes): máx +1.0</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-500">•</span>
              <span className="text-muted-foreground">Sem gol/assist/defesa relevante: máx nota 6.9</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-green-500">•</span>
              <span className="text-muted-foreground">Defesa NÃO possui teto positivo</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
