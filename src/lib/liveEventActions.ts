import { LucideIcon } from "lucide-react";
import {
  Goal,
  HandHelping,
  Target,
  Crosshair,
  Zap,
  Footprints,
  UserX,
  ArrowRight,
  ArrowUpRight,
  Shield,
  ShieldCheck,
  RotateCcw,
  Ban,
  Users,
  AlertTriangle,
  CircleOff,
  Square,
  Hand,
  CircleX,
  TriangleAlert,
} from "lucide-react";

/**
 * Grupos/categorias de eventos
 */
export const EVENT_GROUPS = {
  attack: {
    key: "attack",
    label: "Ataque",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/20",
  },
  passing: {
    key: "passing", 
    label: "Passe",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/20",
  },
  defense: {
    key: "defense",
    label: "Defesa",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
  },
  discipline: {
    key: "discipline",
    label: "Disciplina",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
  },
  goalkeeper: {
    key: "goalkeeper",
    label: "Goleiro",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/20",
  },
} as const;

export type EventGroup = keyof typeof EVENT_GROUPS;

/**
 * Tipo do evento de jogo ao vivo
 */
export interface LiveEventAction {
  /** Chave única do evento */
  key: string;
  /** Tipo usado na RPC (match_event_type enum) */
  type: string;
  /** Nome exibido na UI */
  label: string;
  /** Categoria/grupo */
  group: EventGroup;
  /** Ícone Lucide */
  icon: LucideIcon;
  /** Descrição opcional */
  description?: string;
  /** Aliases para busca */
  aliases?: string[];
  /** Exibir apenas para goleiro */
  requiresGoalkeeper?: boolean;
  /** Cores customizadas para ícone (ex: cartões) */
  iconClassName?: string;
}

/**
 * Lista ÚNICA de todos os eventos disponíveis no Jogo Ao Vivo.
 * Esta é a Single Source of Truth - Desktop e Mobile devem usar esta lista.
 */
