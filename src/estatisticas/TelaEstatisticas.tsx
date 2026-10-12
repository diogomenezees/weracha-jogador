import { useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, type Href } from "expo-router";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { ModalEscolha } from "@/grupo/pickers";
import { GraficoGolsPorJogo } from "@/estatisticas/GraficoGolsPorJogo";
import {
  BarChart3,
  CalendarCheck,
  ChevronRight,
  Clock,
  Flame,
  Medal,
  MessageCircle,
  Minus,
  Star,
  TrendingDown,
  TrendingUp,
  Users,
  Video,
  type LucideIcon,
} from "@/ui/Icone";
import {
  JOGOS_NA_TENDENCIA,
  filtrarJogos,
  formatarMedia,
  media,
  noiteHistorica,
  recordeDeSequencia,
  sequenciaAtual,
  tendencia,
  tendenciaGeral,
} from "@/estatisticas";
import { cores, raio } from "@/tema";
import { CHAVE_GERAL, type DadosEstatisticas } from "@/contrato/tipos";

// Corpo da tela "Meus indicadores": filtros de grupo e mês + os números do
// período, recalculados no aparelho a cada troca. Espelha
// weracha-site/components/tela-estatisticas.tsx (mesma ordem de seções).

function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

function formatarDiaMes(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function TituloSecao({
  Icone,
  titulo,
  lateral,
}: {
  Icone: LucideIcon;
  titulo: string;
  // Selo opcional ao lado do título (ex.: "Beta").
  lateral?: ReactNode;
}) {
  return (
    <View style={styles.tituloSecao}>
      <Icone size={16} color={cores.teal} />
      <Text style={styles.tituloSecaoTexto}>{titulo}</Text>
      {lateral}
    </View>
  );
}

// Um indicador pequeno da grade 2x2.
function CardIndicador({
  Icone,
  rotulo,
  valor,
  detalhe,
  rota,
}: {
  Icone: LucideIcon;
  rotulo: string;
  valor: string;
  detalhe: string;
  rota?: Href;
}) {
  const conteudo = (
    <>
      <View style={styles.cardRotuloLinha}>
        <Icone size={14} color={cores.teal} />
        <Text style={styles.cardRotulo} numberOfLines={1}>
          {rotulo}
        </Text>
      </View>
      <Text style={styles.cardValor}>{valor}</Text>
      <Text style={styles.cardDetalhe}>{detalhe}</Text>
    </>
  );
  return rota ? (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressionado]}
      onPress={() => router.push(rota)}
    >
      {conteudo}
    </Pressable>
  ) : (
    <View style={styles.card}>{conteudo}</View>
  );
}

function SetaTendencia({ diferenca }: { diferenca: number }) {
  const subiu = diferenca > 0.005;
  const caiu = diferenca < -0.005;
  const Icone = subiu ? TrendingUp : caiu ? TrendingDown : Minus;
  const cor = subiu ? cores.verde : caiu ? cores.ambar : cores.slate300;
  const fundo = subiu
    ? "rgba(52, 211, 153, 0.15)"
    : caiu
      ? "rgba(251, 191, 36, 0.15)"
      : "rgba(255, 255, 255, 0.1)";
  return (
    <View style={[styles.seta, { backgroundColor: fundo }]}>
      <Icone size={14} color={cor} />
      <Text style={[styles.setaTexto, { color: cor }]}>
        {subiu ? "+" : caiu ? "−" : ""}
        {formatarMedia(Math.abs(diferenca))}
      </Text>
    </View>
  );
}

