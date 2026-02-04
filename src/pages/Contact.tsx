import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle, Mail, Instagram, ArrowUpRight, Clock } from "lucide-react";
import { toast } from "sonner";
import { submitLead } from "@/lib/leads";

// Validation schema
const contactSchema = z.object({
  name: z.string().trim().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  email: z.string().trim().email("E-mail inválido").max(255, "E-mail muito longo"),
  phone: z.string().trim().max(20, "Telefone muito longo").optional(),
  organization: z.string().trim().max(100, "Nome muito longo").optional(),
  subject: z.string().trim().min(1, "Assunto é obrigatório").max(200, "Assunto muito longo"),
  message: z.string().trim().min(1, "Mensagem é obrigatória").max(2000, "Mensagem muito longa"),
});

type ContactFormData = z.infer<typeof contactSchema>;

// WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const Contact = () => {
  const [searchParams] = useSearchParams();
  const playerSlug = searchParams.get("player");
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const channelsRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  
  const channelsInView = useInView(channelsRef, { once: true, margin: "-80px" });
  const formInView = useInView(formRef, { once: true, margin: "-80px" });

  // Fix scroll bug - always start at top
  useEffect(() => {
    window.scrollTo(0, 0);
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
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

  // Quick contact options
  const quickContacts = [
    {
      icon: Mail,
      label: "E-MAIL",
      value: "contato@m3scout.com",
      cta: "Enviar e-mail",
      href: "mailto:contato@m3scout.com",
      external: false,
      accent: "#e52421",
    },
    {
      icon: WhatsAppIcon,
      label: "WHATSAPP",
      value: "(67) 9 9110-6060",
      cta: "Abrir conversa",
      href: "https://wa.me/556791106060?text=Ol%C3%A1!%20Vim%20pelo%20site%20da%20M3%20Agency%20e%20gostaria%20de%20falar%20sobre%E2%80%A6",
      external: true,
      accent: "#22c55e",
    },
    {
      icon: Instagram,
      label: "INSTAGRAM",
      value: "@_m3agency",
      cta: "Abrir perfil",
      href: "https://instagram.com/_m3agency",
      external: true,
      accent: "#f59e0b",
    },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center py-16 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-[#e52421]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white mb-3">Mensagem Enviada</h1>
          <p className="text-neutral-400 mb-8 leading-relaxed text-sm">
            Obrigado pelo seu contato. Nossa equipe retornará em breve.
          </p>
          <button 
            onClick={() => setIsSubmitted(false)}
            className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-white transition-colors group"
          >
            <span className="relative">
              Enviar outra mensagem
              <span className="absolute left-0 bottom-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
            </span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]" style={{ fontFamily: "'Poppins', sans-serif" }}>
      
      {/* Subtle grain texture */}
      <div 
        className="fixed inset-0 opacity-[0.015] pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* HERO SECTION - Compact */}
      <section className="relative pt-24 pb-6 md:pt-28 md:pb-8">
        <div className="relative z-10 mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-[#e52421]/30 bg-[#e52421]/5 text-[9px] uppercase tracking-[0.2em] text-[#e52421] font-medium">
              <span className="w-1 h-1 rounded-full bg-[#e52421]" />
              Contato
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white mb-3"
          >
            Fale com a{" "}
            <span className="text-[#e52421]">M3</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-base md:text-lg text-neutral-400 font-light max-w-lg leading-relaxed"
          >
            Quer representar um atleta ou falar sobre oportunidades? Escolha o canal ideal.
          </motion.p>

          {/* Subtle divider */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-6 w-16 h-px bg-gradient-to-r from-[#e52421]/60 to-transparent origin-left"
          />
        </div>
      </section>

      {/* CHANNELS SECTION - Compact */}
      <section className="py-6 md:py-8">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Section Header */}
          <motion.div 
            ref={channelsRef}
            initial={{ opacity: 0 }}
            animate={channelsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 mb-4"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#e52421]" />
            <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-semibold">
              Canais diretos
            </p>
          </motion.div>

          {/* Channels Grid - Tighter */}
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
            initial="hidden"
            animate={channelsInView ? "visible" : "hidden"}
            variants={{
              hidden: {},
              visible: {
                transition: {
                  staggerChildren: 0.12,
                  delayChildren: 0.1
                }
              }
            }}
          >
            {quickContacts.map((contact) => (
              <motion.a
                key={contact.label}
                href={contact.href}
                target={contact.external ? "_blank" : undefined}
                rel={contact.external ? "noopener noreferrer" : undefined}
                variants={{
                  hidden: { opacity: 0, y: 25, scale: 0.96 },
                  visible: { 
                    opacity: 1, 
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 100,
                      damping: 15
                    }
                  }
                }}
                className="group relative block rounded-xl bg-neutral-800/60 border border-neutral-700/50 transition-all duration-300 hover:border-neutral-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 overflow-hidden"
                style={{
                  boxShadow: `0 0 0 0 ${contact.accent}00`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = `0 8px 32px -8px ${contact.accent}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = `0 0 0 0 ${contact.accent}00`;
                }}
              >
                {/* Accent Top Bar */}
                <div 
                  className="h-1 w-full"
                  style={{ background: `linear-gradient(90deg, ${contact.accent}, ${contact.accent}80)` }}
                />
                
                <div className="p-5">
                  {/* Icon with accent glow */}
                  <motion.div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300"
                    style={{ 
                      background: `linear-gradient(135deg, ${contact.accent}20, ${contact.accent}10)`,
                      border: `1px solid ${contact.accent}30`,
                    }}
                    variants={{
                      hidden: { scale: 0.5, opacity: 0 },
                      visible: { 
                        scale: 1, 
                        opacity: 1,
                        transition: { delay: 0.1, type: "spring", stiffness: 200 }
                      }
                    }}
                  >
                    <contact.icon 
                      className="w-5 h-5 transition-colors duration-300" 
                      style={{ color: contact.accent }}
                    />
                  </motion.div>
                  
                  {/* Label */}
                  <p className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 mb-1">
                    {contact.label}
                  </p>
                  
                  {/* Value */}
                  <p className="text-lg font-bold text-white mb-4">
                    {contact.value}
                  </p>
                  
                  {/* CTA with accent color */}
                  <span 
                    className="inline-flex items-center gap-2 text-sm font-semibold group-hover:gap-3 transition-all duration-300"
                    style={{ color: contact.accent }}
                  >
                    <span className="relative">
                      {contact.cta}
                      <span 
                        className="absolute left-0 bottom-0 w-0 h-0.5 group-hover:w-full transition-all duration-300"
                        style={{ background: contact.accent }}
                      />
                    </span>
                    <ArrowUpRight className="w-4 h-4" />
                  </span>
                </div>
              </motion.a>
            ))}
          </motion.div>

          {/* Operating hours */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={channelsInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-5 flex items-center gap-1.5 text-neutral-600 text-xs"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Atendimento: seg–sex, 9h–18h (BRT)</span>
          </motion.div>
        </div>
      </section>

      {/* FORM SECTION - Compact */}
      <section className="py-8 md:py-10 lg:py-12 bg-[#0d0d0d]">
        <div className="mx-auto max-w-[1200px] px-6 md:px-12 lg:px-16">
          
          {/* Section Header */}
          <motion.div 
            ref={formRef}
            initial={{ opacity: 0 }}
            animate={formInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#e52421]" />
              <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-semibold">
                Envie uma mensagem
              </p>
            </div>
            <p className="text-neutral-600 text-xs font-light">
              Preencha o formulário e retornaremos em até 24 horas úteis.
            </p>
          </motion.div>

          {/* Form */}
          <motion.form 
            onSubmit={handleSubmit(onSubmit)} 
            initial={{ opacity: 0, y: 20 }}
            animate={formInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                  Nome Completo *
                </Label>
                <Input
                  id="name"
                  {...register("name")}
                  className="bg-neutral-900/60 border-neutral-800 rounded-lg px-3 py-2.5 h-10 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] transition-colors"
                  placeholder="Seu nome"
                />
                {errors.name && <p className="text-[10px] text-[#e52421]">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                  E-mail *
                </Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="bg-neutral-900/60 border-neutral-800 rounded-lg px-3 py-2.5 h-10 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] transition-colors"
                  placeholder="seu@email.com"
                />
                {errors.email && <p className="text-[10px] text-[#e52421]">{errors.email.message}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                  Telefone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  className="bg-neutral-900/60 border-neutral-800 rounded-lg px-3 py-2.5 h-10 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] transition-colors"
                  placeholder="+55 (00) 00000-0000"
                />
              </div>

              {/* Organization */}
              <div className="space-y-1.5">
                <Label htmlFor="organization" className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                  Clube / Organização
                </Label>
                <Input
                  id="organization"
                  {...register("organization")}
                  className="bg-neutral-900/60 border-neutral-800 rounded-lg px-3 py-2.5 h-10 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] transition-colors"
                  placeholder="Nome do clube ou empresa"
                />
              </div>

              {/* Subject */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="subject" className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                  Assunto *
                </Label>
                <Input
                  id="subject"
                  {...register("subject")}
                  className="bg-neutral-900/60 border-neutral-800 rounded-lg px-3 py-2.5 h-10 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] transition-colors"
                  placeholder="Qual o motivo do contato?"
                />
                {errors.subject && <p className="text-[10px] text-[#e52421]">{errors.subject.message}</p>}
              </div>

              {/* Message */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="message" className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-medium">
                  Mensagem *
                </Label>
                <Textarea
                  id="message"
                  {...register("message")}
                  className="bg-neutral-900/60 border-neutral-800 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-neutral-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] min-h-[100px] resize-none transition-colors"
                  placeholder="Escreva sua mensagem..."
                />
                {errors.message && <p className="text-[10px] text-[#e52421]">{errors.message.message}</p>}
              </div>
            </div>

            <div className="pt-1">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="bg-[#e52421] hover:bg-[#c91f1c] text-white rounded-lg px-5 py-2.5 h-10 text-xs font-semibold tracking-wide shadow-none transition-all duration-300 hover:shadow-lg hover:shadow-[#e52421]/20"
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-2" />
                    Enviar mensagem
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        </div>
      </section>
    </div>
  );
};

export default Contact;
