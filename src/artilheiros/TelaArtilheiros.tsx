import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { AvatarJogador } from "@/ui/AvatarJogador";
import { Podio } from "@/artilheiros/Podio";
import {
  CHAVE_GERAL,
  golsLabel,
  mesNaFrase,
  rankingDoPeriodo,
  zeradosDoPeriodo,
} from "@/artilheiros/ranking";
import { cores, raio } from "@/tema";
import type { DadosArtilheiros, LinhaRanking, PeriodoArtilheiros } from "@/contrato/tipos";

export function TelaArtilheiros({
  dados,
  aoTrocarEsporte,
  esporteCarregando = null,
  aoMudarContexto,
}: {
  dados: DadosArtilheiros;
  aoTrocarEsporte?: (esporte: string) => void;
  esporteCarregando?: string | null;
  /** Reporta o período aberto + ranking dele pro pai montar o compartilhamento
   * (o botão mora no cabeçalho da tela, não aqui — mesmo desenho do site). */
  aoMudarContexto?: (ctx: { periodo: PeriodoArtilheiros; ranking: LinhaRanking[] }) => void;
}) {
  const [periodoChave, setPeriodoChave] = useState(dados.periodoInicial);
  const [zeradosAbertos, setZeradosAbertos] = useState(false);

  const periodo =
    dados.periodos.find((p) => p.chave === periodoChave) ?? dados.periodos[0] ?? null;
  const chave = periodo?.chave ?? CHAVE_GERAL;

  const ranking = useMemo(() => rankingDoPeriodo(dados, chave), [dados, chave]);
  const zerados = useMemo(() => zeradosDoPeriodo(dados, chave), [dados, chave]);

  const top3 = ranking.slice(0, 3);
  const restante = ranking.slice(3);
  const minhaLinha = ranking.find((r) => r.souEu) ?? null;
  const minhaNoPodio = top3.some((r) => r.souEu);

  const ehGrupo = dados.escopo.tipo === "grupo";
  const esporteScope = dados.escopo.tipo === "esporte" ? dados.escopo : null;
  const nomeEsporte =
    dados.escopo.tipo === "esporte" ? dados.escopo.esporteSelecionado : dados.escopo.esporte;
  const soGeral = dados.periodos.length <= 1;
  const trocando = !!esporteCarregando;

  function escolherEsporte() {
    if (!esporteScope || !aoTrocarEsporte) return;
    Alert.alert("Esporte", undefined, [
      ...esporteScope.esportesDisponiveis.map((esp) => ({
        text: esp + (esp === esporteScope.esporteSelecionado ? " ✓" : ""),
        onPress: () => {
          if (esp !== esporteScope.esporteSelecionado) aoTrocarEsporte(esp);
        },
      })),
      { text: "Fechar", style: "cancel" as const },
    ]);
  }

  useEffect(() => {
    if (periodo) aoMudarContexto?.({ periodo, ranking });
  }, [periodo, ranking, aoMudarContexto]);

  return (
    <View style={[styles.container, trocando && styles.trocando]}>
      {esporteScope && esporteScope.esportesDisponiveis.length > 1 && (
        <View style={styles.filtroLinha}>
          <Text style={styles.filtroRotulo}>Esporte</Text>
          <Pressable style={styles.chipSel} onPress={escolherEsporte} disabled={trocando}>
            <Text style={styles.chipSelTexto} numberOfLines={1}>
              {esporteScope.esporteSelecionado ?? "Escolher"}
            </Text>
            <Text style={styles.chipSelSeta}>{trocando ? "…" : "▾"}</Text>
          </Pressable>
        </View>
      )}

      {dados.periodos.length > 1 && (
        <View style={styles.filtroLinha}>
          <Text style={styles.filtroRotulo}>Meses</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {dados.periodos.map((p) => {
              const ativo = p.chave === chave;
              return (
                <Pressable
                  key={p.chave}
                  style={[styles.chip, ativo && styles.chipAtivo]}
                  onPress={() => {
                    setPeriodoChave(p.chave);
                    setZeradosAbertos(false);
                  }}
                >
                  {p.emAndamento ? (
                    <View style={[styles.ponto, ativo ? styles.pontoAtivo : styles.pontoInativo]} />
                  ) : null}
                  <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                    {p.rotuloCurto}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Podio top3={top3} />

      {ranking.length === 0 && (
        <Text style={styles.vazio}>
          {periodo?.emAndamento
            ? `Ainda não teve gols em ${mesNaFrase(periodo.rotulo)}. Bora abrir o placar.`
            : soGeral
              ? `Ninguém marcou gols ainda${nomeEsporte ? ` em ${nomeEsporte}` : ""}.`
              : "Ninguém marcou gols nesse período."}
        </Text>
      )}

      {minhaLinha && !minhaNoPodio && (
        <View style={styles.minhaLinha}>
          <Text style={styles.minhaLinhaTexto}>
            Sua posição: <Text style={styles.bold}>{minhaLinha.posicao}º</Text>
          </Text>
          <Text style={styles.minhaLinhaGols}>{golsLabel(minhaLinha.gols)}</Text>
        </View>
      )}

      {restante.length > 0 && (
        <View style={styles.secao}>
          <Text style={styles.secaoTitulo}>Ranking completo</Text>
          {restante.map((j) => (
            <View key={j.indice} style={[styles.linha, j.souEu && styles.linhaEu]}>
              <AvatarJogador nome={j.nome} fotoUrl={j.fotoUrl} tamanho={38} />
              <View style={styles.linhaNomes}>
                <Text style={styles.linhaNome} numberOfLines={1}>
                  {j.nome}
                </Text>
                {j.apelido ? (
                  <Text style={styles.linhaApelido} numberOfLines={1}>
                    {j.apelido}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.linhaStats}>
                <Text style={styles.linhaPos}>{j.posicao}º</Text>
                <Text style={styles.linhaSep}> · </Text>
                <Text style={styles.linhaGols}>{golsLabel(j.gols)}</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {ehGrupo && zerados.length > 0 && (
        <View style={styles.secao}>
          <Pressable style={styles.zeradosBotao} onPress={() => setZeradosAbertos((v) => !v)}>
            <Text style={styles.zeradosTitulo}>
              {chave === CHAVE_GERAL
                ? "Ainda não marcou no grupo"
                : `Ainda não marcou em ${periodo ? mesNaFrase(periodo.rotulo) : "no mês"}`}{" "}
              ({zerados.length})
            </Text>
            <Text style={styles.zeradosSeta}>{zeradosAbertos ? "▲" : "▼"}</Text>
          </Pressable>
          {zeradosAbertos && (
            <View style={styles.zeradosGrade}>
              {zerados.map((z) => (
                <View key={z.indice} style={styles.zeradoItem}>
                  <AvatarJogador nome={z.nome} fotoUrl={z.fotoUrl} tamanho={30} />
                  <View style={styles.zeradoNomes}>
                    <Text style={styles.zeradoNome} numberOfLines={1}>
                      {z.nome}
                    </Text>
                    {z.apelido ? (
                      <Text style={styles.zeradoApelido} numberOfLines={1}>
                        {z.apelido}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 18 },
  trocando: { opacity: 0.6 },
  filtroLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  filtroRotulo: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  chipSel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    paddingHorizontal: 10,
    paddingVertical: 3,
    maxWidth: 200,
  },
  chipSelTexto: { fontSize: 12, fontWeight: "600", color: cores.branco, flexShrink: 1 },
  chipSelSeta: { fontSize: 10, color: cores.slate400 },
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
  vazio: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 14,
    fontSize: 13,
    color: cores.slate400,
    textAlign: "center",
  },
  minhaLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.teal,
    backgroundColor: cores.avisoFundo,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  minhaLinhaTexto: { fontSize: 14, color: cores.branco },
  minhaLinhaGols: { fontSize: 14, fontWeight: "700", color: cores.teal },
  bold: { fontWeight: "700" },
  secao: { gap: 8 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.campo,
    backgroundColor: cores.cardFundo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  linhaEu: { borderColor: cores.teal },
  linhaNomes: { flex: 1 },
  linhaNome: { fontSize: 14, color: cores.branco },
  linhaApelido: { fontSize: 12, color: cores.slate400 },
  linhaStats: { fontSize: 13, fontWeight: "700" },
  linhaPos: { color: cores.slate300 },
  linhaSep: { color: cores.slate600 },
  linhaGols: { color: cores.teal },
  zeradosBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.superficieSutil,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  zeradosTitulo: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  zeradosSeta: { fontSize: 10, color: cores.slate400 },
  zeradosGrade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  zeradoItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    backgroundColor: cores.superficieSutil,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  zeradoNomes: { flex: 1 },
  zeradoNome: { fontSize: 12, color: cores.slate300 },
  zeradoApelido: { fontSize: 11, color: cores.slate500 },
});
