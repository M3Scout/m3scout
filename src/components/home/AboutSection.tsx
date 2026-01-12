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
    <section ref={sectionRef} className="py-24 md:py-32 lg:py-40 bg-[#f8f7f4]">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* Editorial Quote */}
        <div className="max-w-4xl">
          <blockquote 
            className={cn(
              "mb-12 transition-all duration-1000 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-8"
            )}
          >
            <p 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.2] tracking-tight"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              "<span 
                className="italic font-normal"
                style={{ color: "#e52421" }}
              >Conectando talentos</span>{" "}
              <span className="font-bold not-italic text-neutral-900">ao próximo nível do futebol,</span>{" "}
              <span 
                className="italic font-normal"
                style={{ color: "#e52421" }}
              >hoje.</span>"
            </p>
          </blockquote>

          {/* Divider Line */}
          <div 
            className={cn(
              "w-full h-px bg-neutral-300 mb-12 transition-all duration-700 ease-out origin-left",
              isInView 
                ? "opacity-100 scale-x-100" 
                : "opacity-0 scale-x-0"
            )}
            style={{ transitionDelay: "300ms" }}
          />

          {/* Body Text */}
          <div 
            className={cn(
              "max-w-2xl mb-12 transition-all duration-700 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-6"
            )}
            style={{ transitionDelay: "500ms" }}
          >
            <p className="text-base md:text-lg text-neutral-600 leading-relaxed mb-6">
              Na M3 Agency, combinamos scouting e gestão de carreira com uma visão moderna de mercado.
            </p>
            <p className="text-base md:text-lg text-neutral-600 leading-relaxed">
              Trabalhamos com dados, relacionamento com clubes e acompanhamento próximo para acelerar a evolução de cada atleta.
            </p>
          </div>

          {/* Editorial CTA */}
          <Link
            to="/sobre"
            className={cn(
              "group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-neutral-900 hover:text-[#e52421] transition-all duration-500 ease-out",
              isInView 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-4"
            )}
            style={{ transitionDelay: "700ms" }}
          >
            <span>Saiba Mais</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
