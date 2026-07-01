export interface PlayStyle {
  nome: string;
  descricao: string;
}

export const PLAY_STYLES: PlayStyle[] = [
  {
    nome: "Combativo / Agressivo",
    descricao: "Foco no contato físico, desarmes firmes e alta intensidade nas disputas de bola.",
  },
  {
    nome: "Elegante / Técnico",
    descricao: "Prioriza o controle de bola refinado, visão de jogo e passes precisos em vez do confronto físico.",
  },
  {
    nome: "Velocista / Explosivo",
    descricao: "Utiliza a aceleração e velocidade máxima como principal arma para atacar espaços ou recompor a defesa.",
  },
  {
    nome: "Driblador / Liso",
    descricao: "Busca constantemente o drible e o um contra um (1x1) para quebrar as linhas de marcação adversárias.",
  },
  {
    nome: "Cadenciador / Maestro",
    descricao: "Dita o ritmo da partida, organizando as jogadas e escolhendo o momento exato de acelerar ou reter a posse.",
  },
  {
    nome: "Vertical / Direto",
    descricao: "Focado na objetividade. Assim que recebe a bola, busca passes longos, de ruptura e progressão rápida ao gol.",
  },
  {
    nome: "Tático / Leitor de Jogo",
    descricao: "Destaca-se pela inteligência. Antecipa movimentos, fecha espaços vitais e está sempre posicionado perfeitamente.",
  },
  {
    nome: "Infiltrador / Caçador de Espaços",
    descricao: "Move-se constantemente sem a bola, explorando o ponto cego da defesa para aparecer como elemento surpresa.",
  },
  {
    nome: "Impositivo / Físico",
    descricao: "Usa a imposição física, força e estatura para vencer duelos, proteger a bola e dominar os adversários.",
  },
  {
    nome: "Incansável / Operário",
    descricao: "Altíssimo volume de jogo (work rate). Cobre espaços e atua com máxima intensidade do primeiro ao último minuto.",
  },
  {
    nome: "Oportunista / Frio",
    descricao: "Foco em eficiência máxima. Pode participar pouco da criação, mas possui precisão cirúrgica para decidir lances críticos.",
  },
];

export function getPlayStyle(nome: string | null | undefined): PlayStyle | null {
  if (!nome) return null;
  return PLAY_STYLES.find(s => s.nome === nome) ?? null;
}
