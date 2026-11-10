import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { SoccerStrip } from "./SoccerStrip";
import { prefersReducedMotion } from "./shared";
import "./m3pages.css";

const EMAIL = "contato@m3agency.com.br";
const LINES = ["contato@", "m3agency.com.br"];

const fmt = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Campo_Grande",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const toTop = (e: React.MouseEvent) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); };

const SOCIAL = (
  <ul>
    <li><a href="https://instagram.com/m3agency" target="_blank" rel="noopener noreferrer">Instagram</a></li>
    <li><a href="https://www.youtube.com/@AgencyM3" target="_blank" rel="noopener noreferrer">YouTube</a></li>
    <li><a href="https://tiktok.com/@m3agency" target="_blank" rel="noopener noreferrer">TikTok</a></li>
  </ul>
);
const NAV = (
  <ul>
    <li><Link to="/sobre">Sobre</Link></li>
    <li><Link to="/atletas">Talentos</Link></li>
    <li><Link to="/imprensa">Imprensa</Link></li>
    <li><Link to="/contato">Contato</Link></li>
  </ul>
);

/** Rodapé: na home, o grande (e-mail gigante); nas demais páginas, o compacto das páginas internas. */
export function SiteFooter() {
  const { pathname } = useLocation();
  return pathname === "/" ? <HomeFooter /> : <PageFooter />;
}

function PageFooter() {
  const [clock, setClock] = useState("--:--:--");
  useEffect(() => {
    const tick = () => setClock(fmt.format(new Date()) + " · Campo Grande");
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="m3s m3p">
      <footer className="foot">
        <div className="wrap">
          <div className="end-grid">
            <div>
              <h3>Contato</h3>
              <ul>
                <li><a href={`mailto:${EMAIL}`}>{EMAIL}</a></li>
                <li><a href="tel:+5567991106060">+55 67 99110-6060</a></li>
              </ul>
            </div>
            <div>
              <h3>Base</h3>
              <ul>
                <li><span>Campo Grande · BR</span></li>
                <li><span className="clock">{clock}</span></li>
              </ul>
            </div>
            <div><h3>Social</h3>{SOCIAL}</div>
            <div><h3>Navegação</h3>{NAV}</div>
          </div>
          <div className="legal">
            <span>© 2026 M3 Agency</span>
            <span>Inteligência aplicada ao futebol</span>
            <a href="#top" onClick={toTop}>Voltar ao topo ↑</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/** Rodapé "Contato" da home: e-mail gigante que reage ao mouse, contatos e relógio de Campo Grande. */
function HomeFooter() {
  const giantRef = useRef<HTMLAnchorElement>(null);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => setClock(fmt.format(new Date()) + " · GMT-4");
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const giant = giantRef.current;
    if (!giant) return;
    const lns = [...giant.querySelectorAll<HTMLElement>(".ln")];
    const chars = [...giant.querySelectorAll<HTMLElement>(".ch")];

    function fitGiant() {
      if (!giant) return;
      const two = giant.clientWidth < 760;
      lns.forEach((ln) => (ln.style.display = two ? "block" : "inline"));
      giant.style.fontSize = "100px";
      const w = Math.max(...lns.map((l) => l.scrollWidth));
      const total = two ? w : lns.reduce((s, l) => s + l.getBoundingClientRect().width, 0);
      giant.style.fontSize = Math.floor(((100 * giant.clientWidth) / total) * 0.985) + "px";
    }

    let rects: { x: number; y: number }[] = [];
    const cacheRects = () =>
      (rects = chars.map((c) => {
        const r = c.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      }));
    const onMove = (e: PointerEvent) => {
      if (prefersReducedMotion()) return;
      if (!rects.length) cacheRects();
      chars.forEach((c, i) => {
        const d = Math.hypot(e.clientX - rects[i].x, (e.clientY - rects[i].y) * 0.6);
        const k = Math.max(0, 1 - d / 160);
        c.style.transform = `translateY(${(-k * 0.16).toFixed(3)}em)`;
        c.style.color = k > 0.55 ? "var(--red)" : "";
      });
    };
    const onLeave = () => chars.forEach((c) => { c.style.transform = ""; c.style.color = ""; });

    giant.addEventListener("pointerenter", cacheRects);
    giant.addEventListener("pointermove", onMove);
    giant.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", fitGiant);
    fitGiant();
    document.fonts?.ready.then(fitGiant);
    return () => {
      giant.removeEventListener("pointerenter", cacheRects);
      giant.removeEventListener("pointermove", onMove);
      giant.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", fitGiant);
    };
  }, []);

  return (
    <div className="m3s">
      <footer className="end" id="contato">
        <div className="wrap">
          <SoccerStrip kind="passes" />

          <a className="giant" href={`mailto:${EMAIL}`} ref={giantRef} aria-label={`Enviar e-mail para ${EMAIL}`}>
            {LINES.map((ln) => (
              <span className="ln" key={ln}>
                {[...ln].map((c, i) => (
                  <span className="ch" key={i}>{c}</span>
                ))}
              </span>
            ))}
          </a>
          <div className="end-grid">
            <div>
              <h3 className="mono">Telefone</h3>
              <ul><li><a href="tel:+5567991106060">+55 67 99110-6060</a></li></ul>
            </div>
            <div>
              <h3 className="mono">Base</h3>
              <ul>
                <li><span>Campo Grande · BR</span></li>
                <li><span className="clock mono dim">{clock}</span></li>
              </ul>
            </div>
            <div>
              <h3 className="mono">Social</h3>
              <ul>
                <li><a href="https://instagram.com/m3agency" target="_blank" rel="noopener noreferrer">Instagram</a></li>
                <li><a href="https://www.youtube.com/@AgencyM3" target="_blank" rel="noopener noreferrer">YouTube</a></li>
                <li><a href="https://tiktok.com/@m3agency" target="_blank" rel="noopener noreferrer">TikTok</a></li>
              </ul>
            </div>
            <div>
              <h3 className="mono">Navegação</h3>
              <ul>
                <li><Link to="/sobre">Sobre</Link></li>
                <li><Link to="/atletas">Talentos</Link></li>
                <li><Link to="/imprensa">Imprensa</Link></li>
                <li><Link to="/contato">Contato</Link></li>
              </ul>
            </div>
          </div>
          <div className="legal mono">
            <span>© 2026 M3 Agency</span>
            <span>Scouting · Carreira · Clubes</span>
            <a href="#topo" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
              Voltar ao topo ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
