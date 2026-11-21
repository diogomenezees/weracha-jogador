import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import {
  Activity,
  BarChart3,
  CalendarPlus,
  LayoutGrid,
  Lock,
  MessageCircle,
  Settings,
  Star,
  ThumbsUp,
  Trophy,
  UserPlus,
  type LucideIcon,
} from "@/ui/Icone";
import { cores } from "@/tema";
import { Carrossel } from "@/ui/Carrossel";
import type { MomentoDoMeuScore } from "@/grupos";

// "Atalhos do grupo": os atalhos das sub-telas do grupo em carrossel, no mesmo
// formato das "Ações rápidas" do painel, todos com a mesma cor. "Convidar" pra
// qualquer membro. "Partida" (adicionar) só quando a tela passa
// `onAdicionarPartida` (admin de grupo avulso). "Meu score" abre o
// ModalMeuScore: o score é o que equilibra os times. Fica na penúltima posição
// (antes de "Convidar"), mas com o check-in aberto sobe pra primeira, em
// laranja; quando o score congela (1h antes) volta pro lugar com cadeado — o
// modal ainda abre (a posição não congela) e explica a trava. Jogador novo no
// grupo também tem o card em primeiro e em laranja, o tempo todo, até jogar a
// 1ª partida. Ver momentoDoMeuScore em src/grupos.ts. "Avaliar" (laranja, em
// primeiro) só existe durante a votação da avaliação aberta pra mim (24h). Espelha
// weracha-site/components/funcoes-do-grupo.tsx.
//
// Grupo sem nenhum resultado ainda (`semResultado`, decidido 2026-11-20): a ordem
// muda pro que serve antes do 1º jogo: Meu score (sempre em primeiro; laranja como
// no check-in, menos quando travado), Convidar, Partida, Enquetes, Artilheiros, Indicadores
// e Resenha bloqueados ("Depois do 1º jogo",
// mesmo visual apagado das Ações rápidas do painel) e Configurações por último.

type Funcao = {
  titulo: string;
  subtitulo: string;
  Icone: LucideIcon;
  selo?: string;
  destaque?: boolean;
  // null = bloqueado (apagado, sem toque).
  onPress: (() => void) | null;
};

const SUBTITULO_BLOQUEADO = "Depois do 1º jogo";

