import type { FormationPlayerNode, RoleFamilyId, TacticalFormation } from "./types";

interface Slot {
  sigla: string;
  label: string;
  family: RoleFamilyId | null;
}

function buildNodes(slots: Slot[], coords: Record<string, [number, number]>): FormationPlayerNode[] {
  return slots.map((s) => {
    const c = coords[s.sigla];
    return { ...s, x: c[0], y: c[1] };
  });
}

const GK: Slot = { sigla: "GR", label: "Goleiro", family: null };

// ─── 4-2-3-1 ────────────────────────────────────────────────────────────────

const SLOTS_4231: Slot[] = [
  GK,
  { sigla: "ZAD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZAE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "LD", label: "Lateral Direito", family: "lateral" },
  { sigla: "LE", label: "Lateral Esquerdo", family: "lateral" },
  { sigla: "VOD", label: "Volante Direito", family: "volante" },
  { sigla: "VOE", label: "Volante Esquerdo", family: "volante" },
  { sigla: "MCD", label: "Ponta Direito (Meia Aberto)", family: "ponta" },
  { sigla: "MCE", label: "Ponta Esquerdo (Meia Aberto)", family: "ponta" },
  { sigla: "MC", label: "Meia Central (Camisa 10)", family: "meia-ofensivo" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
];

// ─── 4-3-3 ──────────────────────────────────────────────────────────────────

const SLOTS_433: Slot[] = [
  GK,
  { sigla: "ZAD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZAE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "LD", label: "Lateral Direito", family: "lateral" },
  { sigla: "LE", label: "Lateral Esquerdo", family: "lateral" },
  { sigla: "VOL", label: "Volante", family: "volante" },
  { sigla: "MED", label: "Meia Interior Direito", family: "meia-ofensivo" },
  { sigla: "MEE", label: "Meia Interior Esquerdo", family: "meia-ofensivo" },
  { sigla: "PTD", label: "Ponta Direito", family: "ponta" },
  { sigla: "PTE", label: "Ponta Esquerdo", family: "ponta" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
];

// ─── 4-4-2 (Linha) ────────────────────────────────────────────────────────────

const SLOTS_442_LINHA: Slot[] = [
  GK,
  { sigla: "ZAD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZAE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "LD", label: "Lateral Direito", family: "lateral" },
  { sigla: "LE", label: "Lateral Esquerdo", family: "lateral" },
  { sigla: "VOD", label: "Volante Direito", family: "volante" },
  { sigla: "VOE", label: "Volante Esquerdo", family: "volante" },
  { sigla: "MED", label: "Meia Direito (Linha)", family: "ponta" },
  { sigla: "MEE", label: "Meia Esquerdo (Linha)", family: "ponta" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
  { sigla: "AT2", label: "Segundo Atacante", family: "segundo-atacante" },
];

// ─── 4-4-2 (Losango) ──────────────────────────────────────────────────────────

const SLOTS_442_LOSANGO: Slot[] = [
  GK,
  { sigla: "ZAD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZAE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "LD", label: "Lateral Direito", family: "lateral" },
  { sigla: "LE", label: "Lateral Esquerdo", family: "lateral" },
  { sigla: "VOL", label: "Volante (Base do Losango)", family: "volante" },
  { sigla: "MCD", label: "Segundo Volante (Interior Direito)", family: "volante" },
  { sigla: "MCE", label: "Meia Box-to-Box Esquerdo", family: "meia-ofensivo" },
  { sigla: "MEI", label: "Meia Ofensivo (Vértice)", family: "meia-ofensivo" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
  { sigla: "AT2", label: "Segundo Atacante", family: "segundo-atacante" },
];

// ─── 3-4-2-1 ────────────────────────────────────────────────────────────────

const SLOTS_3421: Slot[] = [
  GK,
  { sigla: "ZDC", label: "Zagueiro Central", family: "zagueiro" },
  { sigla: "ZDD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZDE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "ALD", label: "Ala Direito", family: "lateral" },
  { sigla: "ALE", label: "Ala Esquerdo", family: "lateral" },
  { sigla: "VOD", label: "Volante Direito", family: "volante" },
  { sigla: "VOE", label: "Volante Esquerdo", family: "volante" },
  { sigla: "MCE", label: "Camisa 10 (Meio-Espaço Esquerdo)", family: "meia-ofensivo" },
  { sigla: "MCD", label: "Camisa 10 (Meio-Espaço Direito)", family: "meia-ofensivo" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
];

// ─── 3-5-2 ──────────────────────────────────────────────────────────────────

const SLOTS_352: Slot[] = [
  GK,
  { sigla: "ZDC", label: "Zagueiro Central", family: "zagueiro" },
  { sigla: "ZDD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZDE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "ALD", label: "Ala Direito", family: "lateral" },
  { sigla: "ALE", label: "Ala Esquerdo", family: "lateral" },
  { sigla: "VOD", label: "Volante Direito", family: "volante" },
  { sigla: "VOE", label: "Volante Esquerdo", family: "volante" },
  { sigla: "MC", label: "Meia Central Ofensivo", family: "meia-ofensivo" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
  { sigla: "AT2", label: "Segundo Atacante", family: "segundo-atacante" },
];

// ─── 5-4-1 ──────────────────────────────────────────────────────────────────

const SLOTS_541: Slot[] = [
  GK,
  { sigla: "ZDC", label: "Zagueiro Central", family: "zagueiro" },
  { sigla: "ZDD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZDE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "ALD", label: "Ala Direito", family: "lateral" },
  { sigla: "ALE", label: "Ala Esquerdo", family: "lateral" },
  { sigla: "VOD", label: "Volante Direito", family: "volante" },
  { sigla: "VOE", label: "Volante Esquerdo", family: "volante" },
  { sigla: "MED", label: "Meia Direito (Apoio)", family: "ponta" },
  { sigla: "MEE", label: "Meia Esquerdo (Apoio)", family: "ponta" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
];

// ─── 3-2-4-1 ────────────────────────────────────────────────────────────────

const SLOTS_3241: Slot[] = [
  GK,
  { sigla: "ZDC", label: "Zagueiro Central", family: "zagueiro" },
  { sigla: "ZDD", label: "Zagueiro Direito", family: "zagueiro" },
  { sigla: "ZDE", label: "Zagueiro Esquerdo", family: "zagueiro" },
  { sigla: "VOD", label: "Volante Direito", family: "volante" },
  { sigla: "VOE", label: "Volante Esquerdo", family: "volante" },
  { sigla: "MD", label: "Ponta Direito", family: "ponta" },
  { sigla: "ME", label: "Ponta Esquerdo", family: "ponta" },
  { sigla: "MCD", label: "Meia Ofensivo Direito", family: "meia-ofensivo" },
  { sigla: "MCE", label: "Meia Ofensivo Esquerdo", family: "meia-ofensivo" },
  { sigla: "ATA", label: "Centroavante", family: "centroavante" },
];

export const TACTICAL_DICTIONARY: Record<string, TacticalFormation> = {
  "4-2-3-1": {
    key: "4-2-3-1",
    name: "4-2-3-1",
    recommendedVariation: "fase_ofensiva",
    description: {
      howItWorks:
        "Dois volantes protegem a zaga, três meias (dois pontas abertos e um 10 central) apoiam o centroavante.",
      pros: "Extremo equilíbrio defensivo, excelente preenchimento da largura do campo e facilidade para dobrar a marcação nas alas.",
      cons: "O centroavante pode ficar isolado se o camisa 10 e os pontas não pisarem na área para definir.",
    },
    positions: SLOTS_4231.map((s) => s.sigla),
    variations: {
      fase_ofensiva: {
        label: "Fase Ofensiva (Recomendada)",
        nodes: buildNodes(SLOTS_4231, {
          GR: [70, 330], ZAD: [180, 260], ZAE: [180, 400], LD: [230, 100], LE: [230, 560],
          VOD: [330, 290], VOE: [330, 370], MCD: [660, 150], MCE: [660, 510], MC: [580, 330], ATA: [860, 330],
        }),
        play: {
          comBola: "Os laterais sobem para dar largura enquanto o camisa 10 flutua entre as linhas, buscando o passe que rompe a defesa adversária.",
          semBola: "Pressão coordenada dos três meias sobre a saída de bola do rival, fechando as linhas de passe centrais.",
          dica: "Mantenha os dois volantes sempre entre a bola e a própria área — eles são o seguro contra o contra-ataque.",
        },
      },
      bloco_baixo: {
        label: "Bloco Baixo Defensivo",
        nodes: buildNodes(SLOTS_4231, {
          GR: [60, 330], ZAD: [150, 260], ZAE: [150, 400], LD: [170, 150], LE: [170, 510],
          VOD: [280, 300], VOE: [280, 360], MCD: [380, 180], MCE: [380, 480], MC: [400, 330], ATA: [560, 330],
        }),
        play: {
          comBola: "Saída de bola direta e sem risco: procure o pivô mais próximo antes de tentar construir pela base.",
          semBola: "Recue as duas linhas de quatro para dentro da própria metade, fechando os espaços entre setores e forçando o adversário para as pontas.",
          dica: "Compactação é tudo: a distância entre a linha de ataque e a linha de defesa não pode passar de 25-30 metros.",
        },
      },
    },
  },

  "4-3-3": {
    key: "4-3-3",
    name: "4-3-3",
    recommendedVariation: "jogo_posicao",
    description: {
      howItWorks:
        "Um volante solitário distribui o jogo atrás de dois meias interiores, abastecendo dois pontas espetados e um centroavante.",
      pros: "Facilidade para triangulações pelas pontas, amplitude máxima e forte sufoco na saída de bola adversária.",
      cons: "Exposição severa nos contra-ataques caso os meias interiores não recomponham rápido as costas do volante.",
    },
    positions: SLOTS_433.map((s) => s.sigla),
    variations: {
      jogo_posicao: {
        label: "Jogo de Posição (Recomendada)",
        nodes: buildNodes(SLOTS_433, {
          GR: [70, 330], ZAD: [170, 260], ZAE: [170, 400], LD: [210, 110], LE: [210, 550],
          VOL: [320, 330], MED: [480, 230], MEE: [480, 430], PTD: [760, 110], PTE: [760, 550], ATA: [860, 330],
        }),
        play: {
          comBola: "Circule a bola com paciência pelos meias interiores até encontrar o lateral livre ou o ponta isolado no 1x1.",
          semBola: "Ocupe racionalmente os espaços, forçando o adversário a jogar por fora enquanto o volante protege o meio.",
          dica: "Nunca perca a forma do triângulo entre lateral, interior e ponta — é o que garante saídas limpas sob pressão.",
        },
      },
      pressao_alta: {
        label: "Pressão no Bloco Alto",
        nodes: buildNodes(SLOTS_433, {
          GR: [140, 330], ZAD: [260, 260], ZAE: [260, 400], LD: [340, 150], LE: [340, 510],
          VOL: [400, 330], MED: [540, 250], MEE: [540, 410], PTD: [680, 150], PTE: [680, 510], ATA: [760, 330],
        }),
        play: {
          comBola: "Jogo direto e vertical assim que recuperar a bola, aproveitando os espaços deixados pela pressão adversária.",
          semBola: "Pressão orquestrada em bloco alto: os três atacantes fecham as linhas de passe e forçam o erro na saída rival.",
          dica: "A pressão só funciona coletiva: se o primeiro pressiona sozinho, o time inteiro fica desorganizado. Ataque em bloco.",
        },
      },
    },
  },

  "4-4-2-linha": {
    key: "4-4-2-linha",
    name: "4-4-2 (Linha)",
    recommendedVariation: "linha_compacta",
    description: {
      howItWorks:
        "Duas linhas de quatro extremamente compactas e paralelas, com os meias de linha dando amplitude e a dupla de ataque dividindo as marcações centrais.",
      pros: "Simplicidade tática, cobertura total do campo em bloco e facilidade para os jogadores entenderem suas referências de marcação.",
      cons: "Meio-campo pode ficar numericamente inferior contra sistemas com 3 ou 5 no meio, sofrendo para sair jogando com qualidade.",
    },
    positions: SLOTS_442_LINHA.map((s) => s.sigla),
    variations: {
      linha_compacta: {
        label: "Linha Compacta (Recomendada)",
        nodes: buildNodes(SLOTS_442_LINHA, {
          GR: [70, 330], ZAD: [170, 260], ZAE: [170, 400], LD: [220, 110], LE: [220, 550],
          VOD: [400, 290], VOE: [400, 370], MED: [420, 150], MEE: [420, 510], ATA: [760, 300], AT2: [700, 380],
        }),
        play: {
          comBola: "Jogo direto e vertical: os meias de linha cruzam a bola cedo para a dupla de ataque brigar dentro da área.",
          semBola: "Duas linhas de quatro paralelas e próximas, fechando os corredores centrais e sobrando ninguém entre elas.",
          dica: "Mantenha as duas linhas sempre a uma distância curta uma da outra — é a base de todo o sistema.",
        },
      },
      reversao_rapida: {
        label: "Reversão Rápida (Contra-Ataque)",
        nodes: buildNodes(SLOTS_442_LINHA, {
          GR: [80, 330], ZAD: [190, 260], ZAE: [190, 400], LD: [380, 120], LE: [380, 540],
          VOD: [460, 300], VOE: [460, 360], MED: [560, 140], MEE: [560, 520], ATA: [860, 270], AT2: [820, 420],
        }),
        play: {
          comBola: "Assim que recuperar, acione o espaço nas costas da defesa adversária com um passe longo para os dois atacantes abertos.",
          semBola: "Recupere e transite rápido antes que o adversário se reorganize; poucos toques, máxima velocidade.",
          dica: "Cada segundo de indecisão depois de ganhar a bola vale um gol a menos — jogue para frente sempre que possível.",
        },
      },
    },
  },

  "4-4-2-losango": {
    key: "4-4-2-losango",
    name: "4-4-2 (Losango)",
    recommendedVariation: "construcao_central",
    description: {
      howItWorks:
        "Losango no meio-campo: dois volantes protegem a base (um de contenção, outro de box-to-box) e um armador flutua no vértice, entre as linhas, atrás da dupla de ataque.",
      pros: "Superioridade numérica e triangulações fáceis no corredor central, com um criador livre entre as linhas adversárias.",
      cons: "Falta natural de largura nas pontas — depende totalmente dos laterais para dar amplitude ao time.",
    },
    positions: SLOTS_442_LOSANGO.map((s) => s.sigla),
    variations: {
      construcao_central: {
        label: "Construção Central (Recomendada)",
        nodes: buildNodes(SLOTS_442_LOSANGO, {
          GR: [70, 330], ZAD: [170, 260], ZAE: [170, 400], LD: [210, 110], LE: [210, 550],
          VOL: [320, 330], MCD: [460, 390], MCE: [460, 270], MEI: [600, 330], ATA: [860, 300], AT2: [800, 400],
        }),
        play: {
          comBola: "Explore o losango: o segundo volante avança para ligar com o armador, que recebe de frente para a defesa adversária.",
          semBola: "Feche o triângulo central e obrigue o adversário a jogar pelas pontas, onde os laterais recompõem em dobradinha com os volantes.",
          dica: "O vértice do losango precisa constantemente achar bolsões de espaço — parado, ele desaparece do jogo.",
        },
      },
      retranca_losango: {
        label: "Retranca em Losango",
        nodes: buildNodes(SLOTS_442_LOSANGO, {
          GR: [70, 330], ZAD: [160, 260], ZAE: [160, 400], LD: [190, 180], LE: [190, 480],
          VOL: [290, 330], MCD: [380, 390], MCE: [380, 270], MEI: [460, 330], ATA: [620, 300], AT2: [580, 400],
        }),
        play: {
          comBola: "Saia rápido pelo volante mais liberado assim que recuperar, sem arriscar no corredor central congestionado.",
          semBola: "Reduza o losango ao máximo, protegendo o miolo e cedendo espaço apenas nas laterais do campo.",
          dica: "Sem largura natural, a disciplina posicional dos quatro do meio é o que evita que o time seja partido ao meio.",
        },
      },
    },
  },

  "3-4-2-1": {
    key: "3-4-2-1",
    name: "3-4-2-1",
    recommendedVariation: "entrelinhas",
    description: {
      howItWorks:
        "Três zagueiros na saída, dois alas cobrindo o corredor todo, dois volantes de sustentação e dois camisas 10 flutuando nos meios-espaços atrás do centroavante.",
      pros: "Superioridade numérica esmagadora pelo centro do campo entrelinhas e ótima proteção contra cruzamentos.",
      cons: "Exige alas com vigor físico absurdo. Se os alas atrasarem na recomposição, os lados da zaga ficam expostos no 1x1.",
    },
    positions: SLOTS_3421.map((s) => s.sigla),
    variations: {
      entrelinhas: {
        label: "Ataque Entrelinhas (Recomendada)",
        nodes: buildNodes(SLOTS_3421, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [190, 220], ZDE: [190, 440], ALD: [260, 130], ALE: [260, 530],
          VOD: [340, 290], VOE: [340, 370], MCE: [600, 250], MCD: [600, 410], ATA: [860, 330],
        }),
        play: {
          comBola: "Os camisas 10 recebem nos meios-espaços de costas para a defesa, girando para o passe entre linhas ou acionando o ala pela frente.",
          semBola: "Suba a linha de três zagueiros junto com os volantes, comprimindo o campo e sufocando a saída curta do adversário.",
          dica: "O timing dos alas é tudo: eles precisam estar exatamente na linha de fundo quando o camisa 10 recebe entrelinhas.",
        },
      },
      defesa_linha_5: {
        label: "Recomposição em Linha de 5",
        nodes: buildNodes(SLOTS_3421, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [180, 220], ZDE: [180, 440], ALD: [220, 140], ALE: [220, 520],
          VOD: [320, 300], VOE: [320, 360], MCD: [420, 260], MCE: [420, 400], ATA: [560, 330],
        }),
        play: {
          comBola: "Jogue simples pelos zagueiros até o volante livre; não force a saída pelo meio-espaço quando estiver sob pressão.",
          semBola: "Os alas recuam para formar uma linha de cinco só, fechando totalmente os corredores e deixando o adversário só com bola longa.",
          dica: "Recompor em linha de 5 exige que os alas cheguem primeiro que o atacante adversário — comece a corrida cedo.",
        },
      },
    },
  },

  "3-5-2": {
    key: "3-5-2",
    name: "3-5-2",
    recommendedVariation: "construcao_ampla",
    description: {
      howItWorks:
        "Três zagueiros dão segurança na saída, os alas cobrem o corredor inteiro sozinhos e um meia central conecta o setor de criação à dupla de ataque.",
      pros: "Cinco homens de meio-campo garantem domínio numérico na criação e flexibilidade para virar linha de cinco na defesa.",
      cons: "Depende totalmente do fôlego dos alas — se cansarem ou se atrasarem, os corredores ficam completamente abertos para o rival explorar.",
    },
    positions: SLOTS_352.map((s) => s.sigla),
    variations: {
      construcao_ampla: {
        label: "Construção Ampla (Recomendada)",
        nodes: buildNodes(SLOTS_352, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [190, 220], ZDE: [190, 440], ALD: [280, 130], ALE: [280, 530],
          VOD: [340, 290], VOE: [340, 370], MC: [560, 330], ATA: [860, 290], AT2: [830, 410],
        }),
        play: {
          comBola: "Os alas sobem juntos, ocupando o corredor inteiro; o meia central escolhe entre eles ou a dupla de ataque para o passe final.",
          semBola: "Comprima o campo com os três zagueiros e os dois volantes, fechando o miolo e cedendo apenas o último terço aos alas rivais.",
          dica: "Nunca deixe os dois alas subirem ao mesmo tempo sem cobertura — alterne quem ataca e quem segura o corredor.",
        },
      },
      linha_cinco_defensiva: {
        label: "Linha de Cinco Defensiva",
        nodes: buildNodes(SLOTS_352, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [180, 220], ZDE: [180, 440], ALD: [210, 150], ALE: [210, 510],
          VOD: [310, 300], VOE: [310, 360], MC: [420, 330], ATA: [600, 300], AT2: [560, 410],
        }),
        play: {
          comBola: "Saia com segurança pelos três zagueiros, buscando o volante livre antes de qualquer verticalização.",
          semBola: "Os alas recuam à linha da defesa, formando um bloco de cinco praticamente intransponível pelas beiradas.",
          dica: "Com a linha de cinco montada, a paciência é a chave — espere o erro do adversário, não se antecipe.",
        },
      },
    },
  },

  "5-4-1": {
    key: "5-4-1",
    name: "5-4-1",
    recommendedVariation: "contra_ataque",
    description: {
      howItWorks:
        "Cinco defensores fecham toda a extensão da defesa, quatro homens de meio-campo formam um bloco compacto à frente e um único centroavante segura a bola sozinho lá na frente.",
      pros: "Solidez defensiva máxima, praticamente elimina o 1x1 nas costas da defesa e permite jogar de contra-ataque com segurança.",
      cons: "Centroavante isolado sofre demais sem apoio constante; o time depende de bolas paradas e transições rápidas para criar perigo.",
    },
    positions: SLOTS_541.map((s) => s.sigla),
    variations: {
      contra_ataque: {
        label: "Contra-Ataque (Recomendada)",
        nodes: buildNodes(SLOTS_541, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [190, 220], ZDE: [190, 440], ALD: [260, 130], ALE: [260, 530],
          VOD: [340, 300], VOE: [340, 360], MED: [520, 190], MEE: [520, 470], ATA: [860, 330],
        }),
        play: {
          comBola: "Assim que recuperar, jogue direto e vertical para o centroavante segurar a bola até os pontas chegarem para o contra-ataque.",
          semBola: "Cinco atrás fecham qualquer profundidade; os quatro do meio formam parede e sufocam o espaço entre linhas.",
          dica: "O centroavante precisa aguentar sozinho até a chegada dos companheiros — treine o jogo de proteção de bola de costas.",
        },
      },
      muralha_defensiva: {
        label: "Muralha Defensiva",
        nodes: buildNodes(SLOTS_541, {
          GR: [60, 330], ZDC: [130, 330], ZDD: [160, 230], ZDE: [160, 430], ALD: [180, 160], ALE: [180, 500],
          VOD: [260, 300], VOE: [260, 360], MED: [360, 200], MEE: [360, 460], ATA: [520, 330],
        }),
        play: {
          comBola: "Não arrisque: alivie a pressão jogando longo para o centroavante segurar enquanto o time sobe junto.",
          semBola: "Bloco baixo extremo, quase sem espaço entre as linhas — o adversário só entra na área contra o bloco compacto.",
          dica: "Quanto mais baixo o bloco, mais crucial é a concentração nos cruzamentos e bolas paradas — não relaxe na marcação de área.",
        },
      },
    },
  },

  "3-2-4-1": {
    key: "3-2-4-1",
    name: "3-2-4-1",
    recommendedVariation: "ataque_total",
    description: {
      howItWorks:
        "Três zagueiros e dois volantes sustentam a base, enquanto uma linha ofensiva de quatro (dois pelas pontas, dois por dentro) inunda o último terço para apoiar o centroavante.",
      pros: "Ataque com números altíssimos no campo adversário e muitas opções de combinação no último terço, dificultando a marcação individual.",
      cons: "Extrema exposição a contra-ataques — com só cinco jogadores atrás da linha ofensiva, qualquer perda de bola no ataque vira risco imediato.",
    },
    positions: SLOTS_3241.map((s) => s.sigla),
    variations: {
      ataque_total: {
        label: "Ataque Total (Recomendada)",
        nodes: buildNodes(SLOTS_3241, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [190, 220], ZDE: [190, 440], VOD: [330, 290], VOE: [330, 370],
          MD: [700, 110], ME: [700, 550], MCD: [620, 260], MCE: [620, 400], ATA: [880, 330],
        }),
        play: {
          comBola: "Inunde o último terço: os quatro da frente combinam entre si em triângulos curtos até abrir espaço para o centroavante definir.",
          semBola: "Pressione alto com os quatro atacantes assim que perder a bola — a recuperação imediata é o que evita o contra-ataque.",
          dica: "Os dois volantes são a última linha de segurança: eles nunca podem subir junto com o ataque ao mesmo tempo.",
        },
      },
      equilibrio_defensivo: {
        label: "Equilíbrio Defensivo",
        nodes: buildNodes(SLOTS_3241, {
          GR: [70, 330], ZDC: [150, 330], ZDD: [180, 220], ZDE: [180, 440], VOD: [280, 300], VOE: [280, 360],
          MD: [520, 150], ME: [520, 510], MCD: [460, 260], MCE: [460, 400], ATA: [680, 330],
        }),
        play: {
          comBola: "Segure mais a posse antes de liberar o último passe, dando tempo para os volantes se reposicionarem como cobertura.",
          semBola: "Recue a linha ofensiva um pouco para reduzir a distância até os volantes, evitando o buraco entre setores.",
          dica: "Em time com ataque tão numeroso, a disciplina de quem NÃO ataca é mais importante do que quem ataca.",
        },
      },
    },
  },
};

export const FORMATION_ORDER = [
  "4-2-3-1",
  "4-3-3",
  "4-4-2-linha",
  "4-4-2-losango",
  "3-4-2-1",
  "3-5-2",
  "5-4-1",
  "3-2-4-1",
];
