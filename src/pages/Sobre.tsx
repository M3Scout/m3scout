const Sobre = () => {
  return (
    <div className="min-h-screen bg-[#f8f6f3]">
      {/* Main Container - consistent for all sections */}
      <div className="w-full max-w-[1100px] mx-auto px-6 md:px-8">
        
        {/* Hero Section */}
        <section className="pt-32 pb-14 md:pb-18">
          {/* Eyebrow */}
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">
            Sobre
          </p>
          
          {/* Title */}
          <h1 className="font-serif text-[clamp(2.25rem,5vw,3.5rem)] text-zinc-900 leading-[1.1] mb-[18px]">
            Sobre a{" "}
            <span className="text-[#e52421] italic">M3 Agency</span>
          </h1>
          
          {/* Subtitle */}
          <p className="font-gotham text-lg md:text-xl text-zinc-600 max-w-2xl leading-relaxed">
            Gestão esportiva, marketing e desenvolvimento de talentos.
          </p>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-300" />

        {/* Manifesto Quote Section */}
        <section className="py-14 md:py-18">
          <blockquote className="font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.25]">
            <span className="text-black">"</span>
            <span className="text-[#e52421] italic">Conectando talentos.</span>
            {" "}
            <span className="text-black font-bold">Construindo caminhos.</span>
            <span className="text-black">"</span>
          </blockquote>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-300" />

        {/* Main Content Section */}
        <section className="py-14 md:py-18">
          {/* Reading column - aligned to left edge of container */}
          <div className="max-w-[780px] space-y-[20px]">
            <p className="font-gotham text-zinc-700 text-base md:text-[17px] leading-[1.65]">
              A M3 Agency é uma agência de gestão esportiva, marketing e desenvolvimento de talentos, criada para conectar potencial, performance e oportunidade dentro e fora de campo.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-[17px] leading-[1.65]">
              Nascemos com o propósito de estruturar carreiras, fortalecer clubes e valorizar atletas por meio de uma gestão estratégica, profissional e transparente. Atuamos de forma completa, indo além da intermediação tradicional, acompanhando cada etapa do processo esportivo com visão de longo prazo.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-[17px] leading-[1.65]">
              Trabalhamos com gestão de atletas, planejamento de carreira, scouting, marketing esportivo, reposicionamento de marcas, projetos institucionais e estruturação de clubes, sempre com foco em crescimento sustentável, visibilidade e resultados reais.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-[17px] leading-[1.65]">
              Acreditamos que talento precisa de direção, estratégia e suporte. Por isso, unimos análise técnica, dados, mercado e posicionamento de imagem para criar oportunidades sólidas e coerentes com o perfil de cada atleta e projeto.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-[17px] leading-[1.65]">
              A M3 Agency atua como parceira — conectando talentos ao mercado, clubes a oportunidades e projetos a resultados, com profissionalismo, ética e visão moderna do futebol e do esporte como negócio.
            </p>
          </div>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-300" />

        {/* Final Signature Section */}
        <section className="pt-14 pb-18 md:pt-14 md:pb-[72px]">
          <p className="font-serif text-xl md:text-2xl leading-snug">
            <span className="text-zinc-900 font-bold">M3 Agency.</span>
            {" "}
            <span className="text-[#e52421] italic">Conectando talentos.</span>
            {" "}
            <span className="text-zinc-900 font-bold">Construindo caminhos.</span>
          </p>
        </section>

      </div>
    </div>
  );
};

export default Sobre;
