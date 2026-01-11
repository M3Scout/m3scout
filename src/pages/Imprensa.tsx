import { Newspaper, Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

const Imprensa = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
              <Newspaper className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Sala de <span className="text-primary">Imprensa</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Acompanhe as últimas notícias e novidades da M3 Agency e de nossos atletas.
            </p>
          </div>
        </div>
      </section>

      {/* News Grid */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {newsItems.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Calendar className="w-4 h-4" />
                    <span>{item.date}</span>
                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                      {item.category}
                    </span>
                  </div>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{item.excerpt}</p>
                  <Button variant="outline" size="sm" className="gap-2">
                    Ler mais
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Press Contact */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Contato para Imprensa</h2>
            <p className="text-muted-foreground mb-6">
              Para solicitações de entrevistas, materiais de imprensa ou informações 
              sobre nossos atletas, entre em contato com nossa assessoria.
            </p>
            <Button size="lg" className="gap-2">
              Falar com Assessoria
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Imprensa;
