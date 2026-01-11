import { Shield, Target, Users, Award } from "lucide-react";

const Sobre = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Sobre a <span className="text-primary">M3 Agency</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Somos uma agência de gestão de atletas profissionais, focada em 
              desenvolver carreiras e conectar talentos aos maiores clubes do mundo.
            </p>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Integridade</h3>
              <p className="text-muted-foreground">
                Atuamos com transparência e ética em todas as negociações.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Foco</h3>
              <p className="text-muted-foreground">
                Dedicação total ao desenvolvimento da carreira de cada atleta.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Relacionamento</h3>
              <p className="text-muted-foreground">
                Conexões globais com os principais clubes e dirigentes.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Award className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Excelência</h3>
              <p className="text-muted-foreground">
                Busca constante pelos melhores resultados para nossos atletas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12">
              <div>
                <h2 className="text-3xl font-bold mb-4">Nossa Missão</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Potencializar carreiras de atletas profissionais através de gestão 
                  estratégica, assessoria completa e conexões globais, sempre priorizando 
                  o bem-estar e o desenvolvimento integral de nossos representados.
                </p>
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-4">Nossa Visão</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Ser referência mundial em gestão de atletas, reconhecida pela 
                  excelência no atendimento, pela ética nas negociações e pelos 
                  resultados extraordinários alcançados por nossos atletas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Sobre;