export function FuncoesDoGrupo({
  avaliar,
  grupoId,
  onConvidar,
  onAdicionarPartida,
  meuScore,
  momentoMeuScore,
  onMeuScore,
  souAdmin,
  semResultado = false,
  scorePadrao = false,
}: {
  // Votação da avaliação aberta pra mim (24h depois da partida): card laranja
  // "Avaliar" em primeiro, direto pra votação. Fora da janela, undefined.
  avaliar?: { partidaId: string; data: string };
  grupoId: string;
  onConvidar: () => void;
  onAdicionarPartida?: () => void;
  meuScore: number;
  momentoMeuScore: MomentoDoMeuScore;
  onMeuScore: () => void;
  souAdmin: boolean;
  // Grupo sem nenhuma partida com resultado: ordem de quem está começando (ver acima).
  semResultado?: boolean;
  // Meu score ainda no padrão (nunca ajustado nesse grupo): card em primeiro e em
  // laranja, no lugar do antigo alerta "Seu score nesse grupo ainda está no padrão"
  // do topo da tela (removido 2026-11-20). Travado não destaca.
  scorePadrao?: boolean;
}) {
  const ir = (rota: Href) => () => router.push(rota);
  const noCheckin = momentoMeuScore === "checkin";
  const novato = momentoMeuScore === "novato";
  const travado = momentoMeuScore === "travado";
  const emDestaque = noCheckin || novato || ((semResultado || scorePadrao) && !travado);
  const cardMeuScore: Funcao = travado
    ? {
        titulo: "Meu score",
        subtitulo: `Travado em ${meuScore}`,
        Icone: Lock,
        onPress: onMeuScore,
      }
    : {
        titulo: "Meu score",
        subtitulo:
          novato || semResultado || scorePadrao
            ? `Ajuste: ${meuScore}`
            : noCheckin
              ? `Confira: ${meuScore}`
              : `Está em ${meuScore}`,
        Icone: Star,
        destaque: emDestaque,
        onPress: onMeuScore,
      };

  const cardAvaliar: Funcao[] = avaliar
    ? [
        {
          titulo: "Avaliar",
          subtitulo: `Jogo de ${diaMes(new Date(avaliar.data))}`,
          Icone: ThumbsUp,
          destaque: true,
          onPress: ir(`/grupos/${grupoId}/partidas/${avaliar.partidaId}/avaliacao`),
        },
      ]
    : [];
  const cardArtilheiros: Funcao = {
    titulo: "Artilheiros",
    subtitulo: semResultado ? SUBTITULO_BLOQUEADO : "Ranking de gols",
    Icone: Trophy,
    onPress: semResultado ? null : ir(`/grupos/${grupoId}/artilheiros`),
  };
  const cardResenha: Funcao = {
    titulo: "Resenha",
    subtitulo: semResultado ? SUBTITULO_BLOQUEADO : "Vídeos do jogo",
    Icone: MessageCircle,
    onPress: semResultado ? null : ir(`/grupos/${grupoId}/resenha`),
  };
  const cardIndicadores: Funcao = {
    titulo: "Indicadores",
    subtitulo: semResultado ? SUBTITULO_BLOQUEADO : "Destaques do mês",
    Icone: Activity,
    onPress: semResultado ? null : ir(`/grupos/${grupoId}/indicadores`),
  };
  const cardEnquetes: Funcao = {
    titulo: "Enquetes",
    subtitulo: "Vote e acompanhe",
    Icone: BarChart3,
    onPress: ir(`/grupos/${grupoId}/enquetes`),
  };
  const cardPartida: Funcao[] = onAdicionarPartida
    ? [
        {
          titulo: "Partida",
          subtitulo: "Marque outro jogo",
          Icone: CalendarPlus,
          onPress: onAdicionarPartida,
        },
      ]
    : [];
  const cardConvidar: Funcao = {
    titulo: "Convidar",
    subtitulo: "Chame a galera",
    Icone: UserPlus,
    onPress: onConvidar,
  };
  // Só admin: horário do check-in, limite de jogadores e jogadores por time.
  const cardConfiguracoes: Funcao[] = souAdmin
    ? [
        {
          titulo: "Configurações",
          subtitulo: "Regras do grupo",
          Icone: Settings,
          onPress: ir(`/grupos/${grupoId}/configuracoes`),
        },
      ]
    : [];

  const funcoes: Funcao[] = semResultado
    ? [
        ...cardAvaliar,
        cardMeuScore,
        cardConvidar,
        ...cardPartida,
        cardEnquetes,
        cardArtilheiros,
        cardIndicadores,
        cardResenha,
        ...cardConfiguracoes,
      ]
    : [
        ...cardAvaliar,
        ...(emDestaque ? [cardMeuScore] : []),
        // Resenha depois de Enquetes: nem todo grupo grava com o We Racha Cam ainda.
        cardArtilheiros,
        cardIndicadores,
        cardEnquetes,
        cardResenha,
        ...cardPartida,
        ...(emDestaque ? [] : [cardMeuScore]),
        cardConvidar,
        ...cardConfiguracoes,
      ];

  return (
    <View>
      <View style={styles.titulo}>
        <LayoutGrid size={16} color={cores.teal} />
        <Text style={styles.tituloTexto}>Atalhos do grupo</Text>
      </View>
      <Carrossel>
        {funcoes.map(({ titulo, subtitulo, Icone, selo, destaque, onPress }) => (
          <Pressable
            key={titulo}
            onPress={onPress ?? undefined}
            disabled={!onPress}
            style={({ pressed }) => [
              styles.card,
              destaque && styles.cardDestaque,
              !onPress && styles.cardBloqueado,
              pressed && (destaque ? styles.cardDestaquePressionado : styles.cardPressionado),
            ]}
          >
            {selo ? <Text style={styles.selo}>{selo}</Text> : null}
            <Icone size={20} color={destaque ? cores.orange : onPress ? cores.teal : cores.slate500} />
            {/* Uma linha sempre: em tela estreita ou fonte do sistema maior,
                "Configurações" quebrava e esticava todos os cards. Encolhe a
                fonte em vez de quebrar. */}
            <Text
              style={styles.cardTitulo}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {titulo}
            </Text>
            <Text style={[styles.cardSub, destaque && styles.cardSubDestaque]}>{subtitulo}</Text>
          </Pressable>
        ))}
      </Carrossel>
    </View>
  );
}

function diaMes(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  titulo: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  tituloTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  card: {
    width: 104,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: cores.cardFundo,
  },
  cardPressionado: { backgroundColor: cores.superficieMedia },
  cardBloqueado: { opacity: 0.5 },
  cardDestaque: {
    borderColor: "rgba(242, 140, 30, 0.6)",
    backgroundColor: "rgba(242, 140, 30, 0.15)",
  },
  cardDestaquePressionado: { backgroundColor: "rgba(242, 140, 30, 0.25)" },
  cardSubDestaque: { color: "#fed7aa" },
  cardTitulo: { fontSize: 13, fontWeight: "600", color: cores.branco, textAlign: "center" },
  cardSub: { fontSize: 11, lineHeight: 15, color: cores.slate400, textAlign: "center" },
  selo: {
    position: "absolute",
    top: 4,
    right: 4,
    fontSize: 9,
    lineHeight: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: cores.beta,
    borderWidth: 1,
    borderColor: cores.betaBorda,
    backgroundColor: cores.betaFundo,
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: "hidden",
  },
});
