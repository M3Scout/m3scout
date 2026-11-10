import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/authContext";
import { usePermissions, type ModuleKey, type ActionKey } from "@/hooks/usePermissions";
import { useSidebar } from "@/hooks/useSidebar";
import { useNotifications, type Notification } from "@/hooks/useNotifications";
import { hardLogoutToAuth } from "@/lib/hardLogout";
import logoM3 from "@/assets/logo-m3.png";
import { Ic } from "./icons";
import "./m3dash.css";

/* =====================================================================
   Casca do painel (painel.html): barra lateral estilo macOS, busca ⌘K,
   notificações, dock e menu em folha no celular. Mesmas rotas e
   permissões da barra lateral anterior.
   ===================================================================== */

interface NavItem { href: string; label: string; module: string; action?: string; icon: string; tile: string }
interface NavGroup { label: string; items: NavItem[] }

const INTERNAL: NavGroup[] = [
  { label: "Análise", items: [
    { href: "/dashboard", label: "Visão geral", module: "app", icon: "grid", tile: "#0A84FF" },
    { href: "/dashboard/atletas", label: "Atletas", module: "players", icon: "users", tile: "#FF9F0A" },
    { href: "/dashboard/comparar", label: "Comparar", module: "compare", icon: "cmp", tile: "#5E5CE6" },
    { href: "/dashboard/relatorios", label: "Relatórios", module: "reports", icon: "doc", tile: "#30B0C7" },
    { href: "/dashboard/metas", label: "Metas", module: "users", action: "manage", icon: "goal", tile: "#FF375F" },
  ] },
  { label: "Contexto esportivo", items: [
    { href: "/dashboard/aovivo", label: "Jogo ao vivo", module: "live_match", icon: "live", tile: "#FF3B30" },
    { href: "/dashboard/competicoes", label: "Competições", module: "competitions", icon: "trophy", tile: "#FFB800" },
    { href: "/dashboard/laboratorio", label: "Lab. Tático", module: "players", icon: "lab", tile: "#34C759" },
  ] },
  { label: "Negócios", items: [
    { href: "/dashboard/noticias", label: "Notícias", module: "news", icon: "news", tile: "#8E8E93" },
  ] },
  { label: "Mercado", items: [
    { href: "/dashboard/ativos", label: "Ativos M3", module: "players", icon: "chart", tile: "#30D158" },
    { href: "/dashboard/monitoramento", label: "Targets", module: "players", icon: "crosshair", tile: "#BF5AF2" },
    { href: "/dashboard/contratos", label: "Contratos", module: "players", icon: "file", tile: "#64D2FF" },
  ] },
  { label: "Administração", items: [
    { href: "/dashboard/usuarios", label: "Usuários", module: "users", action: "manage", icon: "shield", tile: "#636366" },
  ] },
];

const PLAYER: NavGroup[] = [
  { label: "Meu espaço", items: [
    { href: "/dashboard", label: "Visão geral", module: "app", icon: "grid", tile: "#0A84FF" },
    { href: "/dashboard/my-profile", label: "Meu perfil", module: "players", icon: "user", tile: "#FF9F0A" },
    { href: "/dashboard/minhas-metas", label: "Metas", module: "app", icon: "goal", tile: "#FF375F" },
    { href: "/dashboard/meus-contratos", label: "Contratos", module: "app", icon: "file", tile: "#64D2FF" },
    { href: "/dashboard/relatorios", label: "Relatórios", module: "reports", icon: "doc", tile: "#30B0C7" },
  ] },
  { label: "Jogos", items: [
    { href: "/dashboard/aovivo", label: "Meus jogos", module: "live_match", icon: "live", tile: "#FF3B30" },
    { href: "/dashboard/competicoes", label: "Competições", module: "competitions", icon: "trophy", tile: "#FFB800" },
    { href: "/dashboard/laboratorio", label: "Lab. Tático", module: "app", icon: "lab", tile: "#34C759" },
  ] },
];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type CmdItem = { group: string; label: string; to: string; hint: string };

