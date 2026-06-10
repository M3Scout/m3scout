import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageUtils";
import { Search, X, RotateCcw, Users, Calendar, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface Player {
  id: string;
  slug: string;
  full_name: string;
  position: string | null;
  age: number | null;
  photo_url: string | null;
  auto_rating: number | null;
  nationality: string | null;
  passports: string[] | null;
  current_club: string | null;
}

interface SlotDef {
  id: string;
  label: string;
  x: number; // % from left
  y: number; // % from top
}

type Squad = Record<string, string>; // slotId → playerId

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const FORMATION_433: SlotDef[] = [
  { id: "st",  label: "CA", x: 50, y: 14 },
  { id: "lw",  label: "PE", x: 16, y: 22 },
  { id: "rw",  label: "PD", x: 84, y: 22 },
  { id: "lm",  label: "ME", x: 18, y: 44 },
  { id: "cm",  label: "MC", x: 50, y: 47 },
  { id: "rm",  label: "MD", x: 82, y: 44 },
  { id: "lb",  label: "LE", x: 12, y: 67 },
  { id: "cb1", label: "ZA", x: 34, y: 71 },
  { id: "cb2", label: "ZA", x: 66, y: 71 },
  { id: "rb",  label: "LD", x: 88, y: 67 },
  { id: "gk",  label: "GL", x: 50, y: 86 },
];

const POSITIONS = [
  "Todos", "Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Ponta", "Atacante", "Centroavante",
];

const EU_COUNTRIES = new Set([
  "Alemanha","Áustria","Bélgica","Bulgária","Chipre","Croácia","Dinamarca",
  "Eslováquia","Eslovênia","Espanha","Estônia","Finlândia","França","Grécia",
  "Holanda","Países Baixos","Hungria","Irlanda","Itália","Letônia","Lituânia",
  "Luxemburgo","Malta","Polônia","Portugal","República Checa","Romênia","Suécia",
  "Germany","Austria","Belgium","Bulgaria","Cyprus","Croatia","Denmark",
  "Slovakia","Slovenia","Spain","Estonia","Finland","France","Greece",
  "Netherlands","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg",
  "Poland","Romania","Sweden","Czech Republic",
]);

const RED = "#E5173F";

function lastName(full: string): string {
  const parts = full.trim().split(" ");
  return parts.length > 1 ? parts[parts.length - 1] : full;
}

// ─── FIELD SVG ────────────────────────────────────────────────────────────────

function FootballFieldSVG() {
  const lc = "rgba(255,255,255,0.18)";
  const lw = 2.5;
  return (
    <svg viewBox="0 0 680 1050" className="absolute inset-0 w-full h-full" style={{ display: "block" }}>
      {/* Base layers */}
      <rect width="680" height="1050" fill="#07100a" rx="6" />
      {/* Stripe texture */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i} x="0" y={i*150} width="680" height="150"
          fill={i % 2 === 0 ? "rgba(255,255,255,0.018)" : "transparent"} />
      ))}

      {/* Outer border */}
      <rect x="28" y="28" width="624" height="994" fill="none" stroke={lc} strokeWidth={lw} />

      {/* Center line */}
      <line x1="28" y1="525" x2="652" y2="525" stroke={lc} strokeWidth={lw} />
      {/* Center circle */}
      <circle cx="340" cy="525" r="91" fill="none" stroke={lc} strokeWidth={lw} />
      {/* Center spot */}
      <circle cx="340" cy="525" r="5" fill={lc} />

      {/* Top penalty area */}
      <rect x="172" y="28" width="336" height="168" fill="none" stroke={lc} strokeWidth={lw} />
      {/* Top goal area */}
      <rect x="260" y="28" width="160" height="58" fill="none" stroke={lc} strokeWidth={lw} />
      {/* Top goal frame */}
      <rect x="278" y="8"  width="124" height="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
      {/* Top penalty spot */}
      <circle cx="340" cy="142" r="5" fill={lc} />
      {/* Top penalty arc */}
      <path d="M220 196 A91 91 0 0 1 460 196" fill="none" stroke={lc} strokeWidth={lw} />

      {/* Bottom penalty area */}
      <rect x="172" y="854" width="336" height="168" fill="none" stroke={lc} strokeWidth={lw} />
      {/* Bottom goal area */}
      <rect x="260" y="964" width="160" height="58" fill="none" stroke={lc} strokeWidth={lw} />
      {/* Bottom goal frame */}
      <rect x="278" y="1018" width="124" height="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={2} />
      {/* Bottom penalty spot */}
      <circle cx="340" cy="908" r="5" fill={lc} />
      {/* Bottom penalty arc */}
      <path d="M220 854 A91 91 0 0 0 460 854" fill="none" stroke={lc} strokeWidth={lw} />

      {/* Corner arcs */}
      <path d="M28 28 a16 16 0 0 0 16 16"   fill="none" stroke={lc} strokeWidth={lw} />
      <path d="M652 28 a16 16 0 0 1 -16 16" fill="none" stroke={lc} strokeWidth={lw} />
      <path d="M28 1022 a16 16 0 0 1 16 -16"  fill="none" stroke={lc} strokeWidth={lw} />
      <path d="M652 1022 a16 16 0 0 0 -16 -16" fill="none" stroke={lc} strokeWidth={lw} />
    </svg>
  );
}

