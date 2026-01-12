import { Newspaper, Calendar, ExternalLink, Image, FileText, Sparkles } from "lucide-react";

const newsItems = [
  {
    id: 1,
    title: "M3 Agency fecha parceria com clubes europeus",
    date: "10 Jan 2026",
    excerpt: "A agência expandiu sua rede de contatos internacionais, firmando parcerias estratégicas com importantes clubes da Europa.",
    category: "Parcerias",
  },
  {
    id: 2,
    title: "Atleta representado pela M3 é convocado para Seleção",
    date: "05 Jan 2026",
    excerpt: "Mais um atleta do nosso elenco recebe convocação para defender as cores da Seleção Brasileira.",
    category: "Atletas",
  },
  {
    id: 3,
    title: "M3 Agency completa 5 anos de atuação no mercado",
    date: "28 Dez 2025",
    excerpt: "Celebramos nossa trajetória de sucesso com mais de 50 transferências realizadas e 150 atletas representados.",
    category: "Institucional",
  },
];

const pressKitItems = [
  {
    id: 1,
    icon: Sparkles,
    title: "Logo M3 Agency",
    description: "Versões oficiais da marca para uso editorial.",
    driveUrl: "https://drive.google.com/drive/folders/YOUR_LOGO_FOLDER_ID",
  },
  {
    id: 2,
    icon: Image,
    title: "Fotos dos Atletas",
    description: "Imagens oficiais para matérias e divulgações.",
    driveUrl: "https://drive.google.com/drive/folders/YOUR_PHOTOS_FOLDER_ID",
  },
  {
    id: 3,
    icon: FileText,
    title: "Release Institucional",
    description: "Textos e informações oficiais sobre a agência.",
    driveUrl: "https://drive.google.com/drive/folders/YOUR_RELEASE_FOLDER_ID",
  },
];

const Imprensa = () => {
  return (
    <div className="min-h-screen bg-[#0B0B0D]">
      {/* Main Container - consistent for all sections */}
      <div className="w-full max-w-[1100px] mx-auto px-6 md:px-8">
        
        {/* Hero Section */}
        <section className="pt-32 pb-12 md:pb-14">
          {/* Eyebrow */}
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-4">
            Imprensa
          </p>
          
          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight mb-5">
            Sala de{" "}
            <span className="text-emerald-400">Imprensa</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl leading-relaxed">
            Acompanhe as últimas notícias e novidades da M3 Agency e de nossos atletas.
          </p>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-800" />

        {/* Press Kit Section */}
        <section className="py-12 md:py-14">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-6">
            Press Kit
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pressKitItems.map((item) => (
              <a
                key={item.id}
                href={item.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 transition-colors">
                  <item.icon className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                </div>
                
                <h3 className="text-white font-medium mb-1">
                  {item.title}
                </h3>
                
                <p className="text-zinc-500 text-sm mb-4">
                  {item.description}
                </p>
                
                <span className="inline-flex items-center gap-2 text-sm text-emerald-400 group-hover:text-emerald-300 transition-colors">
                  Acessar no Drive
                  <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-800" />

        {/* News Section */}
        <section className="py-12 md:py-14">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-6">
            Últimas Notícias
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsItems.map((item) => (
              <article 
                key={item.id} 
                className="group bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{item.date}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px] font-medium uppercase tracking-wide">
                    {item.category}
                  </span>
                </div>
                
                <h3 className="text-white font-medium mb-3 group-hover:text-emerald-400 transition-colors leading-snug">
                  {item.title}
                </h3>
                
                <p className="text-zinc-500 text-sm mb-4 leading-relaxed">
                  {item.excerpt}
                </p>
                
                <a 
                  href="#"
                  className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  Ler mais
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </article>
            ))}
          </div>
        </section>

        {/* Divider */}
        <hr className="border-t border-zinc-800" />

        {/* Press Contact Section */}
        <section className="py-12 md:py-14">
          <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-600 mb-6">
            Contato para Imprensa
          </p>
          
          <div className="max-w-xl">
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Para solicitações de entrevistas, materiais de imprensa ou informações 
              sobre nossos atletas, entre em contato com nossa assessoria.
            </p>
            
            <a 
              href="mailto:imprensa@m3agency.com"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium py-3 px-6 rounded-lg transition-colors"
            >
              Falar com Assessoria
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Signature Section */}
        <section className="pt-12 pb-16 md:pb-20 border-t border-zinc-800">
          <p className="text-xl md:text-2xl">
            <span className="text-white font-bold">M3 Agency.</span>
            {" "}
            <span className="text-emerald-400">Conectando talentos.</span>
            {" "}
            <span className="text-white font-bold">Construindo caminhos.</span>
          </p>
        </section>

      </div>
    </div>
  );
};

export default Imprensa;