/* ---------- busca rápida ---------- */
function CommandPalette({ open, onClose, sections }: { open: boolean; onClose: () => void; sections: NavItem[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const [extra, setExtra] = useState<CmdItem[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { setQ(""); setSel(0); d.showModal(); setTimeout(() => inputRef.current?.focus(), 0); }
    if (!open && d.open) d.close();
  }, [open]);

  // atletas e competições só na primeira abertura
  useEffect(() => {
    if (!open || loaded.current) return;
    loaded.current = true;
    (async () => {
      const [pl, cp] = await Promise.all([
        supabase.from("players").select("id, full_name, position").eq("is_archived", false).order("full_name").limit(300),
        supabase.from("competitions").select("id, name").order("name").limit(200),
      ]);
      const items: CmdItem[] = [];
      (pl.data ?? []).forEach((p) => items.push({ group: "Atletas", label: p.full_name, to: `/dashboard/atletas/${p.id}`, hint: p.position ?? "" }));
      (cp.data ?? []).forEach((c) => items.push({ group: "Competições", label: c.name, to: "/dashboard/competicoes", hint: "Competição" }));
      setExtra(items);
    })();
  }, [open]);

  const all: CmdItem[] = useMemo(() => [
    ...sections.map((s) => ({ group: "Seções", label: s.label, to: s.href, hint: "" })),
    ...extra.filter((x) => x.group === "Atletas"),
    { group: "Ações", label: "Novo relatório", to: "/dashboard/relatorios/novo", hint: "Relatórios" },
    { group: "Ações", label: "Novo atleta", to: "/dashboard/atletas/novo", hint: "Atletas" },
    { group: "Ações", label: "Nova notícia", to: "/dashboard/noticias/nova", hint: "Notícias" },
    ...extra.filter((x) => x.group === "Competições"),
  ], [sections, extra]);

  const t = norm(q.trim());
  const shown = all.filter((x) => !t || norm(x.label).includes(t)).slice(0, 14);
  const cur = Math.min(sel, Math.max(0, shown.length - 1));
  const go = (i: number) => { const x = shown[i]; if (!x) return; onClose(); navigate(x.to); };

  let lastGroup = "";
  return (
    <dialog
      className="cmd"
      ref={ref}
      aria-label="Busca rápida"
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="cmd-in">
        <Ic n="search" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Buscar seção, atleta, competição…"
          aria-label="Buscar"
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, shown.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); go(cur); }
          }}
        />
      </div>
      <ul role="listbox">
        {shown.length === 0 && <li className="gl">Nada encontrado</li>}
        {shown.map((x, i) => {
          const gh = x.group !== lastGroup ? <li className="gl" key={`g-${x.group}`}>{x.group}</li> : null;
          lastGroup = x.group;
          return [
            gh,
            <li key={`${x.group}-${x.to}-${x.label}`}>
              <button type="button" role="option" aria-selected={i === cur} onMouseEnter={() => setSel(i)} onClick={() => go(i)}>
                {x.label}<small>{x.hint}</small>
              </button>
            </li>,
          ];
        })}
      </ul>
    </dialog>
  );
}

/* ---------- notificações ---------- */
type NotifApi = ReturnType<typeof useNotifications>;

