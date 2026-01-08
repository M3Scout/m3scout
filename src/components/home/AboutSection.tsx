import { Target, Eye, Handshake, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Eye,
    title: "Scouting Avançado",
    description: "Análise profissional com métricas detalhadas e relatórios completos sobre cada atleta.",
  },
  {
    icon: Target,
    title: "Identificação de Talentos",
    description: "Mapeamento contínuo de promessas em competições de todos os níveis do futebol.",
  },
  {
    icon: Handshake,
    title: "Relacionamento com Clubes",
    description: "Conexões sólidas com clubes nacionais e internacionais para oportunidades exclusivas.",
  },
  {
    icon: TrendingUp,
    title: "Gestão de Carreira",
    description: "Acompanhamento completo do desenvolvimento e evolução de cada atleta.",
  },
];

export function AboutSection() {
  return (
    <section className="py-20 md:py-32 bg-card/30">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Por que a <span className="gradient-text">M3 Agency</span>?
          </h2>
          <p className="text-lg text-muted-foreground">
            Combinamos expertise em futebol com tecnologia de ponta para 
            oferecer o melhor serviço de scouting e gestão de atletas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="glass-card p-6 animate-scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
