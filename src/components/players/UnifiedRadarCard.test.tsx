import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { screen } from '@testing-library/dom';
import { UnifiedRadarCard } from './UnifiedRadarCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the child components
vi.mock('./GKRadarCard', () => ({
  GKRadarCard: ({ playerId, playerPosition }: { playerId: string; playerPosition: string }) => (
    <div data-testid="gk-radar-card" data-player-id={playerId} data-position={playerPosition}>
      GK Radar Card - DEF/ANT/TAT/DIS/AER
    </div>
  ),
}));

vi.mock('./SofaScoreRadarCard', () => ({
  SofaScoreRadarCard: ({ playerId, playerPosition }: { playerId: string; playerPosition: string }) => (
    <div data-testid="outfield-radar-card" data-player-id={playerId} data-position={playerPosition}>
      Outfield Radar Card - ATA/TÉC/DEF/TÁT/CRI
    </div>
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('UnifiedRadarCard - Goalkeeper Detection', () => {
  const goalkeeperPositions = [
    'Goleiro',
    'GK',
    'Goalkeeper',
    'goleiro',
    'gk',
    'goalkeeper',
    'GOLEIRO',
  ];

  const outfieldPositions = [
    'Atacante',
    'Zagueiro',
    'Lateral',
    'Lateral Direito',
    'Lateral Esquerdo',
    'Meio-campo',
    'Meia',
    'Volante',
    'Ponta',
    'Centroavante',
    'ST',
    'CB',
    'RB',
    'LB',
    'CM',
    'CAM',
    'CDM',
    'LW',
    'RW',
    'CF',
  ];

  describe('Goalkeeper positions should always render GKRadarCard', () => {
    goalkeeperPositions.forEach((position) => {
      it(`should render GKRadarCard for position: "${position}"`, () => {
        render(
          <UnifiedRadarCard
            playerId="test-gk-id"
            playerPosition={position}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByTestId('gk-radar-card')).toBeInTheDocument();
        expect(screen.queryByTestId('outfield-radar-card')).not.toBeInTheDocument();
      });
    });
  });

  describe('Outfield positions should always render SofaScoreRadarCard', () => {
    outfieldPositions.forEach((position) => {
      it(`should render SofaScoreRadarCard for position: "${position}"`, () => {
        render(
          <UnifiedRadarCard
            playerId="test-outfield-id"
            playerPosition={position}
          />,
          { wrapper: createWrapper() }
        );

        expect(screen.getByTestId('outfield-radar-card')).toBeInTheDocument();
        expect(screen.queryByTestId('gk-radar-card')).not.toBeInTheDocument();
      });
    });
  });

  describe('Edge cases', () => {
    it('should render outfield radar for empty position (default)', () => {
      render(
        <UnifiedRadarCard
          playerId="test-id"
          playerPosition=""
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('outfield-radar-card')).toBeInTheDocument();
    });

    it('should render outfield radar for undefined position (default)', () => {
      render(
        <UnifiedRadarCard
          playerId="test-id"
          playerPosition={undefined}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByTestId('outfield-radar-card')).toBeInTheDocument();
    });

    it('should pass correct props to GKRadarCard', () => {
      render(
        <UnifiedRadarCard
          playerId="gk-123"
          playerPosition="Goleiro"
          showFilters={false}
          className="custom-class"
        />,
        { wrapper: createWrapper() }
      );

      const gkCard = screen.getByTestId('gk-radar-card');
      expect(gkCard).toHaveAttribute('data-player-id', 'gk-123');
      expect(gkCard).toHaveAttribute('data-position', 'Goleiro');
    });

    it('should pass correct props to SofaScoreRadarCard', () => {
      render(
        <UnifiedRadarCard
          playerId="outfield-456"
          playerPosition="Atacante"
          showFilters={true}
          className="custom-class"
        />,
        { wrapper: createWrapper() }
      );

      const outfieldCard = screen.getByTestId('outfield-radar-card');
      expect(outfieldCard).toHaveAttribute('data-player-id', 'outfield-456');
      expect(outfieldCard).toHaveAttribute('data-position', 'Atacante');
    });
  });
});

describe('Integration: GK radar consistency across screens', () => {
  /**
   * These tests verify the critical requirement:
   * "Não pode existir situação onde GK veja ATA/CRI/TÉC"
   * 
   * The UnifiedRadarCard is used in:
   * - PlayerDetail page (Visão Geral tab)
   * - RatingBreakdownModalV2 (Detalhes modal)
   * - ComparePlayers page
   * 
   * All should consistently show GK radar for goalkeepers.
   */

  it('should guarantee GK never sees outfield radar axes', () => {
    const { container } = render(
      <UnifiedRadarCard
        playerId="gk-test"
        playerPosition="Goleiro"
      />,
      { wrapper: createWrapper() }
    );

    // GKRadarCard should be rendered
    expect(screen.getByTestId('gk-radar-card')).toBeInTheDocument();
    
    // Content should reference GK axes, not outfield
    expect(container.textContent).toContain('DEF/ANT/TAT/DIS/AER');
    expect(container.textContent).not.toContain('ATA/TÉC/DEF/TÁT/CRI');
  });

  it('should guarantee outfield player never sees GK radar axes', () => {
    const { container } = render(
      <UnifiedRadarCard
        playerId="striker-test"
        playerPosition="Atacante"
      />,
      { wrapper: createWrapper() }
    );

    // SofaScoreRadarCard should be rendered
    expect(screen.getByTestId('outfield-radar-card')).toBeInTheDocument();
    
    // Content should reference outfield axes, not GK-specific
    expect(container.textContent).toContain('ATA/TÉC/DEF/TÁT/CRI');
    expect(container.textContent).not.toContain('ANT/TAT/DIS/AER');
  });
});
