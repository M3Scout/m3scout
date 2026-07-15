/**
 * Faixa preta fixa cobrindo a área segura do topo (notch/status bar).
 * Em navegador comum env(safe-area-inset-top) é 0, então isso não aparece.
 * No PWA instalado (iOS standalone), garante que a status bar sempre tenha
 * um fundo sólido, nunca o conteúdo da página "vazando" continuamente até
 * o relógio/bateria.
 */
export function PwaSafeAreaBar() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "env(safe-area-inset-top, 0px)",
        background: "#000000",
        zIndex: 9999,
        pointerEvents: "none",
      }}
    />
  );
}
