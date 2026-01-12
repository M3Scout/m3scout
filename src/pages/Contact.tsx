import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle, Mail, Phone, Instagram } from "lucide-react";
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
      title: "E-MAIL",
      info: "contato@m3agency.com",
      buttonText: "Enviar e-mail",
      href: "mailto:contato@m3agency.com",
    },
    {
      icon: WhatsAppIcon,
      title: "WHATSAPP",
      info: "(67) 9 9110-6060",
      buttonText: "Chamar no WhatsApp",
      href: "https://wa.me/556791106060",
    },
    {
      icon: Instagram,
      title: "INSTAGRAM",
      info: "@_m3agency",
      buttonText: "Abrir Direct",
      href: "https://ig.me/m/_m3agency",
      fallbackHref: "https://instagram.com/_m3agency",
    },
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0B0B0D] flex items-center justify-center py-16 px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-10 h-10 text-[#e52421]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">Mensagem Enviada!</h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            Obrigado pelo seu contato. Nossa equipe retornará em breve.
          </p>
          <button 
            onClick={() => setIsSubmitted(false)}
            className="text-sm uppercase tracking-widest text-zinc-500 hover:text-white transition-colors border-b border-zinc-700 pb-1"
          >
            Enviar outra mensagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Hero Section */}
      <section className="pt-32 md:pt-40 pb-12 md:pb-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-4">
            CONTATO
          </p>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Entre em{" "}
            <span className="text-[#e52421]">Contato</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Interessado em algum de nossos atletas ou quer saber mais sobre nossos serviços? 
            Escolha a melhor forma de falar conosco.
          </p>
        </div>
      </section>

      {/* Quick Contact Options */}
      <section className="pb-16 md:pb-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-6">
            Escolha a melhor forma
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {quickContacts.map((contact) => (
              <a
                key={contact.title}
                href={contact.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-[#e52421]/30 hover:shadow-[0_0_30px_-10px_rgba(229,36,33,0.3)] hover:-translate-y-1"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-5 group-hover:bg-[#e52421]/10 transition-colors">
                  <contact.icon className="w-5 h-5 text-zinc-400 group-hover:text-[#e52421] transition-colors" />
                </div>
                
                {/* Title */}
                <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-600 mb-2">
                  {contact.title}
                </p>
                
                {/* Info */}
                <p className="text-white font-medium mb-6">
                  {contact.info}
                </p>
                
                {/* Button */}
                <span className="inline-flex items-center justify-center w-full bg-[#e52421] hover:bg-[#c91f1c] text-white text-sm font-semibold py-3 px-6 rounded-lg transition-colors">
                  {contact.buttonText}
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-20 md:pb-28 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="border-t border-zinc-800 pt-12 md:pt-16">
            <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-8">
              Ou envie uma mensagem
            </p>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Nome */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Nome Completo *
                  </Label>
                  <Input
                    id="name"
                    {...register("name")}
                    className="bg-zinc-900 border-zinc-800 rounded-lg px-4 py-3 h-12 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421]"
                    placeholder="Seu nome"
                  />
                  {errors.name && <p className="text-sm text-[#e52421]">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    E-mail *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="bg-zinc-900 border-zinc-800 rounded-lg px-4 py-3 h-12 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421]"
                    placeholder="seu@email.com"
                  />
                  {errors.email && <p className="text-sm text-[#e52421]">{errors.email.message}</p>}
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className="bg-zinc-900 border-zinc-800 rounded-lg px-4 py-3 h-12 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421]"
                    placeholder="+55 (00) 00000-0000"
                  />
                </div>

                {/* Organization */}
                <div className="space-y-2">
                  <Label htmlFor="organization" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Clube / Organização
                  </Label>
                  <Input
                    id="organization"
                    {...register("organization")}
                    className="bg-zinc-900 border-zinc-800 rounded-lg px-4 py-3 h-12 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421]"
                    placeholder="Nome do clube ou empresa"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="subject" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Assunto *
                  </Label>
                  <Input
                    id="subject"
                    {...register("subject")}
                    className="bg-zinc-900 border-zinc-800 rounded-lg px-4 py-3 h-12 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421]"
                    placeholder="Qual o motivo do contato?"
                  />
                  {errors.subject && <p className="text-sm text-[#e52421]">{errors.subject.message}</p>}
                </div>

                {/* Message */}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message" className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    Mensagem *
                  </Label>
                  <Textarea
                    id="message"
                    {...register("message")}
                    className="bg-zinc-900 border-zinc-800 rounded-lg px-4 py-3 text-white placeholder:text-zinc-600 focus-visible:ring-1 focus-visible:ring-[#e52421] focus-visible:border-[#e52421] min-h-[140px] resize-none"
                    placeholder="Escreva sua mensagem..."
                  />
                  {errors.message && <p className="text-sm text-[#e52421]">{errors.message.message}</p>}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-[#e52421] hover:bg-[#c91f1c] text-white rounded-lg px-8 py-6 h-auto text-sm font-semibold uppercase tracking-widest shadow-none"
                >
                  {isSubmitting ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-3" />
                      ENVIAR MENSAGEM
                    </>
                  )}
                </Button>
                
                <p className="text-zinc-600 text-sm">
                  Respondemos todas as mensagens em até 24 horas úteis.
                </p>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Signature Section */}
      <section className="py-16 px-6 border-t border-zinc-900">
        <div className="max-w-[1100px] mx-auto text-center">
          <p className="text-xl md:text-2xl">
            <span className="text-white font-bold">M3 Agency.</span>
            {" "}
            <span className="text-[#e52421]">Conectando talentos.</span>
            {" "}
            <span className="text-white font-bold">Construindo caminhos.</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Contact;
