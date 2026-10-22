import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { cores } from "@/tema";
import type { PeriodoArtilheiros } from "@/contrato/tipos";

// Linha de filtro por chips ("GRUPOS  [Geral] [Pelada A] [Pelada B]"), no mesmo visual
// dos chips de Grupos/Meses dos Artilheiros (src/artilheiros/TelaArtilheiros.tsx). Usada
// nas listas de vídeo (Meus replays e Resenha do grupo). `valor` null é o chip "Geral"
// (sem filtro). A tira rola na horizontal quando não cabe. Espelha
// weracha-site/components/filtro-chips.tsx.
export type OpcaoChip = { valor: string | null; rotulo: string; emAndamento?: boolean };

export function FiltroChips({
  rotulo,
  opcoes,
  ativo,
  carregando = false,
  onEscolher,
}: {
  rotulo: string;
  opcoes: OpcaoChip[];
  ativo: string | null;
  // A página do chip escolhido ainda está chegando (mostra o spinner nele).
  carregando?: boolean;
  onEscolher: (valor: string | null) => void;
}) {
  return (
    <View style={styles.linha}>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {opcoes.map((o) => {
          const selecionado = o.valor === ativo;
          return (
            <Pressable
              key={o.valor ?? "GERAL"}
              style={[styles.chip, selecionado && styles.chipAtivo]}
              onPress={() => {
                if (!selecionado) onEscolher(o.valor);
              }}
            >
              {carregando && selecionado ? (
                <ActivityIndicator size={10} color={cores.dark} />
              ) : o.emAndamento ? (
                <View style={[styles.ponto, selecionado ? styles.pontoAtivo : styles.pontoInativo]} />
              ) : null}
              <Text style={[styles.chipTexto, selecionado && styles.chipTextoAtivo]}>
                {o.rotulo}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Chips de mês: "Geral" (todos) + os meses que vieram da API, do mais antigo pro mais
// recente (mesma ordem dos Artilheiros).
export function opcoesDeMeses(meses: PeriodoArtilheiros[]): OpcaoChip[] {
  return [
    { valor: null, rotulo: "Geral" },
    ...meses.map((m) => ({ valor: m.chave, rotulo: m.rotuloCurto, emAndamento: m.emAndamento })),
  ];
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
  rotulo: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  chips: { gap: 6, paddingRight: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipAtivo: { backgroundColor: cores.teal, borderColor: cores.teal },
  chipTexto: { fontSize: 12, color: cores.slate300 },
  chipTextoAtivo: { color: cores.dark, fontWeight: "700" },
  ponto: { width: 4, height: 4, borderRadius: 2 },
  pontoAtivo: { backgroundColor: cores.dark },
  pontoInativo: { backgroundColor: cores.teal },
});
