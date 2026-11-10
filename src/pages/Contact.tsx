import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { submitLead } from "@/lib/leads";
import "@/components/site/m3site.css";
import "@/components/site/m3pages.css";
import { KickTitle } from "@/components/site/KickTitle";
import { SoccerStrip } from "@/components/site/SoccerStrip";
import { SplitTitle, usePageFx } from "@/components/site/pageFx";
import { useInClass } from "@/components/site/shared";

const EMAIL = "contato@m3agency.com.br";

const ROT_WORDS = [
  { t: "WhatsApp", c: "#30D158" },
  { t: "e-mail", c: "#64D2FF" },
  { t: "Instagram", c: "#FF375F" },
  { t: "WhatsApp", c: "#30D158" },
];

const Arrow = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const CHANNELS = [
  {
    k: "E-mail", v: EMAIL, c: "#0A84FF", href: `mailto:${EMAIL}`, cta: "Enviar e-mail", copy: EMAIL, external: false,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></svg>,
  },
  {
    k: "WhatsApp", v: "(67) 9 9110-6060", c: "#30D158", href: "https://wa.me/5567991106060", cta: "Abrir conversa", copy: "+55 67 99110-6060", external: true,
    icon: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.2a9.7 9.7 0 0 0-8.3 14.7L2.3 21.8l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 5 5 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.2Z" /></svg>,
  },
  {
    k: "Instagram", v: "@_m3agency", c: "#FF375F", href: "https://instagram.com/_m3agency", cta: "Abrir perfil", copy: "@_m3agency", external: true,
    icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" /></svg>,
  },
];

type FieldName = "nome" | "email" | "telefone" | "clube" | "assunto" | "mensagem";
const REQUIRED: FieldName[] = ["nome", "email", "assunto", "mensagem"];
const valid = (name: FieldName, v: string) =>
  name === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) : v.trim().length > 1;

/* ---------- palavra que gira ---------- */
function RotWord() {
  const slotRef = useRef<HTMLSpanElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const slot = slotRef.current, span = spanRef.current;
    if (!slot || !span) return;
    const items = span.children.length;
    let k = 0;
    const fit = () => { const b = span.children[k] as HTMLElement; slot.style.width = b.scrollWidth + 2 + "px"; };
    [...span.children].forEach((b) => ((b as HTMLElement).style.width = "max-content"));
    fit();
    document.fonts?.ready.then(fit);
    let reset = 0;
    const id = window.setInterval(() => {
      k++;
      span.style.transition = "";
      span.style.transform = `translateY(${-k * 1.2}em)`;
      fit();
      if (k === items - 1) reset = window.setTimeout(() => { span.style.transition = "none"; span.style.transform = "translateY(0)"; k = 0; }, 800);
    }, 2200);
    return () => { window.clearInterval(id); window.clearTimeout(reset); };
  }, []);
  return (
    <span className="rot-slot" ref={slotRef}>
      <span ref={spanRef}>
        {ROT_WORDS.map((w, i) => <b key={i} style={{ color: w.c }}>{w.t}</b>)}
      </span>
    </span>
  );
}

/* ---------- atendimento aberto agora? (horário de Brasília) ---------- */
function useOpenNow() {
  const calc = () => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", weekday: "short", hour: "numeric", hour12: false })
        .formatToParts(new Date())
        .map((x) => [x.type, x.value])
    );
    const h = +p.hour % 24;
    return !["Sat", "Sun"].includes(p.weekday) && h >= 9 && h < 18;
  };
  const [open, setOpen] = useState(calc);
  useEffect(() => { const id = window.setInterval(() => setOpen(calc()), 60000); return () => window.clearInterval(id); }, []);
  return open;
}

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); } catch {
      const t = document.createElement("textarea"); t.value = value; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  };
  return <button className={`pill ghost ${done ? "copied" : ""}`} type="button" onClick={copy}>{done ? "Copiado" : "Copiar"}</button>;
}

