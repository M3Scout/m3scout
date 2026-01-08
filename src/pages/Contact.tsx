import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  CheckCircle,
  MessageCircle
} from "lucide-react";
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
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar mensagem");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center py-16">
        <div className="glass-card p-8 md:p-12 text-center max-w-md mx-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Mensagem Enviada!</h1>
          <p className="text-muted-foreground mb-6">
            Obrigado pelo seu contato. Nossa equipe retornará em breve.
          </p>
          <Button onClick={() => setIsSubmitted(false)} variant="outline">
            Enviar outra mensagem
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Entre em <span className="gradient-text">Contato</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Interessado em algum de nossos atletas ou quer saber mais sobre nossos serviços? 
            Preencha o formulário abaixo e nossa equipe retornará em breve.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Contact Info */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6 space-y-6">
              <h2 className="text-lg font-semibold">Informações de Contato</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-medium">contato@m3agency.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">+55 (11) 99999-9999</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Endereço</p>
                    <p className="font-medium">São Paulo, SP - Brasil</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Respondemos todas as mensagens em até 24 horas úteis.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 md:p-8">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    className="input-dark"
                    placeholder="Seu nome"
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="input-dark"
                    placeholder="seu@email.com"
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register("phone")}
                    className="input-dark"
                    placeholder="+55 (00) 00000-0000"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="organization">Clube / Organização</Label>
                  <Input
                    id="organization"
                    {...register("organization")}
                    className="input-dark"
                    placeholder="Nome do clube ou empresa"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="subject">Assunto *</Label>
                  <Input
                    id="subject"
                    {...register("subject")}
                    className="input-dark"
                    placeholder="Qual o motivo do contato?"
                  />
                  {errors.subject && <p className="text-sm text-destructive">{errors.subject.message}</p>}
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message">Mensagem *</Label>
                  <Textarea
                    id="message"
                    {...register("message")}
                    className="input-dark min-h-[150px]"
                    placeholder="Escreva sua mensagem..."
                  />
                  {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
                </div>
              </div>

              <Button 
                type="submit" 
                variant="hero" 
                size="lg" 
                className="w-full mt-6"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