export const LIVE_EVENT_ACTIONS: LiveEventAction[] = [
  // ========== ATAQUE ==========
  {
    key: "goal",
    type: "goal",
    label: "Gol",
    group: "attack",
    icon: Goal,
    aliases: ["gol", "goal", "marcar"],
  },
  {
    key: "assist",
    type: "assist",
    label: "Assistência",
    group: "attack",
    icon: HandHelping,
    aliases: ["assist", "passe gol"],
  },
  {
    key: "shot_on_target",
    type: "shot_on_target",
    label: "Finalização no gol",
    group: "attack",
    icon: Target,
    description: "Finalização que foi ao gol",
    aliases: ["finalização", "finalizacao", "no gol", "chute gol"],
  },
  {
    key: "shot",
    type: "shot",
    label: "Finalização para fora",
    group: "attack",
    icon: Crosshair,
    description: "Finalização que não foi no gol",
    aliases: ["finalização fora", "para fora", "chute fora"],
  },
  {
    key: "chance_created",
    type: "chance_created",
    label: "Chance criada",
    group: "attack",
    icon: Zap,
    description: "Criou oportunidade clara",
    aliases: ["chance", "oportunidade"],
  },
  {
    key: "dribble_success",
    type: "dribble_success",
    label: "Drible certo",
    group: "attack",
    icon: Footprints,
    aliases: ["drible", "finta", "drible ganho"],
  },
  {
    key: "dribble_attempt",
    type: "dribble_attempt",
    label: "Drible perdido",
    group: "attack",
    icon: Footprints,
    description: "Tentativa de drible falhou",
    aliases: ["drible errado", "drible perdido"],
  },

  // ========== PASSE ==========
  {
    key: "pass_success",
    type: "pass_success",
    label: "Passe certo",
    group: "passing",
    icon: ArrowRight,
    aliases: ["passe", "acerto"],
  },
  {
    key: "pass_total",
    type: "pass_total",
    label: "Passe errado",
    group: "passing",
    icon: ArrowRight,
    description: "Passe que não chegou",
    aliases: ["passe errado", "tentativa"],
  },
  {
    key: "key_pass",
    type: "key_pass",
    label: "Passe decisivo",
    group: "passing",
    icon: ArrowUpRight,
    description: "Passe que gerou finalização",
    aliases: ["passe chave", "key pass"],
  },

  // ========== DEFESA ==========
  {
    key: "tackle",
    type: "tackle",
    label: "Desarme",
    group: "defense",
    icon: Shield,
    aliases: ["tackle", "roubo"],
  },
  {
    key: "interception",
    type: "interception",
    label: "Interceptação",
    group: "defense",
    icon: ShieldCheck,
    aliases: ["intercept", "corte passe"],
  },
  {
    key: "recovery",
    type: "recovery",
    label: "Recuperação",
    group: "defense",
    icon: RotateCcw,
    description: "Recuperou a posse",
    aliases: ["recover", "recupera"],
  },
  {
    key: "clearance",
    type: "clearance",
    label: "Corte",
    group: "defense",
    icon: Ban,
    description: "Afastamento da área",
    aliases: ["clear", "afasta", "corte"],
  },
  {
    key: "duel_won",
    type: "duel_won",
    label: "Duelo ganho",
    group: "defense",
    icon: Users,
    aliases: ["duelo", "1x1 ganho"],
  },
  {
    key: "duel_total",
    type: "duel_total",
    label: "Duelo perdido",
    group: "defense",
    icon: Users,
    description: "Perdeu disputa individual",
    aliases: ["duelo perdido"],
  },
  {
    key: "aerial_duel_won",
    type: "aerial_duel_won",
    label: "Duelo aéreo",
    group: "defense",
    icon: ArrowUpRight,
    description: "Ganhou disputa aérea",
    aliases: ["aereo", "cabeca"],
  },
  {
    key: "possession_lost",
    type: "possession_lost",
    label: "Posse perdida",
    group: "defense",
    icon: CircleOff,
    description: "Perdeu a bola",
    aliases: ["perda", "entrega"],
  },
  {
    key: "foul_suffered",
    type: "foul_suffered",
    label: "Falta sofrida",
    group: "defense",
    icon: UserX,
    aliases: ["sofreu falta"],
  },

  // ========== DISCIPLINA ==========
  {
    key: "foul_committed",
    type: "foul_committed",
    label: "Falta cometida",
    group: "discipline",
    icon: AlertTriangle,
    aliases: ["falta", "infração"],
  },
  {
    key: "yellow",
    type: "yellow",
    label: "Cartão amarelo",
    group: "discipline",
    icon: Square,
    iconClassName: "fill-yellow-400 text-yellow-400",
    aliases: ["amarelo", "advertencia"],
  },
  {
    key: "red",
    type: "red",
    label: "Cartão vermelho",
    group: "discipline",
    icon: Square,
    iconClassName: "fill-red-500 text-red-500",
    aliases: ["vermelho", "expulsao"],
  },

  // ========== GOLEIRO ==========
  {
    key: "save",
    type: "save",
    label: "Defesa",
    group: "goalkeeper",
    icon: Hand,
    requiresGoalkeeper: true,
    aliases: ["defesa", "pegou"],
  },
  {
    key: "box_save",
    type: "box_save",
    label: "Defesa difícil",
    group: "goalkeeper",
    icon: Hand,
    requiresGoalkeeper: true,
    description: "Defesa de alta dificuldade",
    aliases: ["defesaça", "milagre"],
  },
  {
    key: "goal_conceded",
    type: "goal_conceded",
    label: "Gol sofrido",
    group: "goalkeeper",
    icon: CircleX,
    requiresGoalkeeper: true,
    aliases: ["tomou gol", "sofreu gol"],
  },
  {
    key: "high_claim",
    type: "high_claim",
    label: "Saída de gol (alta)",
    group: "goalkeeper",
    icon: ArrowUpRight,
    requiresGoalkeeper: true,
    description: "Pegou cruzamento",
    aliases: ["cruzamento", "bola alta"],
  },
  {
    key: "sweeper_action",
    type: "sweeper_action",
    label: "Saída do gol",
    group: "goalkeeper",
    icon: Footprints,
    requiresGoalkeeper: true,
    description: "Atuou como líbero",
    aliases: ["saida", "libero"],
  },
  {
    key: "punch",
    type: "punch",
    label: "Soco/Defesa de punho",
    group: "goalkeeper",
    icon: Hand,
    requiresGoalkeeper: true,
    aliases: ["soco", "punho"],
  },
  {
    key: "penalty_saved",
    type: "penalty_saved",
    label: "Pênalti defendido",
    group: "goalkeeper",
    icon: Shield,
    requiresGoalkeeper: true,
    aliases: ["penalti", "penalty"],
  },
  {
    key: "error_led_to_goal",
    type: "error_led_to_goal",
    label: "Erro levou a gol",
    group: "goalkeeper",
    icon: TriangleAlert,
    requiresGoalkeeper: true,
    description: "Falha que resultou em gol",
    aliases: ["erro", "falha"],
  },
];

/**
 * Ordem de exibição das categorias
 */
export const GROUP_ORDER: EventGroup[] = ["attack", "passing", "defense", "discipline", "goalkeeper"];

/**
 * Filtra eventos por tipo de jogador (goleiro ou linha)
 */
export function filterEventsByPlayerType(isGoalkeeper: boolean): LiveEventAction[] {
  if (isGoalkeeper) {
    // Goleiro vê: eventos de goleiro + disciplina
    return LIVE_EVENT_ACTIONS.filter(
      (e) => e.group === "goalkeeper" || e.group === "discipline"
    );
  }
  // Jogador de linha vê: tudo exceto goleiro
  return LIVE_EVENT_ACTIONS.filter((e) => !e.requiresGoalkeeper);
}

/**
 * Agrupa eventos por categoria
 */
export function groupEventsByCategory(events: LiveEventAction[]): Record<EventGroup, LiveEventAction[]> {
  const grouped: Record<EventGroup, LiveEventAction[]> = {
    attack: [],
    passing: [],
    defense: [],
    discipline: [],
    goalkeeper: [],
  };

  for (const event of events) {
    grouped[event.group].push(event);
  }

  return grouped;
}

/**
 * Busca eventos por texto
 */
export function searchEvents(events: LiveEventAction[], query: string): LiveEventAction[] {
  if (!query.trim()) return events;
  
  const q = query.toLowerCase();
  return events.filter(
    (e) =>
      e.label.toLowerCase().includes(q) ||
      e.type.toLowerCase().includes(q) ||
      e.description?.toLowerCase().includes(q) ||
      e.aliases?.some((a) => a.toLowerCase().includes(q))
  );
}