export function TelaEstatisticas({ dados }: { dados: DadosEstatisticas }) {
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [periodo, setPeriodo] = useState(dados.periodoInicial);
  const [escolhendoGrupo, setEscolhendoGrupo] = useState(false);

  const nomePorGrupo = useMemo(
    () => new Map(dados.grupos.map((g) => [g.id, g.nome])),
    [dados.grupos]
  );
  const nomeDoGrupo = (id: string) => nomePorGrupo.get(id) ?? "Grupo";
  const periodoAtual = dados.periodos.find((p) => p.chave === periodo) ?? dados.periodos[0];
  const ehGeral = periodo === CHAVE_GERAL;
  const nomeDoPeriodo = ehGeral
    ? "desde sempre"
    : `em ${periodoAtual.rotulo.replace(/\/\d\d$/, "").toLowerCase()}`;

  // Jogos do grupo escolhido (todos os meses) e só do período.
  const doGrupo = useMemo(
    () => filtrarJogos(dados.jogos, { grupoId, periodo: CHAVE_GERAL }),
    [dados.jogos, grupoId]
  );
  const doPeriodo = useMemo(
    () => filtrarJogos(dados.jogos, { grupoId, periodo }),
    [dados.jogos, grupoId, periodo]
  );

  const golsPeriodo = doPeriodo.reduce((s, j) => s + j.gols, 0);
  const mediaPeriodo = media(doPeriodo);
  const tend = ehGeral ? tendenciaGeral(doGrupo) : tendencia(doPeriodo, doGrupo);

  const ultimo = doPeriodo.at(-1) ?? null;
  const antesDoUltimo = ultimo ? doGrupo.filter((j) => j.data < ultimo.data) : [];
  const mediaAntesDoUltimo = antesDoUltimo.length > 0 ? media(antesDoUltimo) : null;

  const seqAgora = sequenciaAtual(doGrupo);
  const recorde = recordeDeSequencia(doPeriodo);
  const noite = noiteHistorica(doPeriodo);

  const realizadas = dados.partidasRealizadas
    .filter((r) => (!grupoId || r.grupoId === grupoId) && (ehGeral || r.mes === periodo))
    .reduce((s, r) => s + r.total, 0);
  const presencas = Math.min(doPeriodo.length, realizadas);

  // Ranking: o do grupo escolhido; em "Todos os grupos", a melhor posição.
  const melhorPosicao =
    dados.posicoes
      .filter((p) => p.periodo === periodo && (!grupoId || p.grupoId === grupoId))
      .sort((a, b) => a.posicao - b.posicao || b.de - a.de)[0] ?? null;

  const replays = doPeriodo.reduce((s, j) => s + j.replays, 0);
  const comentarios = doPeriodo.reduce((s, j) => s + j.comentarios, 0);
  let maisComentado: {
    grupoId: string;
    data: string;
    pedidoReplayId: string;
    comentarios: number;
  } | null = null;
  for (const j of doPeriodo) {
    const r = j.replayMaisComentado;
    if (r && (!maisComentado || r.comentarios > maisComentado.comentarios)) {
      maisComentado = { grupoId: j.grupoId, data: j.data, ...r };
    }
  }

  const opcoesGrupo = ["Todos os grupos", ...dados.grupos.map((g) => g.nome)];
  const indiceGrupo = grupoId ? dados.grupos.findIndex((g) => g.id === grupoId) + 1 : 0;

  const comparacaoUltimo =
    ultimo && mediaAntesDoUltimo !== null
      ? ultimo.gols > mediaAntesDoUltimo
        ? "Acima"
        : ultimo.gols < mediaAntesDoUltimo
          ? "Abaixo"
          : "Na"
      : null;

  return (
    <View style={styles.container}>
      {/* Filtros (grupo, se tiver mais de um, e meses). */}
      <View style={styles.filtros}>
        {dados.grupos.length > 1 && (
          <View style={styles.filtroLinha}>
            <Text style={styles.filtroRotulo}>Grupo</Text>
            <Pressable style={styles.chipSel} onPress={() => setEscolhendoGrupo(true)}>
              <Text style={styles.chipSelTexto} numberOfLines={1}>
                {opcoesGrupo[indiceGrupo]}
              </Text>
              <Text style={styles.chipSelSeta}>▾</Text>
            </Pressable>
            <ModalEscolha
              aberto={escolhendoGrupo}
              onFechar={() => setEscolhendoGrupo(false)}
              Icone={Users}
              titulo="Grupo"
              descricao="Escolha o grupo pra ver seus números nele."
              opcoes={opcoesGrupo}
              selecionado={indiceGrupo}
              onEscolher={(i) => setGrupoId(i === 0 ? null : dados.grupos[i - 1].id)}
            />
          </View>
        )}
        <View style={styles.filtroLinha}>
          <Text style={styles.filtroRotulo}>Meses</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {dados.periodos.map((p) => {
              const ativo = p.chave === periodo;
              return (
                <Pressable
                  key={p.chave}
                  style={[styles.chip, ativo && styles.chipAtivo]}
                  onPress={() => setPeriodo(p.chave)}
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
      </View>

      {/* Resumo do período (o título da tela já é "Meus indicadores"). */}
      <View>
        <TituloSecao Icone={BarChart3} titulo="Resumo" />
        <View style={styles.resumo}>
          <View style={styles.resumoTopo}>
            <View>
              <View style={styles.numeroLinha}>
                <Text style={styles.numeroGrande}>{golsPeriodo}</Text>
                <Text style={styles.numeroUnidade}>{golsPeriodo === 1 ? "gol" : "gols"}</Text>
              </View>
              <Text style={styles.resumoSub}>
                {nomeDoPeriodo} · {plural(doPeriodo.length, "jogo", "jogos")}
              </Text>
            </View>
            <View style={styles.direita}>
              <Text style={styles.mediaValor}>{formatarMedia(mediaPeriodo)}</Text>
              <Text style={styles.resumoSub}>gol por jogo</Text>
            </View>
          </View>
          {tend && (
            <View style={styles.tendencia}>
              <SetaTendencia diferenca={tend.diferenca} />
              <Text style={styles.tendenciaTexto}>
                {ehGeral
                  ? `Últimos ${JOGOS_NA_TENDENCIA} jogos: ${formatarMedia(tend.atual)} por jogo, contra ${formatarMedia(tend.base)} na média geral.`
                  : `Média do mês ${formatarMedia(tend.atual)}, contra ${formatarMedia(tend.base)} na média geral.`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {doPeriodo.length === 0 ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioTexto}>
            {periodoAtual.emAndamento
              ? "Nenhum jogo seu neste mês ainda. Bora pra quadra."
              : "Nenhum jogo seu nesse período."}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.grade}>
            <CardIndicador
              Icone={Flame}
              rotulo="Sequência"
              valor={
                seqAgora?.tipo === "MARCANDO"
                  ? plural(seqAgora.jogos, "jogo", "jogos")
                  : seqAgora
                    ? `${seqAgora.jogos} sem gol`
                    : "0"
              }
              detalhe={`${seqAgora?.tipo === "MARCANDO" ? "marcando seguido agora" : "em jejum agora"}\nRecorde ${nomeDoPeriodo}: ${plural(recorde, "jogo", "jogos")}`}
            />
            <CardIndicador
              Icone={Star}
              rotulo="Noite histórica"
              valor={noite ? plural(noite.gols, "gol", "gols") : "Sem gols"}
              detalhe={
                noite
                  ? `em ${formatarDiaMes(noite.data)}, ${nomeDoGrupo(noite.grupoId)}`
                  : `nenhum gol ${nomeDoPeriodo}`
              }
              rota={
                noite ? `/grupos/${noite.grupoId}/partidas/${noite.partidaId}/resultado` : undefined
              }
            />
            <CardIndicador
              Icone={CalendarCheck}
              rotulo="Presença"
              valor={
                realizadas > 0 ? `${Math.round((presencas / realizadas) * 100)}%` : "Sem jogos"
              }
              detalhe={
                realizadas > 0
                  ? `${presencas} de ${plural(realizadas, "jogo realizado", "jogos realizados")}`
                  : "nenhum jogo realizado"
              }
            />
            <CardIndicador
              Icone={Medal}
              rotulo="Artilharia"
              valor={melhorPosicao ? `${melhorPosicao.posicao}º lugar` : "Fora do ranking"}
              detalhe={
                melhorPosicao
                  ? `${grupoId ? "" : `${nomeDoGrupo(melhorPosicao.grupoId)}, `}entre ${plural(melhorPosicao.de, "artilheiro", "artilheiros")}`
                  : "marque um gol pra entrar"
              }
              rota={melhorPosicao ? `/grupos/${melhorPosicao.grupoId}/artilheiros` : undefined}
            />
          </View>

          {ultimo && (
            <View>
              <TituloSecao Icone={Clock} titulo="Último jogo" />
              <Pressable
                style={({ pressed }) => [styles.ultimo, pressed && styles.cardPressionado]}
                onPress={() =>
                  router.push(`/grupos/${ultimo.grupoId}/partidas/${ultimo.partidaId}/resultado`)
                }
              >
                <View style={styles.ultimoGols}>
                  <Text style={styles.ultimoNumero}>{ultimo.gols}</Text>
                  <Text style={styles.ultimoUnidade}>{ultimo.gols === 1 ? "gol" : "gols"}</Text>
                </View>
                <View style={styles.flex1}>
                  <Text style={styles.ultimoGrupo} numberOfLines={1}>
                    {nomeDoGrupo(ultimo.grupoId)}
                  </Text>
                  <Text style={styles.ultimoData}>{formatarDiaMes(ultimo.data)}</Text>
                  {comparacaoUltimo && mediaAntesDoUltimo !== null ? (
                    <Text
                      style={[
                        styles.ultimoComparacao,
                        {
                          color:
                            comparacaoUltimo === "Acima"
                              ? cores.verde
                              : comparacaoUltimo === "Abaixo"
                                ? cores.ambar
                                : cores.slate300,
                        },
                      ]}
                    >
                      {comparacaoUltimo} da sua média ({formatarMedia(mediaAntesDoUltimo)})
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={16} color={cores.slate500} />
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* O gráfico é a visão geral (independe do mês), então aparece mesmo num
          mês sem jogo. */}
      {doGrupo.length > 0 && (
        <View>
          <TituloSecao Icone={BarChart3} titulo="Gols por jogo" />
          <GraficoGolsPorJogo
            jogos={doGrupo}
            mesDestacado={ehGeral ? null : periodo}
            descrever={(j) => nomeDoGrupo(j.grupoId)}
          />
        </View>
      )}

      {doPeriodo.length > 0 && (
        <View>
          {/* Depende dos replays do We Racha Cam, que nem todo grupo tem: mesmo
              selo "Beta" do Replays no menu e da Resenha no grupo. */}
          <TituloSecao
            Icone={Video}
            titulo="Repercussão"
            lateral={<Text style={styles.beta}>Beta</Text>}
          />
          <View style={styles.grade}>
            <CardIndicador
              Icone={Video}
              rotulo="Gols em vídeo"
              valor={String(replays)}
              detalhe={replays === 1 ? "replay salvo" : "replays salvos"}
              rota={replays > 0 ? "/replays" : undefined}
            />
            <CardIndicador
              Icone={MessageCircle}
              rotulo="Comentários"
              valor={String(comentarios)}
              detalhe="nos seus gols"
            />
          </View>
          {maisComentado && (
            <Pressable
              style={({ pressed }) => [styles.maisComentado, pressed && styles.cardPressionado]}
              onPress={() =>
                router.push(
                  `/grupos/${maisComentado.grupoId}/resenha?video=${maisComentado.pedidoReplayId}`
                )
              }
            >
              <MessageCircle size={20} color={cores.orange} />
              <View style={styles.flex1}>
                <Text style={styles.maisComentadoTitulo}>Seu gol mais comentado</Text>
                <Text style={styles.maisComentadoSub} numberOfLines={1}>
                  {plural(maisComentado.comentarios, "comentário", "comentários")} · gol de{" "}
                  {formatarDiaMes(maisComentado.data)}
                </Text>
              </View>
              <ChevronRight size={16} color={cores.orange} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 28 },
  flex1: { flex: 1, minWidth: 0 },
  direita: { alignItems: "flex-end" },

  filtros: { gap: 8 },
  filtroLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  filtroRotulo: {
    fontFamily: FAMILIA_MONO,
    fontSize: 11,
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
    maxWidth: 220,
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

  tituloSecao: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  tituloSecaoTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 12,
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  beta: {
    marginLeft: 4,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: cores.ambar,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: "rgba(251, 191, 36, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: "hidden",
  },

  resumo: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(242, 140, 30, 0.25)",
    backgroundColor: "rgba(242, 140, 30, 0.07)",
    padding: 16,
  },
  resumoTopo: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
  },
  numeroLinha: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  numeroGrande: { fontSize: 48, lineHeight: 52, fontWeight: "700", color: cores.branco },
  numeroUnidade: { fontSize: 14, fontWeight: "600", color: cores.orange },
  mediaValor: { fontSize: 24, lineHeight: 28, fontWeight: "700", color: cores.branco },
  resumoSub: { marginTop: 4, fontSize: 12, color: cores.slate400 },
  tendencia: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  tendenciaTexto: { flex: 1, fontSize: 12, lineHeight: 17, color: cores.slate300 },
  seta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  setaTexto: { fontSize: 11, fontWeight: "600" },

  vazio: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  vazioTexto: { fontSize: 14, color: cores.slate400, textAlign: "center" },

  grade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    flexBasis: "47%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: cores.cardFundo,
    padding: 14,
  },
  cardPressionado: { backgroundColor: cores.superficieMedia },
  cardRotuloLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  cardRotulo: { flexShrink: 1, fontSize: 11, fontWeight: "500", color: cores.slate300 },
  cardValor: { marginTop: 8, fontSize: 20, lineHeight: 24, fontWeight: "700", color: cores.branco },
  cardDetalhe: { marginTop: 2, fontSize: 11, lineHeight: 15, color: cores.slate400 },

  ultimo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopRightRadius: raio.card,
    borderBottomRightRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    borderLeftColor: cores.teal,
    backgroundColor: cores.cardFundo,
    padding: 16,
  },
  ultimoGols: { width: 56, alignItems: "center" },
  ultimoNumero: { fontSize: 30, lineHeight: 34, fontWeight: "700", color: cores.branco },
  ultimoUnidade: { marginTop: 2, fontSize: 10, color: cores.slate400 },
  ultimoGrupo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  ultimoData: { fontSize: 12, color: cores.slate400 },
  ultimoComparacao: { marginTop: 4, fontSize: 12, fontWeight: "500" },

  maisComentado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(242, 140, 30, 0.25)",
    backgroundColor: "rgba(242, 140, 30, 0.05)",
  },
  maisComentadoTitulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  maisComentadoSub: { fontSize: 12, color: cores.slate400 },
});