function NotificationsPop({ open, onClose, api }: { open: boolean; onClose: () => void; api: NotifApi }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = api;
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (ref.current?.contains(el) || el.closest("[data-bell]")) return;
      onClose();
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, [open, onClose]);

  const pick = (n: Notification) => {
    if (!n.read) markAsRead(n.id);
    onClose();
    if (n.link) navigate(n.link);
  };

  return (
    <div className={`pop ${open ? "on" : ""}`} ref={ref} role="dialog" aria-label="Notificações">
      <div className="pop-h">
        <h4>Notificações</h4>
        {unreadCount > 0 && <button type="button" onClick={markAllAsRead}>Marcar todas como lidas</button>}
      </div>
      <div className="pop-l">
        {notifications.length === 0 && <p className="pop-e">Nenhuma notificação.</p>}
        {notifications.slice(0, 30).map((n) => (
          <button type="button" key={n.id} onClick={() => pick(n)}>
            <i className={`nd ${n.read ? "rd" : ""}`} />
            <span>
              <b>{n.title}</b>
              <span>{n.message}</span>
              <small>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}</small>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- casca ---------- */
export function DashShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const { can, isPlayerRole } = usePermissions();
  const { isCollapsed, toggleCollapsed } = useSidebar();
  // uma única instância (o hook abre assinatura em tempo real)
  const notif = useNotifications();
  const { unreadCount } = notif;
  const [cmdOpen, setCmdOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const groups = useMemo(() => {
    const base = isPlayerRole ? PLAYER : INTERNAL;
    return base
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => !it.module || it.module === "app" || can(it.module as ModuleKey, (it.action || "view") as ActionKey)),
      }))
      .filter((g) => g.items.length > 0);
  }, [isPlayerRole, can]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  const path = location.pathname;
  const isActive = useCallback((href: string) => (href === "/dashboard" ? path === "/dashboard" : path.startsWith(href)), [path]);

  // dock do celular: 4 atalhos + "Mais"
  const dock = useMemo(() => {
    const want = isPlayerRole
      ? ["/dashboard", "/dashboard/my-profile", "/dashboard/minhas-metas", "/dashboard/aovivo"]
      : ["/dashboard", "/dashboard/atletas", "/dashboard/relatorios", "/dashboard/monitoramento"];
    return want.map((h) => flat.find((f) => f.href === h)).filter(Boolean) as NavItem[];
  }, [flat, isPlayerRole]);

  useEffect(() => { setSheet(false); setBellOpen(false); }, [path]);
  const closeBell = useCallback(() => setBellOpen(false), []);

  // ⌘K / Ctrl+K e Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setCmdOpen((v) => !v); }
      if (e.key === "Escape") { setSheet(false); setBellOpen(false); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // arrastar a folha para baixo fecha
  const drag = useRef<{ y0: number; dy: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { y0: e.clientY, dy: 0 };
    sheetRef.current?.classList.add("dragging");
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !sheetRef.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y0);
    sheetRef.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    if (!drag.current) return;
    const close = drag.current.dy > 110;
    drag.current = null;
    sheetRef.current?.classList.remove("dragging");
    if (sheetRef.current) sheetRef.current.style.transform = "";
    if (close) setSheet(false);
  };

  const email = user?.email ?? "";
  const initial = (email[0] ?? "M").toUpperCase();
  const me = (
    <span className="sb-me-t">
      <b>{email}</b>
      <small>M3 Agency</small>
    </span>
  );

  return (
    <div className={`m3d dashboard-root ${isCollapsed ? "collapsed" : ""} ${sheet ? "sheet-on" : ""}`}>
      <aside className="side" aria-label="Navegação principal">
        <div className="side-h">
          <Link className="logo" to="/dashboard" aria-label="Painel M3 — início"><img src={logoM3} alt="" /></Link>
          <button className="sb-i" type="button" data-bell aria-label="Notificações" aria-expanded={bellOpen} onClick={() => setBellOpen((v) => !v)}>
            <Ic n="bell" />{unreadCount > 0 && <span className="dot" />}
          </button>
          <button className="sb-i" type="button" data-collapse aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"} onClick={toggleCollapsed}>
            <Ic n="sidebar" />
          </button>
        </div>
        <button className="sb-search" type="button" onClick={() => setCmdOpen(true)}>
          <Ic n="search" /><span>Buscar</span><kbd>⌘K</kbd>
        </button>
        <nav className="sb-nav">
          {groups.map((g) => (
            <div key={g.label} style={{ display: "contents" }}>
              <p className="sb-g">{g.label}</p>
              {g.items.map((it) => (
                <Link key={it.href} to={it.href} title={it.label} aria-current={isActive(it.href) ? "page" : undefined}>
                  <Ic n={it.icon} /><span>{it.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sb-me">
          <span className="me">{initial}</span>
          {me}
          <button className="sb-i" type="button" data-logout aria-label="Sair" onClick={() => hardLogoutToAuth()}>
            <Ic n="logout" />
          </button>
        </div>
      </aside>

      <main className="m3d-main">
        <div className="m3d-in">{children}</div>
      </main>

      {/* celular */}
      <div className="scrim" onClick={() => setSheet(false)} />
      <div className="msheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!sheet}>
        <div className="ms-top" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="ms-grab" />
          <div className="ms-h">
            <b>Menu</b>
            <button className="ms-x" type="button" aria-label="Fechar" onClick={() => setSheet(false)}><Ic n="x" /></button>
          </div>
          <button className="ms-search" type="button" onClick={() => { setSheet(false); setTimeout(() => setCmdOpen(true), 250); }}>
            <Ic n="search" /><span>Buscar seção, atleta, competição…</span>
          </button>
        </div>
        <div className="ms-b">
          {groups.map((g) => (
            <div key={g.label}>
              <p className="ms-g">{g.label}</p>
              <div className="ms-grid">
                {g.items.map((it) => (
                  <Link key={it.href} to={it.href} className="ms-t" style={{ ["--c" as string]: it.tile }} aria-current={isActive(it.href) ? "page" : undefined}>
                    <span className="ms-i"><Ic n={it.icon} /></span>
                    <span className="ms-n">{it.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div className="ms-me"><span className="me">{initial}</span>{me}</div>
          <div className="ms-acts">
            <button className="btn g" type="button" onClick={() => { setSheet(false); setBellOpen(true); }}>
              <Ic n="bell" />Notificações{unreadCount > 0 ? ` (${unreadCount})` : ""}
            </button>
            <button className="btn g" type="button" style={{ color: "var(--red)" }} onClick={() => hardLogoutToAuth()}>
              <Ic n="logout" />Sair
            </button>
          </div>
        </div>
      </div>
      <nav className="dock" aria-label="Navegação">
        {dock.map((it) => (
          <Link key={it.href} to={it.href} aria-current={isActive(it.href) ? "page" : undefined}>
            <Ic n={it.icon} />{it.label.split(" ")[0]}
          </Link>
        ))}
        <button type="button" onClick={() => setSheet(true)}>
          <Ic n="menu" />Mais{unreadCount > 0 && <span className="dot" />}
        </button>
      </nav>

      <NotificationsPop open={bellOpen} onClose={closeBell} api={notif} />
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} sections={flat} />
    </div>
  );
}
