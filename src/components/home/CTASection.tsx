import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";

export function CTASection() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-background to-accent/5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="glass-card p-8 md:p-12 lg:p-16 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
            <MessageCircle className="w-8 h-8 text-primary" />
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
            Interessado em um de nossos{" "}
            <span className="gradient-text">atletas</span>?
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Entre em contato conosco para saber mais sobre qualquer atleta do nosso 
            portfólio. Teremos prazer em apresentar informações detalhadas e discutir 
            possíveis oportunidades.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button variant="hero" size="lg">
                Falar com a M3
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/players">
              <Button variant="heroOutline" size="lg">
                Ver Atletas
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
