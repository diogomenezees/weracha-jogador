import { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { Text } from "@/ui/Texto";
import { ChevronDown, ChevronUp } from "@/ui/Icone";
import { formatarMedia, media } from "@/estatisticas";
import { cores, fontes, raio } from "@/tema";
// Mínimo que o gráfico precisa de cada jogo (o do jogador e o do grupo servem).
export type JogoNoGrafico = { partidaId: string; data: string; mes: string; gols: number };

// Gols por jogo, desde sempre (só o filtro de grupo se aplica). Uma coluna por
// jogo, em ordem cronológica, com a linha da média. Com muitos jogos a área
// rola na horizontal e abre já no fim (os jogos mais recentes). O mês escolhido
// nos filtros fica em destaque; os outros jogos ficam esmaecidos. Tocar numa
// coluna mostra o jogo na linha de leitura acima. Espelha
// weracha-site/components/grafico-gols-por-jogo.tsx.

const ALTURA = 140;
const TOPO = 10;
const SLOT = 20; // largura de cada jogo
const BARRA = 12; // largura da coluna (com ar no slot)
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
}: {
  jogos: T[];
  // "AAAA-MM" quando um mês está escolhido; null no Geral.
  mesDestacado: string | null;
  // Complemento da linha de leitura e da lista (ex.: o nome do grupo).
  descrever?: (jogo: T) => string;
  rotuloMedia?: string;
}) {
  const rolagem = useRef<ScrollView>(null);
  const [ativo, setAtivo] = useState<number | null>(null);
  const [listaAberta, setListaAberta] = useState(false);

  const maxGols = Math.max(1, ...jogos.map((j) => j.gols));
  // Escala sempre em inteiros "redondos".
  const passo = maxGols <= 5 ? 1 : maxGols <= 10 ? 2 : 5;
  const topoEscala = Math.ceil(maxGols / passo) * passo;
  const ticks = Array.from({ length: topoEscala / passo + 1 }, (_, i) => i * passo);
  const util = ALTURA - TOPO;
  const y = (v: number) => TOPO + util - (v / topoEscala) * util;
  const largura = Math.max(jogos.length * SLOT, 1);
  const mediaGeral = media(jogos);
  const jogoAtivo = ativo !== null ? jogos[ativo] : null;

  return (
    <View style={styles.caixa}>
      {/* Linha de leitura: o jogo tocado, ou o resumo do gráfico. */}
      <Text style={styles.leitura}>
        {jogoAtivo ? (
          <>
            <Text style={styles.leituraForte}>
              {jogoAtivo.gols} {jogoAtivo.gols === 1 ? "gol" : "gols"}
            </Text>
            {` · ${formatarData(jogoAtivo.data)}${descrever ? ` · ${descrever(jogoAtivo)}` : ""}`}
          </>
        ) : (
          <>
            {`${jogos.length} ${jogos.length === 1 ? "jogo" : "jogos"} · média de `}
            <Text style={styles.leituraForte}>{formatarMedia(mediaGeral)}</Text>
            {" gol por jogo"}
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
              const x = i * SLOT + (SLOT - BARRA) / 2;
              const destacado = !mesDestacado || j.mes === mesDestacado;
              const selecionado = ativo === i;
              const altura = j.gols === 0 ? 0 : util - (y(j.gols) - TOPO);
              return j.gols === 0 ? (
                // Jogo sem gol: um traço na base, pra o jogo não sumir.
                <Rect
                  key={j.partidaId}
                  x={x}
                  y={y(0) - 2}
                  width={BARRA}
                  height={2}
                  rx={1}
                  fill={selecionado ? cores.orange : cores.slate600}
                  opacity={destacado || selecionado ? 1 : 0.35}
                />
              ) : (
                <Path
                  key={j.partidaId}
                  d={caminhoColuna(x, y(j.gols), BARRA, altura)}
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
            {/* Áreas de toque por cima de tudo: o slot inteiro, mais alto que a
                coluna. Tocar de novo no mesmo jogo volta pro resumo. */}
            {jogos.map((j, i) => (
              <Rect
                key={`toque-${j.partidaId}`}
                x={i * SLOT}
                y={0}
                width={SLOT}
                height={ALTURA}
                fill="transparent"
                onPress={() => setAtivo((a) => (a === i ? null : i))}
              />
            ))}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.legenda}>
        <View style={styles.legendaItem}>
          <View style={styles.legendaLinha} />
          <Text style={styles.legendaTexto}>
            {rotuloMedia} ({formatarMedia(mediaGeral)})
          </Text>
        </View>
        {mesDestacado ? (
          <Text style={styles.legendaTexto}>Em destaque: jogos do mês escolhido</Text>
        ) : null}
      </View>

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
                <Text style={styles.listaData}>{formatarData(j.data)}</Text>{" "}
                {descrever?.(j)}
              </Text>
              <Text style={styles.listaGols}>
                {j.gols} {j.gols === 1 ? "gol" : "gols"}
              </Text>
            </View>
          ))}
      </View>
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
  leitura: { minHeight: 20, marginBottom: 12, fontSize: 12, color: cores.slate400 },
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
  legendaTexto: { fontSize: 10, color: cores.slate500 },
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
