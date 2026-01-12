import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Send, CheckCircle } from "lucide-react";
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

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#f8f6f3] flex items-center justify-center py-16 px-6">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 border border-zinc-300 flex items-center justify-center mx-auto mb-8">
            <CheckCircle className="w-8 h-8 text-[#e52421]" />
          </div>
          <h1 className="font-serif text-3xl text-zinc-900 mb-4">Mensagem Enviada!</h1>
          <p className="font-gotham text-zinc-600 mb-8">
            Obrigado pelo seu contato. Nossa equipe retornará em breve.
          </p>
          <button 
            onClick={() => setIsSubmitted(false)}
            className="font-gotham text-sm uppercase tracking-widest text-zinc-600 hover:text-zinc-900 transition-colors border-b border-zinc-400 pb-1"
          >
            Enviar outra mensagem
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f6f3]">
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Eyebrow */}
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-6">
            Contato
          </p>
          
          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-zinc-900 leading-tight mb-6">
            Entre em{" "}
            <span className="text-[#e52421] italic">Contato</span>
          </h1>
          
          {/* Subtitle */}
          <p className="font-gotham text-lg md:text-xl text-zinc-600 max-w-2xl">
            Interessado em algum de nossos atletas ou quer saber mais sobre nossos serviços? 
            Preencha o formulário abaixo.
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-24 px-6">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid lg:grid-cols-3 gap-16">
            {/* Contact Info */}
            <div className="lg:col-span-1">
              <div className="border-t border-zinc-300 pt-8">
                <h2 className="font-serif text-xl text-zinc-900 mb-8">Informações</h2>
                
                <div className="space-y-8">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">E-mail</p>
                    <p className="font-gotham text-zinc-900">contato@m3agency.com</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Telefone</p>
                    <p className="font-gotham text-zinc-900">+55 (11) 99999-9999</p>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">Endereço</p>
                    <p className="font-gotham text-zinc-900">São Paulo, SP — Brasil</p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-zinc-200">
                  <p className="font-gotham text-sm text-zinc-500 leading-relaxed">
                    Respondemos todas as mensagens em até 24 horas úteis.
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="border-t border-zinc-300 pt-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-xs uppercase tracking-widest text-zinc-500">
                        Nome Completo *
                      </Label>
                      <Input
                        id="name"
                        {...register("name")}
                        className="bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 py-3 font-gotham text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900"
                        placeholder="Seu nome"
                      />
                      {errors.name && <p className="text-sm text-[#e52421] italic">{errors.name.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-xs uppercase tracking-widest text-zinc-500">
                        E-mail *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        {...register("email")}
                        className="bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 py-3 font-gotham text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900"
                        placeholder="seu@email.com"
                      />
                      {errors.email && <p className="text-sm text-[#e52421] italic">{errors.email.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs uppercase tracking-widest text-zinc-500">
                        Telefone
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        {...register("phone")}
                        className="bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 py-3 font-gotham text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900"
                        placeholder="+55 (00) 00000-0000"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-xs uppercase tracking-widest text-zinc-500">
                        Clube / Organização
                      </Label>
                      <Input
                        id="organization"
                        {...register("organization")}
                        className="bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 py-3 font-gotham text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900"
                        placeholder="Nome do clube ou empresa"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="subject" className="text-xs uppercase tracking-widest text-zinc-500">
                        Assunto *
                      </Label>
                      <Input
                        id="subject"
                        {...register("subject")}
                        className="bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 py-3 font-gotham text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900"
                        placeholder="Qual o motivo do contato?"
                      />
                      {errors.subject && <p className="text-sm text-[#e52421] italic">{errors.subject.message}</p>}
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="message" className="text-xs uppercase tracking-widest text-zinc-500">
                        Mensagem *
                      </Label>
                      <Textarea
                        id="message"
                        {...register("message")}
                        className="bg-transparent border-0 border-b border-zinc-300 rounded-none px-0 py-3 font-gotham text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-0 focus-visible:border-zinc-900 min-h-[120px] resize-none"
                        placeholder="Escreva sua mensagem..."
                      />
                      {errors.message && <p className="text-sm text-[#e52421] italic">{errors.message.message}</p>}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="bg-zinc-900 hover:bg-zinc-800 text-white rounded-none px-8 py-6 font-gotham text-sm uppercase tracking-widest"
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-3" />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Section */}
      <section className="py-16 px-6 border-t border-zinc-200">
        <div className="max-w-[1100px] mx-auto text-center">
          <p className="font-serif text-xl md:text-2xl">
            <span className="text-zinc-900 font-bold">M3 Agency.</span>
            {" "}
            <span className="text-[#e52421] italic">Conectando talentos.</span>
            {" "}
            <span className="text-zinc-900 font-bold">Construindo caminhos.</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Contact;
