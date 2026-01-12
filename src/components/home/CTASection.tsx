import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function CTASection() {
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(element);
        }
      },
      { threshold: 0.2 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 bg-black">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        <div className="max-w-4xl">
          {/* Small Label */}
          <div 
            className={cn(
              "mb-8 transition-all duration-700 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            )}
          >
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-white/40">
              Entre em contato
            </span>
          </div>

          {/* Main Headline */}
          <h2 
            className={cn(
              "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-white leading-[1.2] tracking-tight mb-8 transition-all duration-1000 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
            style={{ transitionDelay: "150ms" }}
          >
            Interessado em um de nossos{" "}
            <span 
              className="italic font-normal"
              style={{ color: "#e52421" }}
            >
              atletas
            </span>
            ?
          </h2>

          {/* Divider Line */}
          <div 
            className={cn(
              "w-full h-px bg-white/20 mb-10 transition-all duration-700 ease-out origin-left",
              isInView 
                ? "opacity-100 scale-x-100" 
                : "opacity-0 scale-x-0"
            )}
            style={{ transitionDelay: "400ms" }}
          />

          {/* Body Text */}
          <p 
            className={cn(
              "text-base md:text-lg text-white/50 leading-relaxed max-w-2xl mb-12 transition-all duration-700 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: "550ms" }}
          >
            Entre em contato conosco para saber mais sobre qualquer atleta do nosso 
            portfólio. Teremos prazer em apresentar informações detalhadas e discutir 
            possíveis oportunidades.
          </p>

          {/* Editorial CTAs */}
          <div 
            className={cn(
              "flex flex-col sm:flex-row gap-8 transition-all duration-700 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "700ms" }}
          >
            <Link
              to="/contact"
              className="group inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white hover:text-[#e52421] transition-colors duration-300"
            >
              <span>Falar com a M3</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            
            <Link
              to="/players"
              className="group inline-flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors duration-300"
            >
              <span>Ver Atletas</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
