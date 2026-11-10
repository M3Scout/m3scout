/** Utilidades de posição usadas nas páginas públicas (talentos e perfil). */

const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** zona de atuação no campo (x 0–100 de defesa → ataque, y 0–100 de esquerda → direita) */
export function zoneOf(pos: string | null): [number, number] {
  const p = norm(pos);
  if (p.includes("goleiro")) return [6, 50];
  if (p.includes("lateral") && p.includes("esq")) return [30, 14];
  if (p.includes("lateral") && p.includes("dir")) return [30, 86];
  if (p.includes("ala") && p.includes("esq")) return [48, 12];
  if (p.includes("ala") && p.includes("dir")) return [48, 88];
  if (p.includes("zagueiro")) return [20, 50];
  if (p.includes("volante")) return [36, 50];
  if (p.includes("ponta") && p.includes("esq")) return [76, 16];
  if (p.includes("ponta") && p.includes("dir")) return [76, 84];
  if (p.includes("meia") || p.includes("meio-atac") || p.includes("meio atac")) return [66, 50];
  if (p.includes("meio")) return [44, 50];
  if (p.includes("centroavante") || p.includes("atacante")) return [88, 50];
  return [50, 50];
}

export type Sector = "def" | "mei" | "ata";

/** setor do filtro de talentos */
export function sectorOf(pos: string | null): Sector {
  const p = norm(pos);
  if (p.includes("ponta") || p.includes("centroavante") || (p.includes("atacante") && !p.includes("meia") && !p.includes("meio"))) return "ata";
  if (p.includes("meia") || p.includes("meio") || p.includes("volante")) return "mei";
  return "def";
}

/** cor da posição (mesma paleta do talentos.html) */
export function colorOf(pos: string | null): string {
  const p = norm(pos);
  if (p.includes("goleiro")) return "#BF5AF2";
  if (p.includes("zagueiro")) return "#30D158";
  if (p.includes("lateral") || p.includes("ala")) return "#64D2FF";
  if (p.includes("volante")) return "#FF9F0A";
  if (p.includes("ponta")) return "#FF375F";
  if (p.includes("meia") || p.includes("meio")) return "#FFD60A";
  if (p.includes("atacante") || p.includes("centroavante")) return "#FF3B30";
  return "#8E8E93";
}

/** etiquetas de estilo: função tática + estilo de jogo ("Elegante / Técnico") */
export function styleTags(primaryRole: string | null, playStyle: string | null): string[] {
  return [primaryRole, ...(playStyle ?? "").split("/")].map((t) => (t ?? "").trim()).filter(Boolean);
}
