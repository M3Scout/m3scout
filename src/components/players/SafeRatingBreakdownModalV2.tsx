import { ComponentProps } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RatingBreakdownModalV2 } from "@/components/players/RatingBreakdownModalV2";

export function SafeRatingBreakdownModalV2(
  props: ComponentProps<typeof RatingBreakdownModalV2>
) {
  return (
    <ErrorBoundary fallbackMessage="Não foi possível carregar os detalhes da competição.">
      <RatingBreakdownModalV2 {...props} />
    </ErrorBoundary>
  );
}
