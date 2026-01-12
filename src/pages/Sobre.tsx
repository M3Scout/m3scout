const Sobre = () => {
  return (
    <div className="min-h-screen bg-[#f8f6f3]">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-[1100px] mx-auto">
          {/* Eyebrow */}
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-6">
            Sobre
          </p>
          
          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-zinc-900 leading-tight mb-6">
            Sobre a{" "}
            <span className="text-[#e52421] italic">M3 Agency</span>
          </h1>
          
          {/* Subtitle */}
          <p className="font-gotham text-lg md:text-xl text-zinc-600 max-w-2xl">
            Gestão esportiva, marketing e desenvolvimento de talentos.
          </p>
        </div>
      </section>

      {/* Manifesto Quote Section */}
      <section className="py-20 px-6 border-t border-zinc-200">
        <div className="max-w-[1100px] mx-auto">
          <blockquote className="font-serif text-3xl md:text-4xl lg:text-5xl leading-snug">
            <span className="text-black">"</span>
            <span className="text-[#e52421] italic">Conectando talentos.</span>
            {" "}
            <span className="text-black font-bold">Construindo caminhos.</span>
            <span className="text-black">"</span>
          </blockquote>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-20 px-6 border-t border-zinc-200">
        <div className="max-w-[1100px] mx-auto">
          <div className="max-w-3xl space-y-8">
            <p className="font-gotham text-zinc-700 text-base md:text-lg leading-relaxed">
              A M3 Agency é uma agência de gestão esportiva, marketing e desenvolvimento de talentos, criada para conectar potencial, performance e oportunidade dentro e fora de campo.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-lg leading-relaxed">
              Nascemos com o propósito de estruturar carreiras, fortalecer clubes e valorizar atletas por meio de uma gestão estratégica, profissional e transparente. Atuamos de forma completa, indo além da intermediação tradicional, acompanhando cada etapa do processo esportivo com visão de longo prazo.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-lg leading-relaxed">
              Trabalhamos com gestão de atletas, planejamento de carreira, scouting, marketing esportivo, reposicionamento de marcas, projetos institucionais e estruturação de clubes, sempre com foco em crescimento sustentável, visibilidade e resultados reais.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-lg leading-relaxed">
              Acreditamos que talento precisa de direção, estratégia e suporte. Por isso, unimos análise técnica, dados, mercado e posicionamento de imagem para criar oportunidades sólidas e coerentes com o perfil de cada atleta e projeto.
            </p>

            <p className="font-gotham text-zinc-700 text-base md:text-lg leading-relaxed">
              A M3 Agency atua como parceira — conectando talentos ao mercado, clubes a oportunidades e projetos a resultados, com profissionalismo, ética e visão moderna do futebol e do esporte como negócio.
            </p>
          </div>
        </div>
      </section>

      {/* Final Signature Section */}
      <section className="py-24 px-6 border-t border-zinc-200">
        <div className="max-w-[1100px] mx-auto text-center">
          <p className="font-serif text-2xl md:text-3xl lg:text-4xl">
            <span className="text-black font-bold">M3 Agency.</span>
            {" "}
            <span className="text-[#e52421] italic">Conectando talentos.</span>
            {" "}
            <span className="text-black font-bold">Construindo caminhos.</span>
          </p>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
