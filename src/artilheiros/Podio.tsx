import { StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { AvatarJogador } from "@/ui/AvatarJogador";
import { cores } from "@/tema";
import { golsLabel } from "@/artilheiros/ranking";
import type { LinhaRanking } from "@/contrato/tipos";

const MEDALHAS = ["🥇", "🥈", "🥉"];
// 2º à esquerda, 1º ao centro, 3º à direita. Índices referem-se a top3.
const ORDEM_VISUAL = [1, 0, 2];
const ALTURAS = [92, 62, 46];

export function Podio({
  top3,
  mostrarVazios = true,
}: {
  top3: LinhaRanking[];
  mostrarVazios?: boolean;
}) {
  if (top3.length === 0 && !mostrarVazios) return null;

  return (
    <View style={styles.grade}>
      {ORDEM_VISUAL.map((indice) => {
        const jogador = top3[indice];
        const eh1 = indice === 0;

        if (!jogador) {
          if (!mostrarVazios) return <View key={indice} style={styles.coluna} />;
          return (
            <View key={indice} style={styles.coluna}>
              <Text style={[styles.medalha, eh1 && styles.medalha1, { opacity: 0.25 }]}>
                {MEDALHAS[indice]}
              </Text>
              <View style={[styles.avatarVago, eh1 ? styles.avatar1 : styles.avatar2]}>
                <Text style={styles.traco}>–</Text>
              </View>
              <Text style={styles.nomeVago} numberOfLines={1}>
                Vago
              </Text>
              <View style={[styles.degrau, styles.degrauVago, { height: ALTURAS[indice] }]}>
                <Text style={styles.posVago}>{indice + 1}º</Text>
              </View>
            </View>
          );
        }

        const souEu = jogador.souEu;
        const ouro = eh1 && !souEu;
        return (
          <View key={indice} style={styles.coluna}>
            <Text style={[styles.medalha, eh1 && styles.medalha1]}>{MEDALHAS[indice]}</Text>
            <AvatarJogador
              nome={jogador.nome}
              fotoUrl={jogador.fotoUrl}
              tamanho={eh1 ? 60 : 52}
              anel={souEu ? "teal" : ouro ? "orange" : undefined}
            />
            <Text style={styles.nome} numberOfLines={1}>
              {jogador.nome}
            </Text>
            {jogador.apelido ? (
              <Text style={styles.apelido} numberOfLines={1}>
                {jogador.apelido}
              </Text>
            ) : null}
            <View
              style={[
                styles.degrau,
                { height: ALTURAS[indice] },
                souEu ? styles.degrauTeal : ouro ? styles.degrauOuro : styles.degrauNeutro,
              ]}
            >
              <Text style={styles.pos}>{jogador.posicao}º</Text>
              <Text style={[styles.gols, ouro ? styles.golsOuro : styles.golsTeal]}>
                {golsLabel(jogador.gols)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grade: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  coluna: { flex: 1, alignItems: "center", gap: 5 },
  medalha: { fontSize: 22 },
  medalha1: { fontSize: 28 },
  avatarVago: {
    borderRadius: 999,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar1: { width: 56, height: 56 },
  avatar2: { width: 50, height: 50 },
  traco: { color: cores.slate600, fontSize: 16 },
  nome: { fontSize: 12, fontWeight: "600", color: cores.branco, textAlign: "center", maxWidth: "100%" },
  apelido: { fontSize: 11, color: cores.slate300, textAlign: "center", maxWidth: "100%" },
  nomeVago: { fontSize: 12, fontWeight: "600", color: cores.slate600, textAlign: "center" },
  degrau: {
    width: "100%",
    alignItems: "center",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 6,
  },
  degrauNeutro: { borderColor: cores.cardBorda, backgroundColor: cores.cardFundo },
  degrauTeal: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  degrauOuro: { borderColor: cores.orange, backgroundColor: cores.laranjaFundo },
  degrauVago: {
    borderColor: "rgba(31,179,163,0.15)",
    borderStyle: "dashed",
    backgroundColor: cores.superficieSutil,
  },
  pos: { fontSize: 12, fontWeight: "700", color: cores.slate300 },
  posVago: { fontSize: 12, fontWeight: "700", color: cores.slate600 },
  gols: { fontSize: 13, fontWeight: "700" },
  golsTeal: { color: cores.teal },
  golsOuro: { color: cores.orange, fontSize: 15 },
});