/* ---------- formulário: a bola avança conforme o preenchimento ---------- */
function ContactForm() {
  const [searchParams] = useSearchParams();
  const playerSlug = searchParams.get("player");
  const [v, setV] = useState<Record<FieldName, string>>({
    nome: "", email: "", telefone: "", clube: "",
    assunto: playerSlug ? `Interesse no atleta: ${playerSlug}` : "",
    mensagem: playerSlug ? `Olá, gostaria de receber mais informações sobre o atleta ${playerSlug}.` : "",
  });
  const [bad, setBad] = useState<Set<FieldName>>(() => new Set());
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [kicked, setKicked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [boxRef, boxIn] = useInClass<HTMLDivElement>();

  const p = REQUIRED.filter((n) => valid(n, v[n])).length / REQUIRED.length;
  const net: string[] = [];
  for (let x = 242; x < 312; x += 12) net.push(`M${x} 84V180`);
  for (let y = 94; y < 182; y += 12) net.push(`M232 ${y}H310`);

  const set = (n: FieldName) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setV((s) => ({ ...s, [n]: val }));
    if (valid(n, val)) setBad((b) => { const nb = new Set(b); nb.delete(n); return nb; });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const wrong = REQUIRED.filter((n) => !valid(n, v[n]));
    if (wrong.length) {
      setBad(new Set(wrong));
      // reinicia o "tremor" dos campos com erro
      requestAnimationFrame(() => {
        formRef.current?.querySelectorAll<HTMLElement>(".fld.bad").forEach((f) => { f.style.animation = "none"; void f.offsetWidth; f.style.animation = ""; });
      });
      formRef.current?.querySelector<HTMLElement>(`[name="${wrong[0]}"]`)?.focus();
      return;
    }
    setSending(true);
    try {
      await submitLead({
        name: v.nome, email: v.email, phone: v.telefone, organization: v.clube,
        subject: v.assunto, message: v.mensagem, playerSlug: playerSlug || undefined,
      });
      // chute: a bola entra no gol
      setKicked(true);
      window.setTimeout(() => setSent(true), 750);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const again = () => {
    setV({ nome: "", email: "", telefone: "", clube: "", assunto: "", mensagem: "" });
    setBad(new Set()); setSent(false); setKicked(false);
  };

  const fld = (n: FieldName, label: string, opts: { req?: boolean; full?: boolean; type?: string; auto?: string; err?: string; area?: boolean } = {}) => (
    <div className={`fld ${opts.full ? "full" : ""} ${bad.has(n) ? "bad" : ""}`} key={n}>
      {opts.area ? (
        <textarea id={`f-${n}`} name={n} placeholder=" " value={v[n]} onChange={set(n)} required={opts.req} />
      ) : (
        <input id={`f-${n}`} name={n} type={opts.type ?? "text"} placeholder=" " autoComplete={opts.auto} value={v[n]} onChange={set(n)} required={opts.req} />
      )}
      <label htmlFor={`f-${n}`}>{label} {opts.req && <b>*</b>}</label>
      {opts.err && <small className="err">{opts.err}</small>}
    </div>
  );

  const ballX = 24 + p * 170;
  return (
    <div ref={boxRef} className={`fbox rise ${boxIn ? "in" : ""} ${sent ? "sent" : ""}`} style={{ ["--fp" as string]: p }}>
      <div className="f-side">
        <SplitTitle text="Envie uma mensagem" id="ft" />
        <div className="f-goal" aria-hidden="true">
          <svg viewBox="0 0 320 200">
            <path className="gl" d="M0 180H320" />
            <g className="nt"><path d={net.join("")} /></g>
            <path className="fr" d="M230 182V82H312V182" />
            <path className="bar-p" style={{ ["--len" as string]: 300 }} d="M10 196H310" />
            <g
              className="fb"
              style={kicked
                ? { transform: "translate(272px,118px) scale(.75)", transition: "transform .7s cubic-bezier(.2,.7,.3,1)" }
                : { transform: `translate(${ballX.toFixed(1)}px,166px)` }}
            >
              <g transform={`rotate(${(p * 540).toFixed(0)})`}>
                <circle r="13" fill="#F5F5F7" />
                <path fill="#111" d="m0-4.6 4.4 3.2-1.7 5.1h-5.4l-1.7-5.1z" />
                <path fill="none" stroke="#111" strokeWidth="1" d="M0-4.6v-8M4.4-1.4l7.4-2.6M2.7 3.7l4.6 6.1M-2.7 3.7l-4.6 6.1M-4.4-1.4l-7.4-2.6" />
              </g>
            </g>
          </svg>
          <small>{p === 1 ? "Tudo pronto. Agora é chutar!" : "Preencha para levar a bola até o gol"}</small>
        </div>
      </div>
      <form className="f" ref={formRef} onSubmit={submit} noValidate>
        {fld("nome", "Nome", { req: true, auto: "name", err: "Informe seu nome." })}
        {fld("email", "E-mail", { req: true, type: "email", auto: "email", err: "Informe um e-mail válido." })}
        {fld("telefone", "Telefone", { type: "tel", auto: "tel" })}
        {fld("clube", "Clube / organização", { auto: "organization" })}
        {fld("assunto", "Assunto", { req: true, full: true, err: "Conte o motivo do contato." })}
        {fld("mensagem", "Mensagem", { req: true, full: true, area: true, err: "Escreva sua mensagem." })}
        <div className="f-foot">
          <p className="f-note">Sua mensagem chega direto para a equipe da M3. Respondemos pelo e-mail informado.</p>
          <button className="pill red send" type="submit" disabled={sending}>
            {sending ? "Enviando…" : "Enviar mensagem"} <Arrow />
          </button>
        </div>
      </form>
      <div className="f-done" role="status">
        <h3>Golaço. Mensagem enviada!</h3>
        <p>Recebemos tudo e vamos responder em breve. Se preferir, escreva direto para <a href={`mailto:${EMAIL}`}>{EMAIL}</a>.</p>
        <button className="pill ghost" type="button" onClick={again}>Nova mensagem</button>
      </div>
    </div>
  );
}

const Contact = () => {
  const rootRef = useRef<HTMLDivElement>(null);
  const open = useOpenNow();
  usePageFx(rootRef);

  return (
    <div className="m3s m3p" ref={rootRef}>
      <section className="page-h wrap" id="top">
        <KickTitle as="h1" text="Fale com a M3" red={[2, 3]} />
        <p className="rot">Chama no <RotWord /> ou mande uma mensagem aqui.</p>
        <p className={`status ${open ? "open" : ""}`}>
          <i />
          <span><b>{open ? "Atendimento aberto agora" : "Fora do horário — respondemos no próximo dia útil"}</b> · seg–sex, 9h–18h (BRT)</span>
        </p>
      </section>

      <section className="wrap" aria-label="Canais de atendimento">
        <div className="ch-grid">
          {CHANNELS.map((ch, i) => (
            <article key={ch.k} className="ch rise tilt" style={{ ["--i" as string]: i, ["--c" as string]: ch.c }}>
              <div className="ch-ico">{ch.icon}</div>
              <span className="ch-k">{ch.k}</span>
              <p className="ch-v">{ch.v}</p>
              <div className="ch-acts">
                <a className="pill" href={ch.href} {...(ch.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{ch.cta}</a>
                <CopyButton value={ch.copy} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap form-sec" aria-labelledby="ft">
        <SoccerStrip kind="cones" color="#30D158" />
        <ContactForm />
      </section>
    </div>
  );
};

export default Contact;
