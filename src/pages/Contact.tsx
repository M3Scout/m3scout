import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { submitLead } from "@/lib/leads";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  phone: z.string().trim().max(20, "Telefone muito longo").optional(),
  organization: z.string().trim().max(100, "Nome muito longo").optional(),
  subject: z.string().trim().min(1, "Assunto é obrigatório").max(200, "Assunto muito longo"),
  message: z.string().trim().min(1, "Mensagem é obrigatória").max(2000, "Mensagem muito longa"),
});

type ContactFormData = z.infer<typeof contactSchema>;

const RED = "#E5173F";
const CREAM = "#F2EDE4";
const BLACK = "#0A0A0A";
const WHITE_MUTED = "rgba(242,237,228,0.42)";
const CREAM_MUTED = "rgba(15,15,15,0.42)";
const BORDER_DARK = "rgba(242,237,228,0.1)";
const BORDER_CREAM = "rgba(15,15,15,0.1)";
const BC = "'Basis Grotesque Pro', sans-serif";
const B = "'Basis Grotesque Pro', sans-serif";
const JB = "'Basis Grotesque Pro', sans-serif";

const channels = [
  {
    label: "E-MAIL",
    value: "contato@m3agency.com.br",
    cta: "Enviar e-mail",
    href: "mailto:contato@m3agency.com.br",
    external: false,
  },
  {
    label: "WHATSAPP",
    value: "(67) 9 9110-6060",
    cta: "Abrir conversa",
    href: "https://wa.me/556791106060?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20M3%20Agency%20e%20gostaria%20de%20falar%20sobre%E2%80%A6",
    external: true,
  },
  {
    label: "INSTAGRAM",
    value: "@_m3agency",
    cta: "Abrir perfil",
    href: "https://instagram.com/_m3agency",
    external: true,
  },
];

const inputStyle: React.CSSProperties = {
  fontFamily: B,
  fontWeight: 300,
  fontSize: 15,
  color: CREAM,
  backgroundColor: "transparent",
  border: "none",
  outline: "none",
  width: "100%",
  caretColor: RED,
};

