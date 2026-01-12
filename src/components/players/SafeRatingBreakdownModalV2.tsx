import { ComponentProps } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RatingBreakdownModalV2 } from "@/components/players/RatingBreakdownModalV2";

type RatingBreakdownModalV2Props = ComponentProps<typeof RatingBreakdownModalV2>;

export function SafeRatingBreakdownModalV2(props: RatingBreakdownModalV2Props) {
  return (
    <ErrorBoundary fallbackMessage="Não foi possível carregar os detalhes da competição.">
      <RatingBreakdownModalV2 {...props} />
    </ErrorBoundary>
  );
}