// ─── DRAGGABLE SIDEBAR CARD ───────────────────────────────────────────────────

function DraggablePlayer({ player, inSquad }: { player: Player; inSquad: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
    data: { player },
    disabled: inSquad,
  });

  const src = getOptimizedImageUrl(player.photo_url, { width: 200, quality: 85, format: "avif" });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 }}
      {...(inSquad ? {} : { ...listeners, ...attributes })}
      className={cn(
        "flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg select-none transition-colors duration-100",
        inSquad ? "opacity-40 cursor-default" : "cursor-grab hover:bg-white/[0.06] active:bg-white/[0.09]",
      )}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0 w-9 h-9 rounded-full overflow-hidden"
        style={{ background: "#14161c", border: "1px solid rgba(255,255,255,0.08)" }}>
        {player.photo_url
          ? <img src={src || player.photo_url} alt={player.full_name} draggable={false}
              className="w-full h-full object-cover object-top"
              onError={e => { (e.target as HTMLImageElement).src = player.photo_url!; }} />
          : <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold">
              {player.full_name[0]}
            </div>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white/90 truncate leading-tight">{player.full_name}</p>
        <p className="text-[11px] text-white/35 truncate leading-tight mt-0.5">
          {player.position || "—"}{player.age ? ` · ${player.age}a` : ""}
        </p>
      </div>

      {/* Rating / In-squad dot */}
      {inSquad
        ? <div className="flex-shrink-0 w-2 h-2 rounded-full" style={{ background: "#34d399" }} title="Em campo" />
        : player.overall_rating != null && (
          <div className="flex-shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded"
            style={{ background: "rgba(229,23,63,0.1)", color: RED, border: "1px solid rgba(229,23,63,0.18)" }}>
            {player.overall_rating.toFixed(1)}
          </div>
        )
      }
    </div>
  );
}

// ─── FLOATING DRAG PREVIEW ────────────────────────────────────────────────────