const Contact = () => {
  const [searchParams] = useSearchParams();
  const playerSlug = searchParams.get("player");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hoveredChannel, setHoveredChannel] = useState<number | null>(null);
  const [hoveredSubmit, setHoveredSubmit] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      organization: "",
      subject: playerSlug ? `Interesse no atleta: ${playerSlug}` : "",
      message: playerSlug
        ? `Olá, gostaria de receber mais informações sobre o atleta ${playerSlug}.`
        : "",
    },
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      await submitLead({
        name: data.name,
        email: data.email,
        phone: data.phone,
        organization: data.organization,
        subject: data.subject,
        message: data.message,
        playerSlug: playerSlug || undefined,
      });
      setIsSubmitted(true);
      toast.success("Mensagem enviada com sucesso!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erro ao enviar mensagem";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const gutter = "clamp(24px, 5.625vw, 72px)";
  const maxW = "1600px";

  if (isSubmitted) {
    return (
      <div style={{ backgroundColor: BLACK, padding: `136px ${gutter} 80px`, minHeight: "60vh", fontFamily: B }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>
          <h1 style={{
            fontFamily: BC,
            fontWeight: 900,
            fontSize: "clamp(48px, 8vw, 96px)",
            lineHeight: 0.87,
            textTransform: "uppercase",
            color: CREAM,
            letterSpacing: "-0.02em",
            margin: "0 0 32px 0",
            wordBreak: "normal",
            overflowWrap: "normal",
          }}>
            MENSAGEM<br />
            <span style={{ fontWeight: 300, fontStyle: "italic", color: RED }}>enviada.</span>
          </h1>
          <p style={{ fontFamily: B, fontWeight: 300, fontSize: 16, color: WHITE_MUTED, margin: "0 0 40px 0" }}>
            Obrigado pelo seu contato. Nossa equipe retornará em breve.
          </p>
          <button
            onClick={() => setIsSubmitted(false)}
            style={{
              fontFamily: BC,
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: CREAM,
              background: "none",
              border: "none",
              borderBottom: `1px solid ${RED}`,
              paddingBottom: 4,
              cursor: "pointer",
              padding: "0 0 4px 0",
            }}
          >
            ENVIAR OUTRA MENSAGEM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: BLACK, fontFamily: B }}>

      {/* S1 HERO */}
      <section style={{ backgroundColor: BLACK, padding: `clamp(96px, 13vh, 220px) ${gutter} 80px`, borderBottom: `1px solid ${BORDER_DARK}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          <h1 style={{
            fontFamily: BC,
            fontWeight: 900,
            fontSize: "clamp(72px, 10vw, 120px)",
            lineHeight: 0.87,
            textTransform: "uppercase",
            color: CREAM,
            letterSpacing: "-0.02em",
            margin: "0 0 40px 0",
            wordBreak: "normal",
            overflowWrap: "normal",
          }}>
            FALE COM<br />
            <span style={{ fontFamily: BC, fontWeight: 300, fontStyle: "italic", color: RED }}>A M3.</span>
          </h1>

          <p style={{ fontFamily: B, fontWeight: 300, fontSize: 16, lineHeight: 1.7, color: WHITE_MUTED, maxWidth: 480, margin: 0 }}>
            Quer representar um atleta ou falar sobre oportunidades? Escolha o canal ideal ou use o formulário abaixo.
          </p>
        </div>
      </section>

      {/* S2 CANAIS DIRETOS */}
      <section style={{ backgroundColor: CREAM, padding: `72px ${gutter}`, borderBottom: `1px solid ${BORDER_CREAM}` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          {channels.map((ch, index) => (
            <a
              key={ch.label}
              href={ch.href}
              target={ch.external ? "_blank" : undefined}
              rel={ch.external ? "noopener noreferrer" : undefined}
              onMouseEnter={() => setHoveredChannel(index)}
              onMouseLeave={() => setHoveredChannel(null)}
              className="grid grid-cols-1 sm:grid-cols-[1fr_160px] items-center"
              style={{
                gap: 16,
                padding: "24px 0",
                borderBottom: `1px solid ${BORDER_CREAM}`,
                backgroundColor: hoveredChannel === index ? "rgba(15,15,15,0.02)" : "transparent",
                transition: "background-color 0.2s ease",
                textDecoration: "none",
              }}
            >
              <div>
                <p style={{ fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: CREAM_MUTED, margin: "0 0 6px 0" }}>
                  {ch.label}
                </p>
                <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 22, color: BLACK, lineHeight: 1, margin: 0 }}>
                  {ch.value}
                </p>
              </div>
              <div className="sm:text-right">
                <span style={{
                  fontFamily: BC,
                  fontWeight: 700,
                  fontSize: 13,
                  letterSpacing: "0.05em",
                  color: BLACK,
                  borderBottom: `1px solid ${RED}`,
                  paddingBottom: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: hoveredChannel === index ? 14 : 8,
                  transition: "gap 0.2s ease",
                }}>
                  {ch.cta} →
                </span>
              </div>
            </a>
          ))}

          <p style={{ fontFamily: JB, fontSize: 10, letterSpacing: "0.1em", color: CREAM_MUTED, margin: "20px 0 0 0" }}>
            Atendimento: seg–sex, 9h–18h (BRT)
          </p>
        </div>
      </section>

      {/* S3 FORMULÁRIO */}
      <section style={{ backgroundColor: BLACK, padding: `72px ${gutter} 80px` }}>
        <div style={{ maxWidth: maxW, margin: "0 auto" }}>


          <form onSubmit={handleSubmit(onSubmit)}>
            <div
              className="grid grid-cols-1 md:grid-cols-2"
              style={{ gap: 1, backgroundColor: BORDER_DARK, border: `1px solid ${BORDER_DARK}`, marginBottom: 32 }}
            >
              {/* Nome */}
              <div style={{ backgroundColor: BLACK, padding: "20px 24px" }}>
                <label style={{ display: "block", fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, marginBottom: 10 }}>
                  NOME <span style={{ color: RED }}>*</span>
                </label>
                <input
                  {...register("name")}
                  placeholder="Seu nome"
                  className="m3-form-input"
                  style={inputStyle}
                />
                {errors.name && <p style={{ fontFamily: JB, fontSize: 9, color: RED, margin: "8px 0 0 0" }}>{errors.name.message}</p>}
              </div>

              {/* E-mail */}
              <div style={{ backgroundColor: BLACK, padding: "20px 24px" }}>
                <label style={{ display: "block", fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, marginBottom: 10 }}>
                  E-MAIL <span style={{ color: RED }}>*</span>
                </label>
                <input
                  type="email"
                  {...register("email")}
                  placeholder="seu@email.com"
                  className="m3-form-input"
                  style={inputStyle}
                />
                {errors.email && <p style={{ fontFamily: JB, fontSize: 9, color: RED, margin: "8px 0 0 0" }}>{errors.email.message}</p>}
              </div>

              {/* Telefone */}
              <div style={{ backgroundColor: BLACK, padding: "20px 24px" }}>
                <label style={{ display: "block", fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, marginBottom: 10 }}>
                  TELEFONE
                </label>
                <input
                  type="tel"
                  {...register("phone")}
                  placeholder="+55 (00) 00000-0000"
                  className="m3-form-input"
                  style={inputStyle}
                />
              </div>

              {/* Clube / Organização */}
              <div style={{ backgroundColor: BLACK, padding: "20px 24px" }}>
                <label style={{ display: "block", fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, marginBottom: 10 }}>
                  CLUBE / ORGANIZAÇÃO
                </label>
                <input
                  {...register("organization")}
                  placeholder="Nome do clube ou empresa"
                  className="m3-form-input"
                  style={inputStyle}
                />
              </div>

              {/* Assunto */}
              <div className="md:col-span-2" style={{ backgroundColor: BLACK, padding: "20px 24px" }}>
                <label style={{ display: "block", fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, marginBottom: 10 }}>
                  ASSUNTO <span style={{ color: RED }}>*</span>
                </label>
                <input
                  {...register("subject")}
                  placeholder="Qual o motivo do contato?"
                  className="m3-form-input"
                  style={inputStyle}
                />
                {errors.subject && <p style={{ fontFamily: JB, fontSize: 9, color: RED, margin: "8px 0 0 0" }}>{errors.subject.message}</p>}
              </div>

              {/* Mensagem */}
              <div className="md:col-span-2" style={{ backgroundColor: BLACK, padding: "20px 24px" }}>
                <label style={{ display: "block", fontFamily: JB, fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: WHITE_MUTED, marginBottom: 10 }}>
                  MENSAGEM <span style={{ color: RED }}>*</span>
                </label>
                <textarea
                  {...register("message")}
                  placeholder="Escreva sua mensagem..."
                  rows={5}
                  className="m3-form-input"
                  style={{ ...inputStyle, resize: "none", display: "block" }}
                />
                {errors.message && <p style={{ fontFamily: JB, fontSize: 9, color: RED, margin: "8px 0 0 0" }}>{errors.message.message}</p>}
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              onMouseEnter={() => !isSubmitting && setHoveredSubmit(true)}
              onMouseLeave={() => setHoveredSubmit(false)}
              style={{
                fontFamily: BC,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                backgroundColor: RED,
                color: "#fff",
                border: "none",
                padding: "12px 28px",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: hoveredSubmit && !isSubmitting ? 18 : 12,
                transition: "gap 0.2s ease, opacity 0.2s ease",
              }}
            >
              {isSubmitting ? "ENVIANDO..." : "ENVIAR MENSAGEM →"}
            </button>
          </form>
        </div>
      </section>

    </div>
  );
};

export default Contact;
