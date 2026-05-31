import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const RED = "#E5173F";
const CREAM = "#F2EDE4";
const BLACK = "#0A0A0A";
const WHITE_MUTED = "rgba(242,237,228,0.42)";
const CREAM_MUTED = "rgba(15,15,15,0.42)";
const BC = "'Basis Grotesque Pro', sans-serif";
const B = "'Basis Grotesque Pro', sans-serif";

const services = [
  { number: "01", title: "Gestão de Carreira", description: "Planejamento profissional, contratos e decisões de longo prazo." },
  { number: "02", title: "Scouting & Performance", description: "Análise técnica, dados, relatórios e acompanhamento contínuo." },
  { number: "03", title: "Conexão com o Mercado", description: "Relação direta com clubes, projetos e estruturas profissionais." },
];

const Sobre = () => {
  const [activeService, setActiveService] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  const gutter = "clamp(24px, 5.625vw, 72px)";
  const maxW = "1600px";

  return (
    <div style={{ fontFamily: B, backgroundColor: BLACK }}>

      {/* S1 HERO */}
      <section style={{ backgroundColor: BLACK, padding: `clamp(120px, 18vh, 220px) ${gutter} 80px` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          <h1 style={{
            fontFamily: BC,
            fontWeight: 900,
            fontSize: "clamp(58px, 11vw, 152px)",
            lineHeight: 0.88,
            textTransform: "uppercase",
            color: CREAM,
            letterSpacing: "-0.02em",
            margin: "0 0 48px 0",
            wordBreak: "normal",
            overflowWrap: "normal",
            whiteSpace: "normal",
          }}>
            UMA NOVA<br />
            FORMA DE<br />
            <span style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif", fontWeight: 300, fontStyle: "italic", textTransform: "lowercase", color: RED }}>pensar</span>{" "}A<br />
            CARREIRA.
          </h1>

          <p style={{ fontFamily: B, fontWeight: 300, fontSize: 18, lineHeight: 1.7, color: WHITE_MUTED, maxWidth: 480, marginBottom: 40 }}>
            A M3 Agency é uma gestora de carreiras no futebol profissional. Operamos com dados, contexto e visão de mercado para posicionar atletas onde o talento encontra oportunidade real.
          </p>

          <Link to="/contato" style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 14,
            fontFamily: BC,
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: CREAM,
            textDecoration: "none",
          }}>
            <span style={{ display: "inline-block", width: 40, height: 1, backgroundColor: RED, flexShrink: 0 }} />
            FALAR COM A M3
          </Link>
        </div>
      </section>

      {/* S2 MISSÃO */}
      <section style={{ backgroundColor: CREAM, padding: `80px ${gutter}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <p style={{ fontFamily: BC, fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: CREAM_MUTED, marginBottom: 40 }}>
            <span style={{ color: RED }}>// </span>NOSSA MISSÃO
          </p>

          <h2 style={{
            fontFamily: BC,
            fontWeight: 900,
            fontSize: "clamp(38px, 7vw, 108px)",
            lineHeight: 0.9,
            textTransform: "uppercase",
            color: BLACK,
            letterSpacing: "-0.02em",
            margin: 0,
            wordBreak: "normal",
            overflowWrap: "normal",
          }}>
            A M3 ATUA ONDE<br />
            TALENTO ENCONTRA<br />
            <span style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif", fontWeight: 300, fontStyle: "italic", textTransform: "lowercase", color: RED }}>decisão.</span>
          </h2>
        </div>
      </section>

      {/* S3 SERVIÇOS */}
      <section style={{ backgroundColor: CREAM, padding: `0 ${gutter} 80px` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          {services.map((service, index) => (
            <div
              key={service.number}
              onMouseEnter={() => setActiveService(index)}
              onMouseLeave={() => setActiveService(null)}
              style={{
                borderTop: `1px solid ${CREAM_MUTED}`,
                backgroundColor: activeService === index ? "rgba(15,15,15,0.06)" : "transparent",
                transition: "background-color 0.2s ease",
                padding: "22px 0",
              }}
            >
              <div className="grid grid-cols-[60px_1fr] sm:grid-cols-[80px_1fr_1fr] gap-x-4 sm:gap-x-6 items-baseline">
                <span style={{ fontFamily: BC, fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: activeService === index ? RED : CREAM_MUTED, transition: "color 0.2s ease" }}>
                  {service.number}
                </span>
                <h3 style={{ fontFamily: BC, fontWeight: 800, fontSize: "clamp(18px, 2.5vw, 30px)", textTransform: "uppercase", color: BLACK, lineHeight: 1, margin: 0 }}>
                  {service.title}
                </h3>
                <p className="hidden sm:block" style={{ fontFamily: B, fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: CREAM_MUTED, margin: 0 }}>
                  {service.description}
                </p>
              </div>
              <p className="sm:hidden" style={{ fontFamily: B, fontWeight: 300, fontSize: 14, lineHeight: 1.6, color: CREAM_MUTED, margin: "6px 0 0 0", paddingLeft: 60 }}>
                {service.description}
              </p>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${CREAM_MUTED}` }} />
        </div>
      </section>

      {/* S4 QUOTE */}
      <section style={{ backgroundColor: BLACK, padding: `80px ${gutter}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 56 }}>
            <span style={{ display: "inline-block", width: 40, height: 2, backgroundColor: RED, flexShrink: 0 }} />
            <span style={{ fontFamily: BC, fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED }}>
              M3 AGENCY · CAMPO GRANDE · 2024
            </span>
          </div>

          <p style={{ fontFamily: BC, fontWeight: 300, fontSize: "clamp(22px, 4vw, 52px)", lineHeight: 1.15, color: WHITE_MUTED, marginBottom: 8 }}>
            Talento sem direção é ruído.<br />
            Direção sem estratégia é sorte.
          </p>

          <p style={{ fontFamily: BC, fontWeight: 800, fontSize: "clamp(22px, 4vw, 52px)", lineHeight: 1.15, color: CREAM, margin: 0 }}>
            Nós trabalhamos com{" "}
            <span style={{ color: RED }}>os dois.</span>
          </p>
        </div>
      </section>

      {/* S5 DATA STRIP */}
      <section style={{ backgroundColor: BLACK, borderTop: "1px solid rgba(242,237,228,0.1)", padding: `48px ${gutter}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          {[
            { label: "Sede", value: "Campo Grande, MS" },
            { label: "Atuação", value: "Brasil · América do Sul" },
            { label: "Desde", value: "2020" },
          ].map((item) => (
            <div key={item.label}>
              <p style={{ fontFamily: BC, fontWeight: 700, fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, margin: "0 0 8px 0" }}>
                {item.label}
              </p>
              <p style={{ fontFamily: BC, fontWeight: 700, fontSize: "clamp(14px, 2vw, 22px)", textTransform: "uppercase", color: CREAM, lineHeight: 1, margin: 0 }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Sobre;
