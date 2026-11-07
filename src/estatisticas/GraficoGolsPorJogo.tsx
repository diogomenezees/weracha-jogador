import { useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { Text } from "@/ui/Texto";
import { ChevronDown, ChevronUp } from "@/ui/Icone";
import { formatarMedia, media } from "@/estatisticas";
import { cores, fontes, raio } from "@/tema";
// Mínimo que o gráfico precisa de cada jogo (o do jogador e o do grupo servem).
export type JogoNoGrafico = { partidaId: string; data: string; mes: string; gols: number };

// Gols por jogo, desde sempre (só o filtro de grupo se aplica). Uma coluna por
// jogo, em ordem cronológica, com a linha da média (e, opcional, uma linha
// tracejada de comparação). Com muitos jogos a área
// rola na horizontal e abre já no fim (os jogos mais recentes). O mês escolhido
// nos filtros fica em destaque; os outros jogos ficam esmaecidos. Tocar numa
// coluna mostra o jogo na linha de leitura acima. Espelha
// weracha-site/components/grafico-gols-por-jogo.tsx.

// Altura padrão da área das colunas (a Performance); o modal do jogador usa menor.
const ALTURA_PADRAO = 140;
const TOPO = 10;
const SLOT = 20; // largura MÍNIMA de cada jogo (abaixo disso, rola)
const BARRA = 12; // largura mínima da coluna
const BARRA_MAX = 24; // com poucos jogos a coluna alarga até aqui
const RAIO = 4;
const EIXO = 22;

function formatarData(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getFullYear()).slice(2)}`;
}

// Coluna com o topo arredondado e a base reta.
function caminhoColuna(x: number, y: number, largura: number, altura: number): string {
  const r = Math.min(RAIO, altura, largura / 2);
  const base = y + altura;
  return `M${x},${base} V${y + r} Q${x},${y} ${x + r},${y} H${x + largura - r} Q${x + largura},${y} ${x + largura},${y + r} V${base} Z`;
}

export function GraficoGolsPorJogo<T extends JogoNoGrafico>({
  jogos,
  mesDestacado,
  descrever,
  rotuloMedia = "sua média",
  comparacao = null,
  unidade = { um: "gol", varios: "gols" },
  lista = true,
  coluna = { um: "jogo", varios: "jogos" },
  rotular = (jogo: T) => formatarData(jogo.data),
  altura: ALTURA = ALTURA_PADRAO,
  compacto = false,
  resumo,
  linha,
}: {
  jogos: T[];
  // "AAAA-MM" quando um mês está escolhido; null no Geral.
  mesDestacado: string | null;
  // Complemento da linha de leitura e da lista (ex.: o nome do grupo).
  descrever?: (jogo: T) => string;
  rotuloMedia?: string;
  // Segunda linha, tracejada, pra comparar (ex.: média dos outros jogadores nos
  // mesmos jogos). null/ausente: só a média do gráfico.
  comparacao?: { valor: number; rotulo: string } | null;
  // O que a coluna conta. O campo continua `gols`: outro gráfico (ex.:
  // mensalistas por mês) mapeia o valor pra ele e troca só o texto.
  unidade?: { um: string; varios: string };
  // "Ver jogos em lista" embaixo do gráfico. false: só o toque na coluna.
  lista?: boolean;
  // O que cada coluna é (padrão: um jogo) e o rótulo dela na leitura e na lista
  // (padrão: a data). O gráfico de mensalistas usa uma coluna por mês.
  coluna?: { um: string; varios: string };
  rotular?: (jogo: T) => string;
  // Altura da área das colunas, em px.
  altura?: number;
  // Menos respiro dentro do card (modal do jogador).
  compacto?: boolean;
  // Troca a linha de resumo (sem coluna tocada). Ex.: a nota da galera, que não
  // é "N por jogo".
  resumo?: (qtd: number, mediaGeral: number) => ReactNode;
  // Linha branca com bolinhas por cima das colunas, na MESMA escala (ex.: a nota
  // que o jogador se deu, sobre a nota da galera). Jogo sem valor fica sem
  // bolinha e quebra a linha (só liga jogos seguidos com valor). `leitura` entra
  // na linha de leitura do jogo tocado ("Você 85").
  linha?: { valor: (jogo: T) => number | null | undefined; rotulo: string; leitura: string };
}) {
  const rolagem = useRef<ScrollView>(null);
  const [ativo, setAtivo] = useState<number | null>(null);
  const [listaAberta, setListaAberta] = useState(false);
  // Largura visível da área das colunas: com poucos jogos, eles se espalham
  // por ela toda em vez de ficar amontoados à esquerda.
  const [disponivel, setDisponivel] = useState(0);

  // Valor da linha em cada jogo (null = sem bolinha). Entra no topo da escala pra
  // bolinha nunca sair do gráfico.
  const valoresLinha = jogos.map((j) => (linha ? (linha.valor(j) ?? null) : null));
  const maxGols = Math.max(
    1,
    ...jogos.map((j) => j.gols),
    comparacao?.valor ?? 0,
    ...valoresLinha.map((v) => v ?? 0),
  );
  // Escala sempre em inteiros "redondos".
  const passo = maxGols <= 5 ? 1 : maxGols <= 10 ? 2 : maxGols <= 25 ? 5 : 25;
  const topoEscala = Math.ceil(maxGols / passo) * passo;
  const ticks = Array.from({ length: topoEscala / passo + 1 }, (_, i) => i * passo);
  const util = ALTURA - TOPO;
  const y = (v: number) => TOPO + util - (v / topoEscala) * util;
  const slot = Math.max(SLOT, jogos.length > 0 ? disponivel / jogos.length : 0);
  const barra = Math.min(BARRA_MAX, Math.max(BARRA, slot * 0.6));
  const largura = Math.max(jogos.length * slot, 1);
  const mediaGeral = media(jogos);
  const posicaoNaComparacao = !comparacao
    ? null
    : mediaGeral > comparacao.valor
      ? "acima"
      : mediaGeral < comparacao.valor
        ? "abaixo"
        : "na mesma";
  const jogoAtivo = ativo !== null ? jogos[ativo] : null;
  const valorLinhaAtivo = ativo !== null ? valoresLinha[ativo] : null;
  const temLinha = valoresLinha.some((v) => v !== null);
  // Caminho da linha: liga só jogos SEGUIDOS com valor (jogo sem valor quebra).
  const centro = (i: number) => i * slot + slot / 2;
  const caminhoLinha = valoresLinha
    .map((v, i) => {
      if (v === null) return "";
      const anterior = i > 0 ? valoresLinha[i - 1] : null;
      return `${anterior === null ? "M" : "L"}${centro(i)},${y(v)}`;
    })
    .join(" ");

  return (
    <View style={[styles.caixa, compacto && styles.caixaCompacta]}>
      {/* Linha de leitura: o jogo tocado, ou o resumo do gráfico. */}
      <Text style={[styles.leitura, compacto && styles.leituraCompacta]}>
        {jogoAtivo ? (
          <>
            <Text style={styles.leituraForte}>
              {jogoAtivo.gols} {jogoAtivo.gols === 1 ? unidade.um : unidade.varios}
            </Text>
            {linha && valorLinhaAtivo !== null ? (
              <>
                {" · "}
                <Text style={styles.leituraForte}>
                  {linha.leitura} {valorLinhaAtivo}
                </Text>
              </>
            ) : null}
            {` · ${rotular(jogoAtivo)}${descrever ? ` · ${descrever(jogoAtivo)}` : ""}`}
          </>
        ) : resumo ? (
          resumo(jogos.length, mediaGeral)
        ) : (
          <>
            {`${jogos.length} ${jogos.length === 1 ? coluna.um : coluna.varios} · média de `}
            <Text style={styles.leituraForte}>{formatarMedia(mediaGeral)}</Text>
            {` ${unidade.um} por ${coluna.um}`}
            {comparacao ? " · " + posicaoNaComparacao + " da " + comparacao.rotulo : ""}
          </>
        )}
      </Text>

      <View style={styles.linhaGrafico}>
        {/* Eixo Y fixo; só as colunas rolam. */}
        <Svg width={EIXO} height={ALTURA + 4}>
          {ticks.map((t) => (
            <SvgText
              key={t}
              x={16}
              y={y(t) + 3}
              textAnchor="end"
              fontSize={9}
              fontFamily={fontes.mono}
              fill={cores.slate500}
            >
              {String(t)}
            </SvgText>
          ))}
        </Svg>
        <ScrollView
          ref={rolagem}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.flex1}
          onLayout={(e) => setDisponivel(e.nativeEvent.layout.width)}
          onContentSizeChange={() => rolagem.current?.scrollToEnd({ animated: false })}
        >
          <Svg width={largura} height={ALTURA + 4}>
            {ticks.map((t) => (
              <Line
                key={t}
                x1={0}
                x2={largura}
                y1={y(t)}
                y2={y(t)}
                stroke="rgba(255, 255, 255, 0.07)"
                strokeWidth={1}
              />
            ))}
            {jogos.map((j, i) => {
              const x = i * slot + (slot - barra) / 2;
              const destacado = !mesDestacado || j.mes === mesDestacado;
              const selecionado = ativo === i;
              const altura = j.gols === 0 ? 0 : util - (y(j.gols) - TOPO);
              return j.gols === 0 ? (
                // Jogo sem gol: um traço na base, pra o jogo não sumir.
                <Rect
                  key={j.partidaId}
                  x={x}
                  y={y(0) - 2}
                  width={barra}
                  height={2}
                  rx={1}
                  fill={selecionado ? cores.orange : cores.slate600}
                  opacity={destacado || selecionado ? 1 : 0.35}
                />
              ) : (
                <Path
                  key={j.partidaId}
                  d={caminhoColuna(x, y(j.gols), barra, altura)}
                  fill={selecionado ? cores.orange : cores.teal}
                  opacity={destacado || selecionado ? 1 : 0.28}
                />
              );
            })}
            {mediaGeral > 0 && (
              <Line
                x1={0}
                x2={largura}
                y1={y(mediaGeral)}
                y2={y(mediaGeral)}
                stroke="rgba(242, 140, 30, 0.7)"
                strokeWidth={1}
              />
            )}
            {comparacao && (
              <Line
                x1={0}
                x2={largura}
                y1={y(comparacao.valor)}
                y2={y(comparacao.valor)}
                stroke="rgba(203, 213, 225, 0.7)"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            )}
            {/* Linha branca com bolinhas por cima das colunas. */}
            {temLinha ? (
              <Path d={caminhoLinha} fill="none" stroke="rgba(255, 255, 255, 0.8)" strokeWidth={1.5} />
            ) : null}
            {valoresLinha.map((v, i) =>
              v === null ? null : (
                <Circle
                  key={`linha-${jogos[i].partidaId}`}
                  cx={centro(i)}
                  cy={y(v)}
                  r={ativo === i ? 4 : 3}
                  fill={cores.branco}
                  stroke={cores.dark}
                  strokeWidth={1.5}
                  opacity={!mesDestacado || jogos[i].mes === mesDestacado || ativo === i ? 1 : 0.4}
                />
              ),
            )}
            {/* Áreas de toque por cima de tudo: o slot inteiro, mais alto que a
                coluna. Tocar de novo no mesmo jogo volta pro resumo. */}
            {jogos.map((j, i) => (
              <Rect
                key={`toque-${j.partidaId}`}
                x={i * slot}
                y={0}
                width={slot}
                height={ALTURA}
                fill="transparent"
                onPress={() => setAtivo((a) => (a === i ? null : i))}
              />
            ))}
          </Svg>
        </ScrollView>
      </View>

      <View style={[styles.legenda, compacto && styles.legendaCompacta]}>
        <View style={styles.legendaItem}>
          <View style={styles.legendaLinha} />
          <Text style={styles.legendaTexto}>
            {rotuloMedia} ({formatarMedia(mediaGeral)})
          </Text>
        </View>
        {comparacao ? (
          <View style={styles.legendaItem}>
            <View style={styles.legendaTracejada} />
            <Text style={styles.legendaTexto}>
              {comparacao.rotulo} ({formatarMedia(comparacao.valor)})
            </Text>
          </View>
        ) : null}
        {linha && temLinha ? (
          <View style={styles.legendaItem}>
            <View style={styles.legendaLinhaBolinha}>
              <View style={styles.legendaLinhaBranca} />
              <View style={styles.legendaBolinha} />
            </View>
            <Text style={styles.legendaTexto}>{linha.rotulo}</Text>
          </View>
        ) : null}
      </View>

      {lista && (
        <View style={styles.listaBloco}>
          <Pressable style={styles.listaToggle} onPress={() => setListaAberta((v) => !v)}>
            {listaAberta ? (
              <ChevronUp size={14} color={cores.slate400} />
            ) : (
              <ChevronDown size={14} color={cores.slate400} />
            )}
            <Text style={styles.listaToggleTexto}>Ver jogos em lista</Text>
          </Pressable>
          {listaAberta &&
            [...jogos].reverse().map((j, i) => (
              <View key={j.partidaId} style={[styles.listaLinha, i > 0 && styles.listaDivisoria]}>
                <Text style={styles.listaEsq} numberOfLines={1}>
                  <Text style={styles.listaData}>{rotular(j)}</Text>{" "}
                  {descrever?.(j)}
                </Text>
                <Text style={styles.listaGols}>
                  {j.gols} {j.gols === 1 ? unidade.um : unidade.varios}
                </Text>
              </View>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  caixa: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    padding: 16,
  },
  caixaCompacta: { padding: 12 },
  leitura: { minHeight: 20, marginBottom: 12, fontSize: 12, color: cores.slate400 },
  leituraCompacta: { marginBottom: 6 },
  legendaCompacta: { marginTop: 4 },
  leituraForte: { fontSize: 12, fontWeight: "600", color: cores.branco },
  linhaGrafico: { flexDirection: "row" },
  legenda: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    columnGap: 16,
    rowGap: 4,
    marginTop: 8,
    paddingLeft: EIXO,
  },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendaLinha: { width: 16, height: 1, backgroundColor: "rgba(242, 140, 30, 0.7)" },
  legendaTracejada: {
    width: 16,
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(203, 213, 225, 0.7)",
  },
  legendaTexto: { fontSize: 10, color: cores.slate500 },
  // Legenda da linha "sua nota": traço branco com a bolinha no meio.
  legendaLinhaBolinha: { width: 16, height: 6, alignItems: "center", justifyContent: "center" },
  legendaLinhaBranca: { position: "absolute", width: 16, height: 1, backgroundColor: "rgba(255, 255, 255, 0.8)" },
  legendaBolinha: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.branco },
  listaBloco: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
  },
  listaToggle: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 2 },
  listaToggleTexto: { fontSize: 12, color: cores.slate400 },
  listaLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6,
  },
  listaDivisoria: { borderTopWidth: 1, borderTopColor: cores.linhaSutil },
  listaEsq: { flex: 1, fontSize: 12, color: cores.slate300 },
  listaData: { fontSize: 12, fontFamily: fontes.mono, color: cores.slate500 },
  listaGols: { fontSize: 12, fontWeight: "600", color: cores.branco },
});
