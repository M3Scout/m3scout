import { useEffect, useState } from "react";

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
    <div style={{ fontFamily: B }} className="min-h-screen bg-[#F2EDE4] md:bg-[#0A0A0A]">



      {/* S1 HERO */}
      <section style={{ backgroundColor: BLACK, padding: `136px ${gutter} 80px` }} className="hidden md:block">
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          <h1 className="hidden md:block" style={{
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
            <span style={{ fontFamily: "'Instrument Serif', 'Times New Roman', serif", fontWeight: 300, fontStyle: "italic", textTransform: "lowercase", color: RED, position: "relative", top: "-0.12em" }}>pensar</span>{" "}A<br />
            CARREIRA.
          </h1>

        </div>
      </section>

      {/* S2 MISSÃO */}
      <section style={{ backgroundColor: CREAM, padding: `80px ${gutter}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <p className="hidden sm:block" style={{ fontFamily: BC, fontWeight: 700, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: CREAM_MUTED, marginBottom: 40 }}>
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
                <div>
                  <h3 style={{ fontFamily: BC, fontWeight: 800, fontSize: "clamp(18px, 2.5vw, 30px)", textTransform: "uppercase", color: BLACK, lineHeight: 1, margin: 0 }}>
                    {service.title}
                  </h3>
                  <p className="sm:hidden" style={{ fontFamily: B, fontWeight: 300, fontSize: 14, lineHeight: 1.6, color: CREAM_MUTED, margin: "6px 0 0 0" }}>
                    {service.description}
                  </p>
                </div>
                <p className="hidden sm:block" style={{ fontFamily: B, fontWeight: 300, fontSize: 15, lineHeight: 1.6, color: CREAM_MUTED, margin: 0 }}>
                  {service.description}
                </p>
              </div>
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${CREAM_MUTED}` }} />
        </div>
      </section>


      {/* Mobile spacer — keeps CREAM background above bottom nav */}
      <div className="md:hidden" style={{ backgroundColor: CREAM, height: 80 }} />

    </div>
  );
};

export default Sobre;
