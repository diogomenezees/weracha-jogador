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
  Star,
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
// 1ª partida. Ver momentoDoMeuScore em src/grupos.ts. Espelha
// weracha-site/components/funcoes-do-grupo.tsx.

type Funcao = {
  titulo: string;
  subtitulo: string;
  Icone: LucideIcon;
  selo?: string;
  destaque?: boolean;
  onPress: () => void;
};

export function FuncoesDoGrupo({
  grupoId,
  onConvidar,
  onAdicionarPartida,
  meuScore,
  momentoMeuScore,
  onMeuScore,
}: {
  grupoId: string;
  onConvidar: () => void;
  onAdicionarPartida?: () => void;
  meuScore: number;
  momentoMeuScore: MomentoDoMeuScore;
  onMeuScore: () => void;
}) {
  const ir = (rota: Href) => () => router.push(rota);
  const noCheckin = momentoMeuScore === "checkin";
  const novato = momentoMeuScore === "novato";
  const emDestaque = noCheckin || novato;
  const cardMeuScore: Funcao =
    momentoMeuScore === "travado"
      ? {
          titulo: "Meu score",
          subtitulo: `Travado em ${meuScore}`,
          Icone: Lock,
          onPress: onMeuScore,
        }
      : {
          titulo: "Meu score",
          subtitulo: novato
            ? `Ajuste: ${meuScore}`
            : noCheckin
              ? `Confira: ${meuScore}`
              : `Está em ${meuScore}`,
          Icone: Star,
          destaque: emDestaque,
          onPress: onMeuScore,
        };
  const funcoes: Funcao[] = [
    ...(emDestaque ? [cardMeuScore] : []),
    {
      titulo: "Artilheiros",
      subtitulo: "Ranking de gols",
      Icone: Trophy,
      onPress: ir(`/grupos/${grupoId}/artilheiros`),
    },
    {
      titulo: "Resenha",
      subtitulo: "Vídeos do jogo",
      Icone: MessageCircle,
      // Depende dos replays do We Racha Cam, que nem todo grupo usa.
      selo: "Beta",
      onPress: ir(`/grupos/${grupoId}/resenha`),
    },
    {
      titulo: "Indicadores",
      subtitulo: "Destaques do mês",
      Icone: Activity,
      onPress: ir(`/grupos/${grupoId}/indicadores`),
    },
    {
      titulo: "Enquetes",
      subtitulo: "Vote e acompanhe",
      Icone: BarChart3,
      onPress: ir(`/grupos/${grupoId}/enquetes`),
    },
    ...(onAdicionarPartida
      ? [
          {
            titulo: "Partida",
            subtitulo: "Marque outro jogo",
            Icone: CalendarPlus,
            onPress: onAdicionarPartida,
          },
        ]
      : []),
    ...(emDestaque ? [] : [cardMeuScore]),
    { titulo: "Convidar", subtitulo: "Chame a galera", Icone: UserPlus, onPress: onConvidar },
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
            onPress={onPress}
            style={({ pressed }) => [
              styles.card,
              destaque && styles.cardDestaque,
              pressed && (destaque ? styles.cardDestaquePressionado : styles.cardPressionado),
            ]}
          >
            {selo ? <Text style={styles.selo}>{selo}</Text> : null}
            <Icone size={20} color={destaque ? cores.orange : cores.teal} />
            <Text style={styles.cardTitulo}>{titulo}</Text>
            <Text style={[styles.cardSub, destaque && styles.cardSubDestaque]}>{subtitulo}</Text>
          </Pressable>
        ))}
      </Carrossel>
    </View>
  );
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
    color: cores.ambar,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.4)",
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: "hidden",
  },
});
