import { motion } from "framer-motion";

const DURATION = 9;
// A bola descansa "no pé" do jogador: deslocada para a ponta direita do
// círculo (não no centro), em pixels fixos para não distorcer em telas largas.
const BALL_OFFSET_PX = 13;
const foot = (v: number) => `calc(${v}% + ${BALL_OFFSET_PX}px)`;
const pct = (v: number) => `${v}%`;

interface PlayerPath {
  name: string;
  times: number[];
  left: number[];
  top: number[];
}

// Pontos ao redor do escanteio do lado do Joaquim, formando um aglomerado
// espalhado para a comemoração — cada jogador chega numa posição distinta,
// não empilhados um em cima do outro.
const CORNER = {
  VITOR: { left: 83, top: 13 },
  ALEXANDRE: { left: 89, top: 15 },
  CORONA: { left: 87, top: 10 }, // autor do gol, na frente do grupo
  MATHEUS: { left: 85, top: 19 },
  JOAQUIM: { left: 91, top: 8 }, // é o "dono" do escanteio
};

// Vitor — zagueiro, dentro da própria área. Dá o primeiro passe e, em vez
// de ir pro meio, abre na lateral um pouco pra frente, paralelo ao ponto de
// origem do Alexandre. Segura essa posição avançada até o gol sair, corre
// para o escanteio do lado do Joaquim para comemorar e só então volta para
// a própria área.
const VITOR: PlayerPath = {
  name: "VITOR",
  times: [0, 0.0778, 0.4444, 0.7778, 0.9, 0.97, 1],
  left: [12, 12, 26, 26, CORNER.VITOR.left, CORNER.VITOR.left, 12],
  top: [52, 52, 76, 76, CORNER.VITOR.top, CORNER.VITOR.top, 52],
};

// Alexandre — parado na "meia lua" do seu lado do campo, centralizado. Vai
// de encontro à bola para receber do Vitor, mas não toca parado: caminha de
// volta até o ponto de origem e só dali devolve para o Corona. Depois
// caminha bem devagar até o meio de campo — só chegando lá quando o Corona
// passa pela "meia lua" da área adversária, ainda a caminho da finalização
// — segura essa posição até o gol sair, corre para o escanteio comemorar e
// só então volta para a própria "meia lua".
const ALEXANDRE: PlayerPath = {
  name: "ALEXANDRE",
  times: [0, 0.1333, 0.2444, 0.6, 0.7778, 0.9, 0.97, 1],
  left: [24, 20, 24, 50, 50, CORNER.ALEXANDRE.left, CORNER.ALEXANDRE.left, 24],
  top: [50, 51, 50, 50, 50, CORNER.ALEXANDRE.top, CORNER.ALEXANDRE.top, 50],
};

// Corona — no meio de campo, na parte de cima. Não espera parado: vai um
// pouco de encontro à bola para receber, depois anda de volta para onde
// começou e assim que chega toca de primeira na frente do Matheus (sem
// segurar). A partir daí não perde tempo: corre direto para o terço final,
// passando pela "meia lua" da área adversária antes de formar o triângulo
// com Matheus e Joaquim, e assim que recebe o toque do Joaquim bate de
// primeira pro gol — e corre para o escanteio do lado do Joaquim comemorar.
const CORONA: PlayerPath = {
  name: "CORONA",
  times: [0, 0.1333, 0.3, 0.3778, 0.5, 0.6, 0.7167, 0.7222, 0.7778, 0.88, 0.97, 1],
  left: [50, 50, 46, 50, 62, 76, 80, 82, 82, CORNER.CORONA.left, CORNER.CORONA.left, 50],
  top: [40, 40, 43, 40, 44, 49, 50, 50, 50, CORNER.CORONA.top, CORNER.CORONA.top, 40],
};

// Matheus — começa no meio do campo adversário, perto da lateral de baixo.
// Assim que o Corona vai de encontro à bola, vem um pouco mais pra
// esquerda (mais que o Joaquim). Quando o Corona volta pro ponto de
// origem, ele também volta pro dele. Depois arranca, com calma, para a
// entrada da área — o encontro das linhas da grande área — para receber o
// cruzamento do Joaquim e tocar de primeira para o Corona, sem segurar.
// Assim que o gol sai, corre para o escanteio do lado do Joaquim comemorar.
const MATHEUS: PlayerPath = {
  name: "MATHEUS",
  times: [0, 0.1333, 0.3, 0.3778, 0.5, 0.6444, 0.6611, 0.8, 0.9, 0.97, 1],
  left: [72, 72, 60, 72, 78, 82, 82, 76, CORNER.MATHEUS.left, CORNER.MATHEUS.left, 72],
  top: [80, 80, 80, 80, 74, 69, 69, 74, CORNER.MATHEUS.top, CORNER.MATHEUS.top, 80],
};

// Joaquim — começa também no meio do campo adversário. Assim que o Corona
// vai de encontro à bola, vem um pouco mais pra esquerda (menos que o
// Matheus). Quando o Corona volta pro ponto de origem, ele também volta,
// mas sobe mais, ficando perto da linha lateral — é lá que recebe o
// lançamento do Corona (em vez do Matheus). Anda com calma com a bola pro
// lado direito, avançando pela linha de fundo, e cruza para o Matheus de
// lá — antes de cortar para dentro da área, já sem a bola. Assim que o gol
// sai, é o primeiro a chegar no "seu" escanteio para a comemoração.
const JOAQUIM: PlayerPath = {
  name: "JOAQUIM",
  times: [0, 0.1333, 0.3, 0.3778, 0.4333, 0.5111, 0.5889, 0.68, 0.78, 0.88, 0.97, 1],
  left: [72, 72, 68, 72, 72, 86, 90, 82, 78, CORNER.JOAQUIM.left, CORNER.JOAQUIM.left, 72],
  top: [20, 20, 20, 12, 12, 13, 14, 28, 24, CORNER.JOAQUIM.top, CORNER.JOAQUIM.top, 20],
};

