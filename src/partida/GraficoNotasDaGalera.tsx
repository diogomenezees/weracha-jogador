import { Pressable, StyleSheet, View } from "react-native";

import type { NotaNoRanking } from "@/contrato/avaliacoes";
import { plural } from "@/partida/AvaliacaoGalera";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { Crown } from "@/ui/Icone";
import { Text } from "@/ui/Texto";
import { cores, raio } from "@/tema";

// Ranking das notas da galera (tela "Notas da galera", desde 2026-11-10): uma
// linha por jogador, maior média em cima, com posição, foto, nome completo (o
// apelido ao lado, apagado), a nota à direita e uma barra fina de 0 a 100 embaixo
// do nome. Lista na vertical (não colunas rolando pro lado, testadas e trocadas
// no mesmo dia: escondiam a maior parte da galera e espremiam o nome). Eu em
// laranja, os outros em teal; o 1º (craque popular) com a coroa. Quem ainda não
// recebeu voto fica no fim, com "—" e a barra vazia. Cada jogador num card
// próprio, igual a lista de Jogadores do grupo (sem borda em volta da lista), e
// tocar no card abre o perfil do jogador (onAbrirPerfil), como nas outras telas. Espelha
// weracha-site/components/grafico-notas-galera.tsx.
export function GraficoNotasDaGalera({
  ranking,
  meuId,
  onAbrirPerfil,
}: {
  ranking: NotaNoRanking[];
  meuId: string;
  onAbrirPerfil: (jogadorId: string) => void;
}) {
  return (
    <View style={styles.caixa}>
      {ranking.map((j, i) => {
        const souEu = j.id === meuId;
        const craque = i === 0 && j.media !== null;
        const apelido = j.apelido?.trim();
        return (
          <Pressable
            key={j.id}
            style={[styles.linha, souEu && styles.linhaEu]}
            onPress={() => onAbrirPerfil(j.id)}
            accessibilityRole="button"
            accessibilityLabel={`${i + 1}º ${j.nome}: ${
              j.media === null ? "sem voto ainda" : `${j.media}, ${plural(j.quantidade, "voto", "votos")}`
            }`}
          >
            {/* Posição (coroa no craque popular). */}
            <View style={styles.posicao}>
              {craque && <Crown size={14} color={cores.orange} />}
              <Text style={styles.posicaoTexto}>{i + 1}º</Text>
            </View>
            <AvatarJogador id={j.id} nome={j.nome} fotoUrl={j.fotoUrl} tamanho={36} />
            <View style={styles.meio}>
              <Text style={styles.nomeLinha} numberOfLines={1}>
                <Text style={[styles.nome, souEu && styles.nomeEu]}>{j.nome}</Text>
                {apelido ? <Text style={styles.apelido}> {apelido}</Text> : null}
              </Text>
              <View style={styles.trilho}>
                {j.media !== null && (
                  <View
                    style={[
                      styles.preenchido,
                      {
                        width: `${j.media}%`,
                        backgroundColor: souEu ? cores.orange : cores.teal,
                      },
                    ]}
                  />
                )}
              </View>
            </View>
            <View style={styles.direita}>
              <Text style={[styles.nota, j.media === null && styles.notaVazia]}>
                {j.media ?? "—"}
              </Text>
              <Text style={styles.votos}>
                {j.quantidade === 0 ? "sem voto" : plural(j.quantidade, "voto", "votos")}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: { gap: 8 },
  // Mesmo card da lista de Jogadores do grupo.
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 10,
  },
  linhaEu: { borderColor: "rgba(242, 140, 30, 0.6)", backgroundColor: "rgba(242, 140, 30, 0.06)" },
  posicao: { width: 28, alignItems: "center" },
  posicaoTexto: { fontSize: 14, fontWeight: "600", color: cores.slate400 },
  meio: { flex: 1, minWidth: 0 },
  nomeLinha: { fontSize: 14 },
  nome: { fontWeight: "600", color: cores.branco },
  nomeEu: { color: cores.orange },
  apelido: { fontWeight: "400", color: cores.slate400 },
  trilho: {
    marginTop: 6,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  preenchido: { height: "100%", borderRadius: 3 },
  direita: { width: 48, alignItems: "flex-end" },
  nota: { fontSize: 16, fontWeight: "700", color: cores.branco, fontVariant: ["tabular-nums"] },
  notaVazia: { color: cores.slate500 },
  votos: { fontSize: 10, color: cores.slate500 },
});
