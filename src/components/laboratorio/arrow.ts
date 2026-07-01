/** Builds a clean arrowhead triangle: apex exactly at `tip`, base perpendicular to the `from → tip` direction. */
export function arrowHeadPoints(
  tip: readonly [number, number],
  from: readonly [number, number],
  length: number,
  width: number
): string {
  const dx = tip[0] - from[0];
  const dy = tip[1] - from[1];
  const dist = Math.hypot(dx, dy) || 1;
  const ux = dx / dist;
  const uy = dy / dist;
  const px = -uy;
  const py = ux;

  const baseX = tip[0] - ux * length;
  const baseY = tip[1] - uy * length;

  const leftX = baseX + px * width;
  const leftY = baseY + py * width;
  const rightX = baseX - px * width;
  const rightY = baseY - py * width;

  return `${tip[0]},${tip[1]} ${leftX},${leftY} ${rightX},${rightY}`;
}
