import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/authContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { TacticalPosition, RoleFamilyId, SquadPlayer } from "@/components/laboratorio/types";
import { TacticalBoard } from "@/components/laboratorio/TacticalBoard";
import { TacticalGhost } from "@/components/laboratorio/TacticalGhost";
import { VariationCard } from "@/components/laboratorio/VariationCard";
import { TacticalDetails } from "@/components/laboratorio/TacticalDetails";
import { AttributesPanel } from "@/components/laboratorio/AttributesPanel";
import { PlayerBadge } from "@/components/laboratorio/PlayerBadge";
import { FormationSelector } from "@/components/laboratorio/FormationSelector";
import { FormationVariationTabs } from "@/components/laboratorio/FormationVariationTabs";
import { TACTICAL_DICTIONARY, FORMATION_ORDER } from "@/components/laboratorio/formations";

// ─── TACTICAL DATA ────────────────────────────────────────────────────────────

const POSITIONS: TacticalPosition[] = [
  {
    id: "zagueiro",
    name: "Zagueiro",
    shortName: "ZAG",
    color: "#3b82f6",
    dbPositions: ["Zagueiro"],
    description: "A base do sistema defensivo, atuando no centro da linha de defesa.",
    mainFunctions: ["Marcação e Desarme", "Proteção da Área", "Cobertura", "Saída de Bola"],
    radarAttributes: ["Imposição Física", "Timing", "Antecipação", "Jogo Aéreo", "Leitura", "Linha Impd."],
    subtypes: [
      {
        id: "rebatedor", name: "Rebatedor", tag: "Stopper / Clássico",
        description: "Foco total na destruição. Força física extrema, cortes providenciais e marcação implacável.",
        radarValues: { "Imposição Física": 98, "Timing": 85, "Antecipação": 80, "Jogo Aéreo": 92, "Leitura": 70, "Linha Impd.": 65 },
        heatZones: [{ x: 25, y: 50, r: 18, intensity: 0.9 }, { x: 18, y: 37, r: 12, intensity: 0.65 }, { x: 18, y: 63, r: 12, intensity: 0.65 }],
        references: ["Pepe", "Nemanja Vidić", "Martin Škrtel"],
        movement: { points: [[185, 248], [330, 230]], label: "Sobe e corta o atacante" },
        play: {
          comBola: "Jogue simples e seguro. Afaste o perigo sem complicar a saída de bola.",
          semBola: "Marque o atacante de referência, antecipe o cruzamento e ataque a bola aérea.",
          dica: "Na dúvida, mande para escanteio. Segurança vem antes de qualquer ousadia.",
        },
      },
      {
        id: "construtor", name: "Construtor", tag: "Ball-Playing Defender",
        description: "Essencial em times de posse de bola. Técnica de meio-campista: acha passes longos e curtos.",
        radarValues: { "Imposição Física": 75, "Timing": 82, "Antecipação": 88, "Jogo Aéreo": 80, "Leitura": 94, "Linha Impd.": 90 },
        heatZones: [{ x: 22, y: 50, r: 14, intensity: 0.8 }, { x: 35, y: 50, r: 11, intensity: 0.55 }, { x: 28, y: 34, r: 9, intensity: 0.45 }],
        references: ["Marquinhos", "John Stones", "Rúben Dias"],
        movement: { points: [[185, 248], [420, 150], [620, 120]], label: "Sai jogando / lança vertical" },
        play: {
          comBola: "Conduza para atrair a marcação e libere o passe vertical entre as linhas.",
          semBola: "Ajuste a linha e oriente os companheiros à sua frente.",
          dica: "Levante a cabeça antes de receber: decida o passe antes da bola chegar.",
        },
      },
      {
        id: "libero", name: "Líbero", tag: "Zagueiro de Sobra",
        description: "Joga recuado. Cérebro da defesa, excelente leitura das jogadas para coberturas.",
        radarValues: { "Imposição Física": 78, "Timing": 95, "Antecipação": 96, "Jogo Aéreo": 75, "Leitura": 98, "Linha Impd.": 88 },
        heatZones: [{ x: 15, y: 50, r: 14, intensity: 0.85 }, { x: 20, y: 36, r: 10, intensity: 0.5 }, { x: 20, y: 64, r: 10, intensity: 0.5 }, { x: 10, y: 50, r: 8, intensity: 0.35 }],
        references: ["Thiago Silva", "Franz Beckenbauer"],
        movement: { points: [[150, 200], [150, 460]], label: "Varre o espaço atrás da linha" },
        play: {
          comBola: "Saia jogando pelo corredor central com posse curta e segura.",
          semBola: "Dê cobertura ao companheiro e proteja as costas da linha defensiva.",
          dica: "Leia o passe do adversário um segundo antes — sua velocidade resolve.",
        },
      },
    ],
  },
  {
    id: "lateral",
    name: "Lateral",
    shortName: "LAT",
    color: "#06b6d4",
    dbPositions: ["Lateral Direito", "Lateral Esquerdo"],
    description: "Atuam nas faixas laterais com papéis híbridos entre defesa e ataque.",
    mainFunctions: ["Defesa de Corredor", "Apoio Ofensivo", "Fechamento de Linha"],
    radarAttributes: ["Stamina", "Velocidade", "Cruzamento", "Drible Progr.", "Recomposição", "Marcação 1v1"],
    subtypes: [
      {
        id: "defensivo", name: "Defensivo", tag: "Base / Clássico",
        description: "Sobe pouco ao ataque. Em fase ofensiva, fecha no centro formando linha de três.",
        radarValues: { "Stamina": 80, "Velocidade": 78, "Cruzamento": 60, "Drible Progr.": 55, "Recomposição": 92, "Marcação 1v1": 95 },
        heatZones: [{ x: 18, y: 20, r: 12, intensity: 0.88 }, { x: 25, y: 22, r: 9, intensity: 0.6 }, { x: 12, y: 20, r: 7, intensity: 0.45 }],
        references: ["Benjamin Pavard", "Lucas Hernández"],
        movement: { points: [[205, 110], [320, 160]], label: "Fecha o corredor" },
        play: {
          comBola: "Saída curta e segura. Não arrisque dentro do seu próprio campo.",
          semBola: "Feche o corredor, force o adversário para fora e dobre a marcação.",
          dica: "Fique de frente para o jogo: nunca seja passado pela linha de fundo.",
        },
      },
      {
        id: "ofensivo", name: "Ofensivo", tag: "Ala / Winger-Back",
        description: "Praticamente um ponta. Vai à linha de fundo, faz ultrapassagens e cruza.",
        radarValues: { "Stamina": 96, "Velocidade": 94, "Cruzamento": 90, "Drible Progr.": 82, "Recomposição": 75, "Marcação 1v1": 78 },
        heatZones: [{ x: 18, y: 15, r: 9, intensity: 0.65 }, { x: 55, y: 10, r: 12, intensity: 0.8 }, { x: 78, y: 12, r: 11, intensity: 0.78 }, { x: 88, y: 18, r: 9, intensity: 0.6 }],
        references: ["Roberto Carlos", "Achraf Hakimi"],
        movement: { points: [[205, 110], [480, 90], [760, 110]], label: "Sobe e cruza" },
        play: {
          comBola: "Ataque a linha de fundo e busque o cruzamento ou o recuo de qualidade.",
          semBola: "Dê amplitude lá na frente e ofereça sempre a linha de passe.",
          dica: "Só suba quando tiver cobertura atrás. Ataque, mas volte.",
        },
      },
      {
        id: "invertido", name: "Invertido", tag: "Interior / Construtor",
        description: "Entra pelo meio-campo para ajudar os volantes na armação do jogo.",
        radarValues: { "Stamina": 88, "Velocidade": 82, "Cruzamento": 65, "Drible Progr.": 80, "Recomposição": 82, "Marcação 1v1": 80 },
        heatZones: [{ x: 22, y: 18, r: 9, intensity: 0.6 }, { x: 40, y: 35, r: 14, intensity: 0.85 }, { x: 55, y: 42, r: 11, intensity: 0.7 }],
        references: ["Trent Alexander-Arnold", "João Cancelo", "Zinchenko"],
        movement: { points: [[205, 110], [430, 280]], label: "Entra por dentro" },
        play: {
          comBola: "Entre por dentro para criar linha de passe e superioridade no meio.",
          semBola: "Ocupe o meio quando o volante avança; mantenha o equilíbrio posicional.",
          dica: "Escolha o momento de inverter para dentro — leia onde está o espaço livre.",
        },
      },
    ],
  },
  {
    id: "volante",
    name: "Volante / Meia Central",
    shortName: "VOL",
    color: "#8b5cf6",
    dbPositions: ["Volante", "Meia"],
    description: "O motor do time, operando no centro conectando defesa ao ataque.",
    mainFunctions: ["Destruição de Jogadas", "Transição e Distribuição", "Cobertura"],
    radarAttributes: ["Posicionamento", "Desarme", "Passe Curto", "Visão Periférica", "Pulmão", "Press Resist."],
    subtypes: [
      {
        id: "ancor", name: "Primeiro Volante", tag: "Cão de Guarda / Anchor",
        description: "Protetor da zaga. Foco em destruir jogadas, interceptar passes e passe simples.",
        radarValues: { "Posicionamento": 92, "Desarme": 98, "Passe Curto": 72, "Visão Periférica": 70, "Pulmão": 85, "Press Resist.": 80 },
        heatZones: [{ x: 38, y: 50, r: 16, intensity: 0.9 }, { x: 28, y: 43, r: 10, intensity: 0.6 }, { x: 28, y: 57, r: 10, intensity: 0.6 }],
        references: ["Casemiro", "João Palhinha", "Jorginho"],
        movement: { points: [[355, 265], [280, 300]], label: "Cobre e desarma" },
        play: {
          comBola: "Recebeu, jogue rápido no companheiro mais próximo. Sem firula.",
          semBola: "Cubra o espaço na frente da defesa e antecipe a segunda bola.",
          dica: "Você é o escudo: posicionamento vale mais que o carrinho.",
        },
      },
      {
        id: "regista", name: "Volante Armador", tag: "Regista / Deep Playmaker",
        description: "Joga recuado mas foca na técnica. Arma o time lá de trás com lançamentos cirúrgicos.",
        radarValues: { "Posicionamento": 85, "Desarme": 68, "Passe Curto": 98, "Visão Periférica": 96, "Pulmão": 78, "Press Resist.": 92 },
        heatZones: [{ x: 35, y: 50, r: 14, intensity: 0.85 }, { x: 42, y: 40, r: 10, intensity: 0.6 }, { x: 42, y: 60, r: 10, intensity: 0.6 }],
        references: ["Toni Kroos", "Andrea Pirlo", "Busquets"],
        movement: { points: [[355, 395], [600, 230], [800, 190]], label: "Organiza a saída de bola" },
        play: {
          comBola: "Dite o ritmo. Circule a bola e acelere com o passe vertical na hora certa.",
          semBola: "Ofereça-se sempre como opção de saída entre os zagueiros.",
          dica: "O melhor passe às vezes é o mais simples. Mantenha a posse.",
        },
      },
      {
        id: "box-to-box", name: "Box-to-Box", tag: "Motorzinho / Área a Área",
        description: "Incansável. Defende na própria área e finaliza na área adversária.",
        radarValues: { "Posicionamento": 82, "Desarme": 84, "Passe Curto": 82, "Visão Periférica": 80, "Pulmão": 98, "Press Resist.": 85 },
        heatZones: [{ x: 35, y: 45, r: 11, intensity: 0.7 }, { x: 50, y: 50, r: 12, intensity: 0.75 }, { x: 65, y: 55, r: 10, intensity: 0.65 }, { x: 78, y: 50, r: 8, intensity: 0.5 }],
        references: ["Federico Valverde", "Arturo Vidal", "Gerson"],
        movement: { points: [[455, 330], [650, 300], [830, 290]], label: "Chega na área" },
        play: {
          comBola: "Conduza e chegue à área para finalizar a jogada.",
          semBola: "Equilibre: cubra quem subiu e ataque o espaço na hora certa.",
          dica: "Controle sua energia — escolha as corridas que realmente valem a pena.",
        },
      },
    ],
  },
  {
    id: "meia-ofensivo",
    name: "Meia Ofensivo",
    shortName: "MEI",
    color: "#f59e0b",
    dbPositions: ["Meia Atacante"],
    description: "Os cérebros criativos, atuando entre o meio-campo e a linha de ataque.",
    mainFunctions: ["Criação e Visão de Jogo", "Quebra de Linhas", "Finalização de Média Dist.", "Flutuação"],
    radarAttributes: ["Visão de Jogo", "Drible Curto", "Passe Ruptura", "Finalização", "Giro Rápido", "Inteligência"],
    subtypes: [
      {
        id: "trequartista", name: "Trequartista", tag: "O 10 Clássico / Enganche",
        description: "Gênio criativo focado em criar. Pouca obrigação de marcar. Dita a cadência do jogo.",
        radarValues: { "Visão de Jogo": 98, "Drible Curto": 92, "Passe Ruptura": 96, "Finalização": 75, "Giro Rápido": 90, "Inteligência": 98 },
        heatZones: [{ x: 62, y: 50, r: 16, intensity: 0.9 }, { x: 55, y: 40, r: 10, intensity: 0.55 }, { x: 70, y: 50, r: 10, intensity: 0.65 }],
        references: ["Riquelme", "PH Ganso", "Kaká"],
        movement: { points: [[600, 330], [830, 370]], label: "Inventa o último passe" },
        play: {
          comBola: "Receba entre as linhas, gire e procure o passe que rompe a defesa.",
          semBola: "Encontre o espaço entre as marcações; ofereça-se de frente para o gol.",
          dica: "Pause o jogo quando for preciso: o tempo certo vale mais que velocidade.",
        },
      },
      {
        id: "shadow-striker", name: "Shadow Striker", tag: "Meia-Atacante",
        description: "Menos focado em passes, mais em gols. Infiltra na área de surpresa vindo de trás.",
        radarValues: { "Visão de Jogo": 80, "Drible Curto": 88, "Passe Ruptura": 78, "Finalização": 92, "Giro Rápido": 85, "Inteligência": 90 },
        heatZones: [{ x: 68, y: 50, r: 14, intensity: 0.85 }, { x: 78, y: 43, r: 12, intensity: 0.8 }, { x: 82, y: 57, r: 10, intensity: 0.7 }],
        references: ["Thomas Müller", "Coutinho"],
        movement: { points: [[600, 340], [830, 300]], label: "Surge na segunda onda" },
        play: {
          comBola: "Combine e ataque a área na segunda onda, sem tempo de marcação.",
          semBola: "Jogue nas costas do volante adversário e ataque o espaço livre.",
          dica: "Chegue na hora do gol, não antes. Espere o último passe para se infiltrar.",
        },
      },
      {
        id: "meia-pressao", name: "Meia de Pressão", tag: "Criador Moderno / Intenso",
        description: "Criador com intensidade extrema. Pressiona saída adversária e gera tabelas.",
        radarValues: { "Visão de Jogo": 92, "Drible Curto": 85, "Passe Ruptura": 92, "Finalização": 82, "Giro Rápido": 88, "Inteligência": 94 },
        heatZones: [{ x: 58, y: 43, r: 13, intensity: 0.78 }, { x: 65, y: 50, r: 14, intensity: 0.88 }, { x: 72, y: 38, r: 10, intensity: 0.62 }, { x: 58, y: 60, r: 9, intensity: 0.55 }],
        references: ["Kevin De Bruyne", "Martin Ødegaard", "Bruno Fernandes"],
        movement: { points: [[560, 270], [460, 380], [600, 410]], label: "Pressiona e flutua entre linhas" },
        play: {
          comBola: "Combine rápido e ligue o meio ao ataque com toques de uma ou duas tocadas.",
          semBola: "Pressione a saída adversária e force o erro no primeiro toque.",
          dica: "Intensidade sem gasto à toa: escolha o momento exato de pressionar.",
        },
      },
    ],
  },
  {
    id: "ponta",
    name: "Ponta / Extremo",
    shortName: "PNT",
    color: "#10b981",
    dbPositions: ["Ponta Direita", "Ponta Esquerda"],
    description: "Velocidade, drible e agilidade atuando pelos lados do ataque.",
    mainFunctions: ["Amplitude e Profundidade", "1 contra 1 (1v1)", "Cruzamentos e Infiltrações", "Acomp. Defensivo"],
    radarAttributes: ["Aceleração", "Drible em Vel.", "Agilidade", "Frieza Final.", "Recomposição", "Resistência"],
    subtypes: [
      {
        id: "winger", name: "Ponta Clássico", tag: "Winger / Ala Aberto",
        description: "Joga no lado do pé bom. Busca a linha de fundo e foca em cruzamentos.",
        radarValues: { "Aceleração": 90, "Drible em Vel.": 92, "Agilidade": 88, "Frieza Final.": 72, "Recomposição": 70, "Resistência": 82 },
        heatZones: [{ x: 68, y: 15, r: 12, intensity: 0.85 }, { x: 80, y: 12, r: 10, intensity: 0.8 }, { x: 88, y: 20, r: 10, intensity: 0.72 }],
        references: ["Jesús Navas", "Garrincha", "Neymar (2014)"],
        movement: { points: [[668, 110], [860, 90], [940, 140]], label: "Dribla até a linha de fundo" },
        play: {
          comBola: "Encare o lateral no 1v1 e vá até a linha de fundo para cruzar.",
          semBola: "Fique aberto na linha para esticar a marcação adversária.",
          dica: "Ataque o pé de trás do marcador. Encare com velocidade e confiança.",
        },
      },
      {
        id: "invertido-ponta", name: "Extremo Invertido", tag: "Inside Forward / Cortador",
        description: "Joga com o pé trocado. Corta para dentro em direção à área para finalizar.",
        radarValues: { "Aceleração": 96, "Drible em Vel.": 95, "Agilidade": 92, "Frieza Final.": 88, "Recomposição": 72, "Resistência": 80 },
        heatZones: [{ x: 70, y: 18, r: 10, intensity: 0.72 }, { x: 78, y: 38, r: 14, intensity: 0.9 }, { x: 82, y: 52, r: 12, intensity: 0.8 }],
        references: ["Vinícius Jr.", "Mohamed Salah", "Arjen Robben"],
        movement: { points: [[668, 130], [830, 330]], label: "Corta para dentro e finaliza" },
        play: {
          comBola: "Corte para dentro no seu pé bom e finalize ou tabele com o camisa 9.",
          semBola: "Ataque o segundo poste nas diagonais quando o jogo vier do lado oposto.",
          dica: "Tempo da diagonal: parta assim que o jogo mudar de lado.",
        },
      },
      {
        id: "wide-playmaker", name: "Ponta Construtor", tag: "Wide Playmaker / Falso Ponta",
        description: "Muito técnico. Sai da ponta e vai para o meio ajudar a armar, abrindo corredor pro lateral.",
        radarValues: { "Aceleração": 82, "Drible em Vel.": 85, "Agilidade": 86, "Frieza Final.": 70, "Recomposição": 80, "Resistência": 88 },
        heatZones: [{ x: 65, y: 20, r: 10, intensity: 0.62 }, { x: 58, y: 38, r: 14, intensity: 0.82 }, { x: 68, y: 46, r: 10, intensity: 0.68 }],
        references: ["Bernardo Silva", "David Silva"],
        movement: { points: [[668, 150], [560, 300]], label: "Entra para ajudar a armar" },
        play: {
          comBola: "Dê largura e cruze rasteiro ou na medida quando abrir o corredor.",
          semBola: "Estique o campo na linha e abra espaço para o lateral subir.",
          dica: "Qualidade no cruzamento: levante a cabeça e escolha o alvo certo.",
        },
      },
    ],
  },
  {
    id: "centroavante",
    name: "Centroavante",
    shortName: "CA",
    color: "#ef4444",
    dbPositions: ["Centroavante"],
    description: "O jogador mais avançado, cujo objetivo principal é fazer gols.",
    mainFunctions: ["Finalização", "Trabalho de Pivô", "Ocupação de Espaço", "Pressão Alta"],
    radarAttributes: ["Posic. Área", "Faro de Gol", "Finaliz. Ambos", "Força Física", "Explosão Curta", "Frieza"],
    subtypes: [
      {
        id: "poacher", name: "Homem de Área", tag: "Poacher / Rompedor",
        description: "Oportunista nato na linha de impedimento. Finalizador letal de poucos toques.",
        radarValues: { "Posic. Área": 98, "Faro de Gol": 98, "Finaliz. Ambos": 90, "Força Física": 82, "Explosão Curta": 92, "Frieza": 96 },
        heatZones: [{ x: 85, y: 50, r: 14, intensity: 0.95 }, { x: 90, y: 41, r: 8, intensity: 0.68 }, { x: 90, y: 59, r: 8, intensity: 0.68 }],
        references: ["Erling Haaland", "Romário", "Inzaghi"],
        movement: { points: [[868, 330], [940, 300]], label: "Ataca a bola na área" },
        play: {
          comBola: "Finalize de primeira. Menos toques, mais gol.",
          semBola: "Ataque os espaços na área: primeiro e segundo poste.",
          dica: "Antecipe o zagueiro no cruzamento. Meio passo à frente, sempre.",
        },
      },
      {
        id: "target-man", name: "Target Man", tag: "Pivô / Referência",
        description: "Alto e forte. Recebe de costas, segura a zaga na força e escora para quem vem de trás.",
        radarValues: { "Posic. Área": 82, "Faro de Gol": 85, "Finaliz. Ambos": 80, "Força Física": 98, "Explosão Curta": 75, "Frieza": 82 },
        heatZones: [{ x: 80, y: 50, r: 16, intensity: 0.88 }, { x: 72, y: 47, r: 10, intensity: 0.58 }, { x: 72, y: 53, r: 10, intensity: 0.58 }],
        references: ["Olivier Giroud", "Zlatan Ibrahimović", "Drogba"],
        movement: { points: [[868, 330], [760, 340]], label: "Apoia de costas e tabela" },
        play: {
          comBola: "Segure a bola de costas, proteja e descarregue para quem está chegando.",
          semBola: "Seja a referência: fixe os zagueiros e abra espaço para os companheiros.",
          dica: "Use o corpo para proteger a bola. Saiba a hora de girar e de tabelar.",
        },
      },
      {
        id: "falso-9", name: "Falso 9", tag: "False 9 / Móvel",
        description: "Abandona a área e recua para arrastar zagueiros e criar superioridade numérica.",
        radarValues: { "Posic. Área": 70, "Faro de Gol": 90, "Finaliz. Ambos": 92, "Força Física": 72, "Explosão Curta": 86, "Frieza": 88 },
        heatZones: [{ x: 82, y: 50, r: 10, intensity: 0.7 }, { x: 68, y: 50, r: 14, intensity: 0.82 }, { x: 60, y: 40, r: 10, intensity: 0.58 }],
        references: ["Lionel Messi", "Roberto Firmino", "Karim Benzema"],
        movement: { points: [[868, 330], [660, 300]], label: "Sai da área para criar" },
        play: {
          comBola: "Saia da área, participe da construção e devolva em velocidade.",
          semBola: "Arraste o zagueiro para fora da linha e crie espaço para os pontas.",
          dica: "Seu movimento desorganiza a defesa — leia quando aparecer e quando sumir.",
        },
      },
    ],
  },
  {
    id: "segundo-atacante",
    name: "Segundo Atacante",
    shortName: "2AT",
    color: "#f97316",
    dbPositions: ["Segundo Atacante"],
    description: "Atua na faixa entre o Meia Ofensivo e o Centroavante em esquemas com dupla de ataque.",
    mainFunctions: ["Orbitar o Camisa 9", "Coleta de Rebotes", "Tabelas Rápidas", "Finalizações de 2a Onda"],
    radarAttributes: ["Agilidade Mental", "Leitura Espaço", "Passe Curto 1-2", "Finaliz. Curta", "Vel. Ação", "Posic. Ofens."],
    subtypes: [
      {
        id: "segundo-atacante-unico", name: "Segundo Atacante", tag: "Second Striker",
        description: "Orbita o centroavante, coleta rebotes, faz tabelas rápidas e finaliza de segunda onda.",
        radarValues: { "Agilidade Mental": 92, "Leitura Espaço": 90, "Passe Curto 1-2": 88, "Finaliz. Curta": 88, "Vel. Ação": 90, "Posic. Ofens.": 86 },
        heatZones: [{ x: 75, y: 50, r: 14, intensity: 0.88 }, { x: 82, y: 43, r: 10, intensity: 0.7 }, { x: 68, y: 47, r: 10, intensity: 0.6 }],
        references: ["Antoine Griezmann", "Lautaro Martínez", "Rodrygo Goes", "Bebeto"],
        movement: { points: [[768, 330], [880, 290]], label: "Surge na segunda onda" },
        play: {
          comBola: "Apareça atrás do centroavante para finalizar a sobra ou o rebote.",
          semBola: "Jogue nas costas do marcador e ataque a segunda onda das jogadas.",
          dica: "Leia o rebote e a sobra: esteja sempre onde a bola vai cair.",
        },
      },
    ],
  },
];

