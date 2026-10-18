import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { Text } from "@/ui/Texto";
import { formatarHora } from "@/partidas";
import { cores } from "@/tema";

// Fileira de datas (mesmo carrossel do painel) pra pular entre os resultados das
// partidas finalizadas do grupo sem voltar pra tela do grupo. Espelha
// `FileiraDeDatas` de weracha-site/app/grupos/[id]/partidas/[partidaId]/resultado/page.tsx:
// data + hora em cada botão, a partida aberta em teal e já centralizada.
export function FileiraDeDatas({
  partidas,
  partidaAtualId,
  onTrocar,
}: {
  partidas: { id: string; data: string }[];
  partidaAtualId: string;
  onTrocar: (partidaId: string) => void;
}) {
  const rolagemRef = useRef<ScrollView>(null);
  const [larguraFileira, setLarguraFileira] = useState(0);
  const [posicaoAtual, setPosicaoAtual] = useState<{ x: number; largura: number } | null>(null);

  // Centraliza a data aberta assim que a fileira e o botão dela foram medidos.
  useEffect(() => {
    if (!posicaoAtual || larguraFileira === 0) return;
    const x = posicaoAtual.x - larguraFileira / 2 + posicaoAtual.largura / 2;
    rolagemRef.current?.scrollTo({ x: Math.max(0, x), animated: false });
  }, [posicaoAtual, larguraFileira]);

  // Rótulo fixo à esquerda e só as datas rolando, igual aos filtros "Grupos" e
  // "Meses" de Artilheiros e Minha performance.
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>Jogos</Text>
      <ScrollView
        ref={rolagemRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rolagem}
        contentContainerStyle={styles.fileira}
        onLayout={(e) => setLarguraFileira(e.nativeEvent.layout.width)}
      >
        {partidas.map((p) => {
          const data = new Date(p.data);
          const atual = p.id === partidaAtualId;
          return (
            <Pressable
              key={p.id}
              disabled={atual}
              onPress={() => onTrocar(p.id)}
              onLayout={
                atual
                  ? (e: LayoutChangeEvent) =>
                      setPosicaoAtual({ x: e.nativeEvent.layout.x, largura: e.nativeEvent.layout.width })
                  : undefined
              }
              style={[styles.botao, atual && styles.botaoAtual]}
            >
              <View style={styles.centro}>
                <Text style={[styles.data, atual && styles.textoAtual]}>
                  {String(data.getDate()).padStart(2, "0")}/{String(data.getMonth() + 1).padStart(2, "0")}
                </Text>
                {/* Hora sempre: distingue os jogos de um mesmo dia. */}
                <Text style={[styles.hora, atual && styles.textoAtual]}>{formatarHora(data)}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Mesmo estilo do `filtroRotulo` de TelaArtilheiros / TelaEstatisticas.
  rotulo: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  rolagem: { flex: 1 },
  fileira: { gap: 8 },
  botao: {
    width: 68,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: cores.cardFundo,
  },
  botaoAtual: { borderColor: cores.teal, backgroundColor: "rgba(31, 179, 163, 0.15)" },
  centro: { alignItems: "center" },
  data: { fontSize: 14, fontWeight: "600", color: cores.branco },
  hora: { fontSize: 11, color: cores.slate400 },
  textoAtual: { color: cores.teal },
});
