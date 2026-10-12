import { Pressable, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import {
  Activity,
  BarChart3,
  LayoutGrid,
  MessageCircle,
  Trophy,
  UserPlus,
  type LucideIcon,
} from "@/ui/Icone";
import { cores } from "@/tema";
import { Carrossel } from "@/ui/Carrossel";

// "Funções do grupo": os atalhos das sub-telas do grupo em carrossel, no mesmo
// formato das "Ações rápidas" do painel, todos com a mesma cor. "Convidar" só
// pra admin (só admin gera o link de convite). Espelha
// weracha-site/components/funcoes-do-grupo.tsx.

type Funcao = {
  titulo: string;
  subtitulo: string;
  Icone: LucideIcon;
  selo?: string;
  onPress: () => void;
};

export function FuncoesDoGrupo({
  grupoId,
  souAdmin,
  onConvidar,
}: {
  grupoId: string;
  souAdmin: boolean;
  onConvidar: () => void;
}) {
  const ir = (rota: Href) => () => router.push(rota);
  const funcoes: Funcao[] = [
    {
      titulo: "Artilheiros",
      subtitulo: "Ranking de gols",
      Icone: Trophy,
      onPress: ir(`/grupos/${grupoId}/artilheiros`),
    },
    {
      titulo: "Indicadores",
      subtitulo: "Destaques do mês",
      Icone: Activity,
      onPress: ir(`/grupos/${grupoId}/indicadores`),
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
      titulo: "Enquetes",
      subtitulo: "Vote e acompanhe",
      Icone: BarChart3,
      onPress: ir(`/grupos/${grupoId}/enquetes`),
    },
    ...(souAdmin
      ? [{ titulo: "Convidar", subtitulo: "Chame a galera", Icone: UserPlus, onPress: onConvidar }]
      : []),
  ];

  return (
    <View>
      <View style={styles.titulo}>
        <LayoutGrid size={16} color={cores.teal} />
        <Text style={styles.tituloTexto}>Funções do grupo</Text>
      </View>
      <Carrossel>
        {funcoes.map(({ titulo, subtitulo, Icone, selo, onPress }) => (
          <Pressable
            key={titulo}
            onPress={onPress}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressionado]}
          >
            {selo ? <Text style={styles.selo}>{selo}</Text> : null}
            <Icone size={20} color={cores.teal} />
            <Text style={styles.cardTitulo}>{titulo}</Text>
            <Text style={styles.cardSub}>{subtitulo}</Text>
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