// ─── SQUAD PANEL (Admin only) ─────────────────────────────────────────────────

function SquadPanel({ position }: { position: TacticalPosition }) {
  const { data: players, isLoading } = useQuery({
    queryKey: ["lab-squad", position.id],
    queryFn: async () => {
      // Match players whose primary position OR any secondary position falls
      // in this family — a player's relevant role isn't always the primary one.
      const quotedList = position.dbPositions.map((p) => `"${p}"`).join(",");
      const { data } = await supabase
        .from("players")
        .select("id, full_name, position, secondary_positions, play_style, photo_url")
        .or(`position.in.(${quotedList}),secondary_positions.ov.{${quotedList}}`)
        .order("full_name");
      return (data ?? []) as SquadPlayer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-[58px] rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
      ))}
    </div>
  );

  if (!players?.length) return (
    <div className="text-center py-10">
      <Users className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: "#6f7a73" }} />
      <p className="text-xs" style={{ color: "#6f7a73" }}>Nenhum atleta cadastrado nessa posição</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1">
      {players.map(p => (
        <PlayerBadge key={p.id} player={p} accent={position.color} />
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const FORMATIONS = FORMATION_ORDER.map(key => TACTICAL_DICTIONARY[key]);
const FORMATION_ACCENT = "#3fcf6e";

export default function LaboratorioTaticoPage() {
  const { isAdmin, linkedPlayerId } = useAuth();
  const isPlayerView = !!linkedPlayerId;

  const [selectedFormationKey, setSelectedFormationKey] = useState(FORMATION_ORDER[0]);
  const [selectedVariationKey, setSelectedVariationKey] = useState(
    TACTICAL_DICTIONARY[FORMATION_ORDER[0]].recommendedVariation
  );

  const [selectedPositionId, setSelectedPositionId] = useState("zagueiro");
  const [selectedSubtypeId, setSelectedSubtypeId] = useState<string | null>(null);
  const [hoveredSubtypeId, setHoveredSubtypeId] = useState<string | null>(null);

  const selectedFormation = TACTICAL_DICTIONARY[selectedFormationKey];
  const selectedVariation =
    selectedFormation.variations[selectedVariationKey]
    ?? selectedFormation.variations[selectedFormation.recommendedVariation];

  // Which role families actually exist in this formation (derived from the recommended
  // variation, since slot identity doesn't change between a formation's own variations).
  const visibleFamilies = useMemo(() => {
    const recommended = selectedFormation.variations[selectedFormation.recommendedVariation];
    return new Set(
      recommended.nodes.map(n => n.family).filter((f): f is RoleFamilyId => f !== null)
    );
  }, [selectedFormation]);

  const visiblePositions = useMemo(
    () => POSITIONS.filter(p => visibleFamilies.has(p.id as RoleFamilyId)),
    [visibleFamilies]
  );

  const positionIndex = useMemo(
    () => Math.max(0, visiblePositions.findIndex(p => p.id === selectedPositionId)),
    [visiblePositions, selectedPositionId]
  );

  const selectedPosition = useMemo(
    () => POSITIONS.find(p => p.id === selectedPositionId) ?? POSITIONS[0],
    [selectedPositionId]
  );

  const selectedSubtype = useMemo(() => {
    return selectedPosition.subtypes.find(s => s.id === selectedSubtypeId)
      ?? selectedPosition.subtypes[0];
  }, [selectedPosition, selectedSubtypeId]);

  const previewSubtype = useMemo(() => {
    return selectedPosition.subtypes.find(s => s.id === hoveredSubtypeId) ?? selectedSubtype;
  }, [selectedPosition, hoveredSubtypeId, selectedSubtype]);

  const handlePositionSelect = useCallback((id: string) => {
    setSelectedPositionId(id);
    setSelectedSubtypeId(null);
    setHoveredSubtypeId(null);
  }, []);

  const handleFormationSelect = useCallback((key: string) => {
    const formation = TACTICAL_DICTIONARY[key];
    if (!formation) return;
    setSelectedFormationKey(key);
    setSelectedVariationKey(formation.recommendedVariation);
  }, []);

  // Keep the role explorer in sync: if the active family disappears from the new
  // formation (e.g. switching to 3-5-2 removes "ponta"), fall back to the first visible one.
  useEffect(() => {
    if (!visiblePositions.some(p => p.id === selectedPositionId)) {
      handlePositionSelect(visiblePositions[0]?.id ?? POSITIONS[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePositions]);

  const showSquadSection = isAdmin && !isPlayerView;

  return (
    <div className="min-h-screen font-archivo" style={{ color: "#ededee" }}>
      <div className="max-w-[1340px] mx-auto px-0 md:px-[30px] py-8 md:py-[38px] pb-16">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <header
          className="flex items-end justify-between gap-6 flex-wrap mb-9 pb-6"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.075)" }}
        >
          <div>
            <div className="font-tactical-mono text-[11px] tracking-[0.24em] uppercase font-medium inline-flex gap-[10px] items-center" style={{ color: "#62616a" }}>
              <span className="font-semibold" style={{ color: "#3fcf6e" }}>01</span>
              <span className="w-[34px] h-px bg-white/15 flex-none" />
              Laboratório Tático
            </div>
            <h1
              className="mt-[10px] font-archivo font-semibold leading-[0.98] text-[32px] md:text-[42px]"
              style={{ letterSpacing: "-0.03em", color: "#ededee" }}
            >
              Prancheta Tática
            </h1>
          </div>
          <div className="font-tactical-mono text-xs tracking-[0.1em]" style={{ color: "#62616a" }}>
            <span style={{ color: "#9c9ba3" }}>{selectedFormation.name}</span> &nbsp;/&nbsp;{" "}
            {selectedPosition.subtypes.length} variações de função
          </div>
        </header>

        {/* ── Esquema tático base ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-[22px] items-stretch mb-11">
          <FormationSelector
            formations={FORMATIONS}
            selectedFormation={selectedFormation}
            onSelect={handleFormationSelect}
          />
          <div className="flex flex-col gap-4">
            <FormationVariationTabs
              formation={selectedFormation}
              selectedVariationKey={selectedVariationKey}
              accent={FORMATION_ACCENT}
              onSelect={setSelectedVariationKey}
            />
            <TacticalDetails
              subtype={{ name: selectedVariation.label, play: selectedVariation.play }}
              accent={FORMATION_ACCENT}
              className="flex-1"
            />
          </div>
        </div>

        {/* ── Role strip nav (apenas posições reais da formação) ───────── */}
        <nav
          className="flex w-full sm:inline-flex gap-[1px] p-[3px] mb-6 rounded-[10px] sm:max-w-full"
          style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}
        >
          {visiblePositions.map((pos, i) => {
            const isActive = pos.id === selectedPositionId;
            return (
              <button
                key={pos.id}
                type="button"
                onClick={() => handlePositionSelect(pos.id)}
                className="flex-1 sm:flex-none min-w-0 inline-flex items-center justify-center gap-1 sm:gap-2.5 px-1.5 sm:px-4 py-2.5 rounded-[8px] whitespace-nowrap transition-colors duration-200"
                style={{ background: isActive ? "rgba(255,255,255,0.06)" : "transparent" }}
              >
                <span
                  className="hidden sm:inline font-tactical-mono text-xs font-semibold"
                  style={{ color: isActive ? pos.color : "#62616a" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className="font-archivo font-semibold text-[13px] sm:text-[15px]"
                  style={{ letterSpacing: "-0.005em", color: isActive ? "#ededee" : "#62616a" }}
                >
                  {pos.shortName}
                </span>
              </button>
            );
          })}
        </nav>

        {/* ── Hero: board + ghost panel ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.42fr_1fr] gap-[22px] items-stretch mb-6">
          <TacticalBoard
            positions={POSITIONS}
            nodes={selectedVariation.nodes}
            formationKey={selectedFormationKey}
            selectedPositionId={selectedPositionId}
            activeMovement={previewSubtype.movement}
            activeMovementKey={`${selectedPositionId}-${previewSubtype.id}`}
            accent={selectedPosition.color}
            onSelect={handlePositionSelect}
          />
          <TacticalGhost position={selectedPosition} positionIndex={positionIndex} totalPositions={visiblePositions.length} />
        </div>

        {/* ── Variations ───────────────────────────────────────────────── */}
        <div className="flex items-baseline justify-between gap-4 flex-wrap mb-4">
          <h3 className="font-archivo font-semibold text-[20px]" style={{ letterSpacing: "-0.015em", color: "#ededee" }}>
            Variações da função
          </h3>
          <span className="text-[13px] hidden sm:inline" style={{ color: "#62616a" }}>
            Passe o mouse para prever o movimento no campo &middot; clique para fixar
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6">
          {selectedPosition.subtypes.map((sub, i) => {
            const topAttr = selectedPosition.radarAttributes.reduce(
              (best, attr) => ((sub.radarValues[attr] ?? 0) > (sub.radarValues[best] ?? 0) ? attr : best),
              selectedPosition.radarAttributes[0]
            );
            return (
              <VariationCard
                key={sub.id}
                subtype={sub}
                index={i}
                isActive={selectedSubtype.id === sub.id}
                isPreview={hoveredSubtypeId === sub.id}
                accent={selectedPosition.color}
                topAttribute={{ label: topAttr, value: sub.radarValues[topAttr] ?? 0 }}
                onClick={() => setSelectedSubtypeId(sub.id)}
                onMouseEnter={() => setHoveredSubtypeId(sub.id)}
                onMouseLeave={() => setHoveredSubtypeId(null)}
              />
            );
          })}
        </div>

        {/* ── Detail ───────────────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedSubtype.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-[1.12fr_0.88fr] gap-[22px] items-start"
          >
            <div className="flex flex-col gap-4">
              <TacticalDetails subtype={selectedSubtype} accent={selectedPosition.color} />
              {showSquadSection && (
                <div className="rounded-[8px] p-6" style={{ background: "#141318", border: "1px solid rgba(255,255,255,0.075)" }}>
                  <div className="font-tactical-mono text-[11px] tracking-[0.16em] uppercase mb-4" style={{ color: "#62616a" }}>
                    Atletas do elenco
                  </div>
                  <SquadPanel position={selectedPosition} />
                </div>
              )}
            </div>
            <AttributesPanel
              attributes={selectedPosition.radarAttributes}
              values={selectedSubtype.radarValues}
              references={selectedSubtype.references}
              accent={selectedPosition.color}
            />
          </motion.div>
        </AnimatePresence>

        {/* ── Player view: Compare CTA ────────────────────────────────── */}
        {isPlayerView && (
          <button
            type="button"
            className="w-full mt-6 flex items-center justify-center gap-[9px] py-[13px] rounded-[8px] font-tactical-mono text-[11px] tracking-[0.12em] uppercase font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
            style={{ background: "#ec4525", color: "#fff" }}
          >
            <Users className="w-3.5 h-3.5" />
            Comparar com meu Perfil
            <ChevronRight className="w-3.5 h-3.5 ml-auto" />
          </button>
        )}
      </div>
    </div>
  );
}