function FloatingCard({ player }: { player: Player }) {
  const src = getOptimizedImageUrl(player.photo_url, { width: 200, quality: 85, format: "avif" });
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl pointer-events-none select-none"
      style={{
        width: 240, background: "rgba(14,16,22,0.96)",
        border: "1px solid rgba(229,23,63,0.45)",
        boxShadow: "0 24px 64px rgba(0,0,0,0.85), 0 0 32px rgba(229,23,63,0.18)",
        backdropFilter: "blur(16px)", cursor: "grabbing",
      }}>
      <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
        {player.photo_url && (
          <img src={src || player.photo_url} alt={player.full_name} draggable={false}
            className="w-full h-full object-cover object-top" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white truncate">{player.full_name}</p>
        <p className="text-[11px] text-white/40 truncate">{player.position || "—"}</p>
      </div>
    </div>
  );
}

// ─── DROPPABLE SLOT ───────────────────────────────────────────────────────────

function DroppableSlot({
  slot, player, onRemove,
}: {
  slot: SlotDef; player: Player | undefined; onRemove: (slotId: string) => void;
}) {
  const { isOver, setNodeRef: setDropRef } = useDroppable({ id: slot.id });

  const {
    setNodeRef: setDragRef, transform, isDragging,
    listeners: dragListeners, attributes: dragAttrs,
  } = useDraggable({
    id: player?.id ?? `__placeholder_${slot.id}`,
    data: { player, fromSlot: slot.id },
    disabled: !player,
  });

  const src = player
    ? getOptimizedImageUrl(player.photo_url, { width: 200, quality: 85, format: "avif" })
    : null;

  const showEmpty = !player || isDragging;

  return (
    <div
      ref={setDropRef}
      className="absolute"
      style={{ left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)", zIndex: 10 }}
    >
      {/* ── Empty drop zone ── */}
      <div
        className={cn(
          "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200",
          !showEmpty && "pointer-events-none opacity-0 absolute inset-0",
        )}
        style={{
          background: isOver ? "rgba(229,23,63,0.14)" : "rgba(255,255,255,0.04)",
          border: isOver ? `2px dashed ${RED}` : "2px dashed rgba(255,255,255,0.18)",
          boxShadow: isOver ? `0 0 24px rgba(229,23,63,0.28)` : "none",
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="text-[10px] font-black uppercase tracking-wider"
          style={{ color: isOver ? RED : "rgba(255,255,255,0.3)" }}>
          {slot.label}
        </span>
      </div>

      {/* ── Filled player card ── */}
      {player && (
        <div
          ref={setDragRef}
          {...dragListeners}
          {...dragAttrs}
          className="absolute inset-0 flex flex-col items-center group"
          style={{
            transform: CSS.Translate.toString(transform),
            opacity: isDragging ? 0 : 1,
            cursor: "grab",
            touchAction: "none",
            // Expand hover area slightly
            margin: -4, padding: 4,
          }}
        >
          {/* Photo circle */}
          <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0"
            style={{
              border: `2px solid rgba(255,255,255,0.28)`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.6), 0 0 10px rgba(229,23,63,0.1)",
              background: "#0d0f14",
              transition: "border-color 0.2s",
            }}>
            {player.photo_url
              ? <img src={src || player.photo_url} alt={player.full_name} draggable={false}
                  className="w-full h-full object-cover object-top"
                  onError={e => { (e.target as HTMLImageElement).src = player.photo_url!; }} />
              : <div className="w-full h-full flex items-center justify-center text-white/30 text-base font-bold"
                  style={{ background: "#14161c" }}>
                  {player.full_name[0]}
                </div>
            }

            {/* Remove button */}
            <button
              onClick={e => { e.stopPropagation(); onRemove(slot.id); }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center z-20
                         opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex"
              style={{ background: RED, border: "1.5px solid rgba(0,0,0,0.4)", boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
            >
              <X className="w-2.5 h-2.5 text-white" strokeWidth={3} />
            </button>

            {/* OVR badge */}
            {player.overall_rating != null && (
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-10 text-[8px] font-black px-1.5 py-[2px] rounded-sm whitespace-nowrap"
                style={{ background: "#050508", color: RED, border: `1px solid rgba(229,23,63,0.35)`, lineHeight: 1 }}>
                {player.overall_rating.toFixed(1)}
              </div>
            )}
          </div>

          {/* Name tag */}
          <div className="mt-3 px-2 py-[3px] rounded text-center" style={{ maxWidth: 76, background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}>
            <p className="text-[9px] font-bold text-white uppercase tracking-wide truncate" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
              {lastName(player.full_name)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SQUAD STATS ──────────────────────────────────────────────────────────────

function SquadStats({ squad, players }: { squad: Squad; players: Player[] }) {
  const placed = useMemo(() =>
    Object.values(squad).map(id => players.find(p => p.id === id)).filter((p): p is Player => !!p),
    [squad, players],
  );

  const count  = placed.length;
  const avgAge = count > 0
    ? (placed.reduce((s, p) => s + (p.age ?? 0), 0) / count).toFixed(1)
    : "—";
  const euCount = placed.filter(p =>
    p.passports?.some(pt => EU_COUNTRIES.has(pt)) || EU_COUNTRIES.has(p.nationality ?? "")
  ).length;

  const items = [
    { icon: Users,    label: "Escalados",      value: `${count}/11`,  color: RED },
    { icon: Calendar, label: "Média de Idade", value: avgAge,          color: "#60a5fa" },
    { icon: Globe,    label: "Passaporte EU",  value: String(euCount), color: "#34d399" },
  ];

  return (
    <div className="flex gap-2 mb-4">
      {items.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1"
          style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-widest text-white/25 leading-none mb-0.5">{label}</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={value}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                transition={{ duration: 0.18 }}
                className="text-sm font-black leading-none"
                style={{ color }}
              >
                {value}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PLAYER SIDEBAR ───────────────────────────────────────────────────────────

function PlayerSidebar({
  players, squad, search, setSearch, posFilter, setPosFilter,
}: {
  players: Player[]; squad: Squad;
  search: string; setSearch: (v: string) => void;
  posFilter: string; setPosFilter: (v: string) => void;
}) {
  const squadIds = useMemo(() => new Set(Object.values(squad)), [squad]);

  const filtered = useMemo(() =>
    players.filter(p => {
      const s = p.full_name.toLowerCase().includes(search.toLowerCase());
      const ps = posFilter === "Todos" || (p.position ?? "").toLowerCase().includes(posFilter.toLowerCase());
      return s && ps;
    }),
    [players, search, posFilter],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Elenco</p>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar atleta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-[13px] rounded-lg text-white placeholder:text-white/20 outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
          />
        </div>

        {/* Position filter */}
        <select
          value={posFilter}
          onChange={e => setPosFilter(e.target.value)}
          className="w-full px-3 py-2 text-[11px] rounded-lg text-white/60 outline-none appearance-none"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {POSITIONS.map(p => (
            <option key={p} value={p} style={{ background: "#0e1014" }}>{p}</option>
          ))}
        </select>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
        {filtered.length === 0
          ? <p className="text-center text-white/20 text-xs py-10">Nenhum atleta</p>
          : filtered.map(p => (
              <DraggablePlayer key={p.id} player={p} inSquad={squadIds.has(p.id)} />
            ))
        }
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <p className="text-[10px] text-white/18 text-center">
          {filtered.length} atleta{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function Prancheta() {
  const [players, setPlayers]   = useState<Player[]>([]);
  const [loading, setLoading]   = useState(true);
  const [squad, setSquad]       = useState<Squad>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [posFilter, setPosFilter] = useState("Todos");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,  { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("players")
        .select("id, slug, full_name, position, age, photo_url, overall_rating, nationality, passports, current_club")
        .eq("is_archived", false)
        .order("full_name");
      setPlayers((data as Player[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;

    const playerId   = active.id as string;
    const targetSlot = over.id as string;

    if (!FORMATION_433.some(s => s.id === targetSlot)) return;

    setSquad(prev => {
      if (prev[targetSlot] === playerId) return prev; // same slot, no-op

      const next = { ...prev };
      // Find if player was already on the field
      const sourceSlot = Object.keys(next).find(k => next[k] === playerId);
      if (sourceSlot) delete next[sourceSlot];
      // Swap: if target was occupied, move displaced player to source slot
      if (prev[targetSlot] && sourceSlot) next[sourceSlot] = prev[targetSlot];
      next[targetSlot] = playerId;
      return next;
    });
  };

  const handleRemove = (slotId: string) =>
    setSquad(prev => { const n = { ...prev }; delete n[slotId]; return n; });

  const activePlayer = players.find(p => p.id === activeId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "rgba(255,255,255,0.2)" }} />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex" style={{ backgroundColor: "#050508", minHeight: "calc(100vh - 64px)" }}>

        {/* ── FIELD COLUMN ─────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col p-4 lg:p-6 min-w-0 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div>
              <h1 className="text-lg font-black uppercase text-white" style={{ letterSpacing: "-0.02em" }}>
                Prancheta Tática
              </h1>
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/25 mt-0.5">
                4 · 3 · 3 — Arraste os atletas para o campo
              </p>
            </div>
            <button
              onClick={() => setSquad({})}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar
            </button>
          </div>

          {/* Stats panel */}
          <div className="flex-shrink-0">
            <SquadStats squad={squad} players={players} />
          </div>

          {/* Field — aspect-ratio constrained, fills remaining space */}
          <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
            <div
              className="relative"
              style={{
                aspectRatio: "680 / 1050",
                height: "100%",
                maxHeight: "100%",
                maxWidth: "100%",
              }}
            >
              <FootballFieldSVG />
              {FORMATION_433.map(slot => (
                <DroppableSlot
                  key={slot.id}
                  slot={slot}
                  player={players.find(p => p.id === squad[slot.id])}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
        <div
          className="w-72 xl:w-80 flex-shrink-0 flex flex-col"
          style={{
            borderLeft: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(255,255,255,0.012)",
          }}
        >
          <PlayerSidebar
            players={players}
            squad={squad}
            search={search}
            setSearch={setSearch}
            posFilter={posFilter}
            setPosFilter={setPosFilter}
          />
        </div>
      </div>

      {/* Drag preview overlay */}
      <DragOverlay dropAnimation={null}>
        {activePlayer ? <FloatingCard player={activePlayer} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