const PLAYERS = [VITOR, ALEXANDRE, CORONA, MATHEUS, JOAQUIM];

// A bola visita a posição exata (pé) de quem está com ela em cada instante,
// referenciando sempre o mesmo índice/tempo do array do jogador — garante
// que bola e jogador cheguem juntos, sem atraso. Só o Alexandre e o Corona
// (na primeira recepção) seguram a bola por ~1s; Matheus, Joaquim e o
// Corona na finalização tocam tudo de primeira.
const BALL = {
  times: [
    0, 0.0778, 0.1333, 0.2444, 0.3, 0.3778, 0.4333, 0.5111, 0.5889, 0.6444,
    0.6611, 0.7167, 0.7222, 0.7778, 1,
  ],
  left: [
    foot(VITOR.left[0]), // t0.00 — com o Vitor
    foot(VITOR.left[1]), // t0.08 — Vitor solta
    foot(ALEXANDRE.left[1]), // t0.13 — Alexandre recebe
    foot(ALEXANDRE.left[2]), // t0.24 — Alexandre solta (após segurar 1s)
    foot(CORONA.left[2]), // t0.30 — Corona recebe (foi de encontro à bola)
    foot(CORONA.left[3]), // t0.38 — Corona solta assim que chega na origem
    foot(JOAQUIM.left[4]), // t0.43 — chega no Joaquim, perto da lateral
    foot(JOAQUIM.left[5]), // t0.51 — Joaquim anda com a bola pro lado direito
    foot(JOAQUIM.left[6]), // t0.59 — Joaquim chega na linha de fundo e cruza
    foot(MATHEUS.left[5]), // t0.64 — chega no Matheus, entrada da área
    foot(MATHEUS.left[6]), // t0.66 — Matheus toca de primeira
    foot(CORONA.left[6]), // t0.72 — Corona recebe o toque final
    foot(CORONA.left[7]), // t0.72 — Corona bate de primeira pro gol
    foot(97), // t0.78 — bola chega ao gol (cruza a linha, dentro da rede)
    foot(VITOR.left[0]), // t1.00 — reinício do loop
  ],
  top: [
    VITOR.top[0],
    VITOR.top[1],
    ALEXANDRE.top[1],
    ALEXANDRE.top[2],
    CORONA.top[2],
    CORONA.top[3],
    JOAQUIM.top[4],
    JOAQUIM.top[5],
    JOAQUIM.top[6],
    MATHEUS.top[5],
    MATHEUS.top[6],
    CORONA.top[6],
    CORONA.top[7],
    50,
    VITOR.top[0],
  ].map(pct),
};

export function LandingHeroField() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* O gramado (fundo verde) mora em LandingHero.tsx, fora do frame de
          largura limitada, para poder ocupar 100% da tela em qualquer
          resolução. Aqui só ficam as linhas, jogadores e bola, alinhados
          com a logo/botão do menu. */}
      <div className="lp-hero__field-lines absolute inset-0 top-14">
        {/* Marcações do campo */}
        <div className="lp-hero__pitch-border absolute inset-[6%] rounded-sm border border-white/30" />
        <div className="lp-hero__pitch-midline absolute left-1/2 top-[6%] bottom-[6%] w-px -translate-x-1/2 bg-white/30" />
        <div className="absolute left-1/2 top-1/2 aspect-square w-[20%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
        <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35" />
        <div className="lp-hero__pitch-box-start absolute left-[6%] top-1/2 h-[38%] w-[12%] -translate-y-1/2 border border-l-0 border-white/30" />
        <div className="lp-hero__pitch-box-start absolute left-[6%] top-1/2 h-[16%] w-[5%] -translate-y-1/2 border border-l-0 border-white/30" />
        <div className="lp-hero__pitch-box-end absolute right-[6%] top-1/2 h-[38%] w-[12%] -translate-y-1/2 border border-r-0 border-white/30" />
        <div className="lp-hero__pitch-box-end absolute right-[6%] top-1/2 h-[16%] w-[5%] -translate-y-1/2 border border-r-0 border-white/30" />

        {/* Jogadores (botões) — a div animada tem o mesmo tamanho do círculo,
            então o -translate-x/y-1/2 centraliza exatamente sobre a bola. */}
        {PLAYERS.map((player) => (
          <motion.div
            key={player.name}
            className="absolute h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 sm:h-[26px] sm:w-[26px]"
            initial={{ left: pct(player.left[0]), top: pct(player.top[0]) }}
            animate={{
              left: player.left.map(pct),
              top: player.top.map(pct),
            }}
            transition={{
              duration: DURATION,
              times: player.times,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            <span className="lp-hero__player-label absolute left-1/2 top-[-15px] -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-widest text-white/80 sm:top-[-17px] sm:text-[10px]">
              {player.name}
            </span>
            <span
              className="block h-full w-full rounded-full border-[3px] border-white"
              style={{
                backgroundColor: "#E63946",
                boxShadow:
                  "inset 0 -2px 3px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.5)",
              }}
            />
          </motion.div>
        ))}

        {/* Bola */}
        <motion.div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.6), inset 0 -1px 1px rgba(0,0,0,0.25)" }}
          initial={{ left: BALL.left[0], top: BALL.top[0] }}
          animate={{
            left: BALL.left,
            top: BALL.top,
          }}
          transition={{
            duration: DURATION,
            times: BALL.times,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        />
      </div>
    </div>
  );
}
