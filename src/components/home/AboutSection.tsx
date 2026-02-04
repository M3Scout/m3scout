import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function AboutSection() {
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
    <section ref={sectionRef} className="py-12 md:py-16 lg:py-20 bg-[#f8f7f4]">
      <div className="container-main">
        <div className="max-w-3xl">
          {/* Editorial Quote - Tighter spacing */}
          <blockquote 
            className={cn(
              "mb-6 md:mb-8 transition-all duration-1000 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
          >
            <p 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl leading-[1.15] tracking-tight"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              <span className="text-neutral-900 font-bold not-italic">"</span>
              <span 
                className="italic font-normal"
                style={{ color: "#e52421" }}
              >Conectando talentos</span>{" "}
              <span className="font-bold not-italic text-neutral-900">ao próximo nível do futebol,</span>{" "}
              <span 
                className="italic font-normal"
                style={{ color: "#e52421" }}
              >hoje.</span>
              <span className="text-neutral-900 font-bold not-italic">"</span>
            </p>
          </blockquote>

          {/* Divider Line - Closer */}
          <div 
            className={cn(
              "w-full h-px bg-neutral-300 mb-6 md:mb-8 transition-all duration-700 ease-out origin-left",
              isInView 
                ? "opacity-100 scale-x-100" 
                : "opacity-0 scale-x-0"
            )}
            style={{ transitionDelay: "300ms" }}
          />

          {/* Body Text - Compact */}
          <div 
            className={cn(
              "max-w-2xl mb-6 md:mb-8 transition-all duration-700 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: "500ms" }}
          >
            <p className="text-sm md:text-base text-neutral-500 leading-relaxed mb-3">
              Na M3 Agency, combinamos scouting e gestão de carreira com uma visão moderna de mercado.
            </p>
            <p className="text-sm md:text-base text-neutral-500 leading-relaxed">
              Trabalhamos com dados, relacionamento com clubes e acompanhamento próximo para acelerar a evolução de cada atleta.
            </p>
          </div>

          {/* Editorial CTA */}
          <Link
            to="/sobre"
            className={cn(
              "group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-900 hover:text-[#e52421] transition-all duration-300",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "700ms" }}
          >
            <span>Saiba Mais</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
