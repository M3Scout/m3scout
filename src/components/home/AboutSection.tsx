import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export function AboutSection() {
  return (
    <section className="py-24 md:py-32 lg:py-40 bg-[#f8f7f4]">
      <div className="mx-auto max-w-6xl px-6 lg:px-8">
        {/* Editorial Quote */}
        <div className="max-w-4xl">
          <blockquote className="mb-12">
            <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-neutral-900 leading-[1.2] tracking-tight">
              "Conectando talentos ao próximo nível do futebol,{" "}
              <span 
                className="italic font-normal"
                style={{ color: "#e52421" }}
              >
                hoje.
              </span>
              "
            </p>
          </blockquote>

          {/* Divider Line */}
          <div className="w-full h-px bg-neutral-300 mb-12" />

          {/* Body Text */}
          <div className="max-w-2xl mb-12">
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
            className="group inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.2em] text-neutral-900 hover:text-[#e52421] transition-colors duration-300"
          >
            <span>Saiba Mais</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
