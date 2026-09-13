import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Text } from "@/ui/Texto";
import { Comemoracao } from "@/partida/Comemoracao";
import { Pause, Play, RotateCcw, Sparkles, Timer } from "@/ui/Icone";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarApoioDaPartida } from "@/api/checkins";
import {
  acaoCronometro,
  adicionarTrintaSegundos,
  buscarEstadoAoVivo,
  buscarGols,
  buscarLances,
  buscarResultadoAtivo,
  desmarcarGol,
  marcarGol,
  marcarLance,
  resetarCronometro,
  salvarConfiguracao,
} from "@/api/partidas";
import { mensagemDoErro } from "@/mensagens-erro";
import { ModalCartao, ModalConfirmar } from "@/grupo/modais";
import { ModalPerfil } from "@/jogadores/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { ListaReplays } from "@/partida/ListaReplays";
import {
  Abas,
  AvisoPartida,
  Cabecalho,
  CardJogadorPartida,
  Eyebrow,
  Rodape,
  BotaoPrimario,
  SegOrdenacao,
  Stepper,
  TelaPartida,
} from "@/partida/ui";
import { formatarMMSS, podeResetarRodada, segundosRestantesAgora } from "@/aoVivo";
import { buscarPartida, duracaoDaPartida } from "@/grupos";
import { partidaEncerrada } from "@/partidas";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type {
  EstadoAoVivoCompleto,
  GolComVideos,
  Grupo,
  JogadorEmPartida,
  PartidaResumo,
} from "@/contrato/tipos";

const COOLDOWN_MS = 2000;
type Aba = "ARTILHEIROS" | "HISTORICO" | "LANCES";
type Ordenacao = "NOME" | "GOLS";

export default function TelaAoVivo() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi } = useSessao();

  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);
  const [partida, setPartida] = useState<PartidaResumo | null | undefined>(undefined);
  const [presentes, setPresentes] = useState<JogadorEmPartida[]>([]);
  const [posicaoNome, setPosicaoNome] = useState<Map<string, string>>(new Map());
  const [aoVivo, setAoVivo] = useState<EstadoAoVivoCompleto | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [agora, setAgora] = useState(() => new Date());
  const [aba, setAba] = useState<Aba>("ARTILHEIROS");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("NOME");
  const [gols, setGols] = useState<GolComVideos[] | null>(null);
  const [lances, setLances] = useState<GolComVideos[] | null>(null);
  const chaveBuscada = useRef<string | null>(null);

  const [emCooldown, setEmCooldown] = useState<Set<string>>(new Set());
  const [cooldownLance, setCooldownLance] = useState(false);
  const [desmarcar, setDesmarcar] = useState<JogadorEmPartida | null>(null);
  const [confirmarReset, setConfirmarReset] = useState(false);
  const [modalConfig, setModalConfig] = useState(false);
  const [perfilId, setPerfilId] = useState<string | null>(null);

  const [comemoracao, setComemoracao] = useState<{
    titulo: string;
    sub?: string;
    key: number;
  } | null>(null);

  const carregarAoVivo = useCallback(async () => {
    setAoVivo(await buscarEstadoAoVivo(chamarApi, partidaId));
  }, [chamarApi, partidaId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const dados = await buscarDadosDoGrupo(chamarApi, id);
        if (!vivo) return;
        const g = dados.grupo ?? null;
        const p = g ? buscarPartida(g, partidaId) ?? null : null;
        setGrupo(g);
        setPartida(p);
        if (!g || !p) return;

        const salvo = await buscarResultadoAtivo(chamarApi, partidaId);
        if (!salvo) {
          router.replace(`/grupos/${id}/partidas/${partidaId}/configurar`);
          return;
        }
        if (partidaEncerrada(new Date(p.data), duracaoDaPartida(g, p))) {
          router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`);
          return;
        }

        const [apoio] = await Promise.all([
          buscarApoioDaPartida(chamarApi, partidaId),
          carregarAoVivo(),
        ]);
        if (!vivo) return;
        const nomePorPos = new Map(apoio.posicoes.map((x) => [x.id, x.nome]));
        const m = new Map<string, string>();
        for (const mb of apoio.membros) {
          const n = mb.posicaoId ? nomePorPos.get(mb.posicaoId) : undefined;
          if (n) m.set(mb.jogadorId, n);
        }
        setPosicaoNome(m);
        const comCheckin = new Set(apoio.checkins.map((c) => c.jogadorId));
        setPresentes(apoio.jogadores.filter((j) => comCheckin.has(j.id)));
        setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, id, partidaId, carregarAoVivo, tentativa]);

  // Ticker de exibição (1s).
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Polling do estado (3s, só com o app ativo).
  useEffect(() => {
    if (!partida) return;
    const t = setInterval(() => {
      if (AppState.currentState === "active") carregarAoVivo().catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [partida, carregarAoVivo]);

  const totMarcados = aoVivo
    ? Object.values(aoVivo.golsPorJogador).reduce((s, n) => s + n, 0)
    : 0;
  const totGravados = aoVivo
    ? Object.values(aoVivo.golsGravadosPorJogador).reduce((s, n) => s + n, 0)
    : 0;
  const totLances = aoVivo?.lancesNaPartida ?? 0;
  const totLancesGrav = aoVivo?.lancesGravados ?? 0;
  const totNuvem = (aoVivo?.golsGravadosNuvem ?? 0) + (aoVivo?.lancesGravadosNuvem ?? 0);

  // Busca as listas completas só quando os contadores do poll mudam E uma das
  // abas de replay está aberta.
  useEffect(() => {
    if ((aba !== "HISTORICO" && aba !== "LANCES") || !partida) return;
    const chave = `${totMarcados}:${totGravados}:${totLances}:${totLancesGrav}:${totNuvem}`;
    if (chaveBuscada.current === chave) return;
    Promise.all([
      buscarGols(chamarApi, partidaId),
      buscarLances(chamarApi, partidaId),
    ])
      .then(([gs, ls]) => {
        setGols(gs);
        setLances(ls);
        chaveBuscada.current = chave;
      })
      .catch(() => {});
  }, [aba, totMarcados, totGravados, totLances, totLancesGrav, totNuvem, partida, chamarApi, partidaId]);

  function comemorar(titulo: string, sub?: string) {
    // `key` incremental remonta o <Comemoracao> a cada gol/lance.
    setComemoracao((prev) => ({ titulo, sub, key: (prev?.key ?? 0) + 1 }));
  }

  async function comErroAcao(fn: () => Promise<unknown>) {
    setErroAcao(null);
    try {
      await fn();
    } catch (e) {
      setErroAcao(mensagemDoErro(e));
    }
  }

  async function handleMarcarGol(j: JogadorEmPartida) {
    if (emCooldown.has(j.id)) return;
    setEmCooldown((p) => new Set(p).add(j.id));
    setTimeout(
      () =>
        setEmCooldown((p) => {
          const n = new Set(p);
          n.delete(j.id);
          return n;
        }),
      COOLDOWN_MS
    );
    comemorar("GOOOL!", j.apelido || j.nome);
    setAoVivo((prev) =>
      prev
        ? {
            ...prev,
            golsPorJogador: {
              ...prev.golsPorJogador,
              [j.id]: (prev.golsPorJogador[j.id] ?? 0) + 1,
            },
            golsNaRodadaAtual: prev.golsNaRodadaAtual + 1,
          }
        : prev
    );
    await comErroAcao(() => marcarGol(chamarApi, partidaId, j.id));
  }

  async function handleLance() {
    if (cooldownLance) return;
    setCooldownLance(true);
    setTimeout(() => setCooldownLance(false), COOLDOWN_MS);
    comemorar("LANCE!");
    setAoVivo((prev) => (prev ? { ...prev, lancesNaPartida: prev.lancesNaPartida + 1 } : prev));
    await comErroAcao(() => marcarLance(chamarApi, partidaId));
  }

  if (erro) {
    return (
      <TelaPartida>
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </TelaPartida>
    );
  }
  if (grupo === undefined || partida === undefined) {
    return (
      <TelaPartida>
        <TelaCarregando mensagem="Carregando ao vivo..." />
      </TelaPartida>
    );
  }
  const g = grupo;
  const p = partida;
  if (!g || !p) {
    return (
      <TelaPartida>
        <AvisoPartida mensagem="Partida não encontrada." destino="/painel" rotuloDestino="Painel" />
      </TelaPartida>
    );
  }
  if (!aoVivo) {
    return (
      <TelaPartida>
        <TelaCarregando mensagem="Carregando ao vivo..." />
      </TelaPartida>
    );
  }

  const { estado, config, golsPorJogador, golsGravadosPorJogador, ultimoGolTemVideoPorJogador } =
    aoVivo;
  const restante = segundosRestantesAgora(estado, agora);
  const zerado = restante <= 0;
  const rodando = estado.status === "RODANDO";
  const podeResetar = podeResetarRodada(
    aoVivo.golsNaRodadaAtual,
    config.golsParaEncerrarRodada,
    restante
  );
  const mostrarAbaLances = totLancesGrav > 0 || aoVivo.cameraAtiva;
  const abaVisivel: Aba = !mostrarAbaLances && aba === "LANCES" ? "HISTORICO" : aba;

  const ordenados = [...presentes].sort((a, b) => {
    if (ordenacao === "GOLS") {
      const ga = golsPorJogador[a.id] ?? 0;
      const gb = golsPorJogador[b.id] ?? 0;
      if (ga !== gb) return gb - ga;
    }
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const lancesComVideo = (lances ?? []).filter((l) => l.videos.length > 0);

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: "ARTILHEIROS", rotulo: "Artilheiros" },
    { chave: "HISTORICO", rotulo: "Histórico" },
    ...(mostrarAbaLances ? [{ chave: "LANCES" as Aba, rotulo: "Lances" }] : []),
  ];

  return (
    <TelaPartida>
      <Cabecalho titulo="Ao vivo" grupoNome={g.nome} descricao={p.descricao} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {config.duracaoRodadaMin > 0 ? (
          <View
            style={[
              styles.cron,
              zerado ? styles.cronZerado : rodando ? styles.cronRodando : styles.cronParado,
            ]}
          >
            <Text style={[styles.cronStatus, zerado && { color: cores.erroTexto }]}>
              {zerado ? "● Acabou" : rodando ? "● Jogando" : "● Parado"}
            </Text>
            <Text style={[styles.cronTempo, zerado && { color: cores.erroTexto }]}>
              {formatarMMSS(restante)}
            </Text>
            <View style={styles.cronBotoes}>
              <Pressable style={styles.cronBtn} onPress={() => setConfirmarReset(true)}>
                <RotateCcw size={14} color={cores.slate200} />
                <Text style={styles.cronBtnTexto}>Resetar</Text>
              </Pressable>
              <Pressable
                style={styles.cronPlay}
                onPress={() =>
                  void comErroAcao(async () => {
                    const novo = await acaoCronometro(
                      chamarApi,
                      partidaId,
                      rodando ? "pause" : "play"
                    );
                    setAoVivo((prev) => (prev ? { ...prev, estado: novo } : prev));
                  })
                }
              >
                {rodando ? (
                  <Pause size={22} color={cores.dark} fill={cores.dark} />
                ) : (
                  <Play size={22} color={cores.dark} fill={cores.dark} />
                )}
              </Pressable>
              <Pressable
                style={styles.cronBtn}
                onPress={() =>
                  void comErroAcao(async () => {
                    const novo = await adicionarTrintaSegundos(chamarApi, partidaId);
                    setAoVivo((prev) => (prev ? { ...prev, estado: novo } : prev));
                  })
                }
              >
                <Text style={styles.cronBtnTexto}>+30s</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setModalConfig(true)}>
              <Text style={styles.cronEditar}>Editar cronômetro</Text>
            </Pressable>
            {erroAcao && <Text style={styles.cronErro}>{erroAcao}</Text>}
          </View>
        ) : (
          <Pressable style={styles.semCron} onPress={() => setModalConfig(true)}>
            <Timer size={16} color={cores.slate300} />
            <Text style={styles.semCronTexto}>Incluir cronômetro na partida?</Text>
          </Pressable>
        )}

        <Abas opcoes={abas} valor={abaVisivel} onChange={setAba} />

        {abaVisivel === "ARTILHEIROS" ? (
          <View style={{ gap: 10 }}>
            {aoVivo.cameraAtiva && aoVivo.lancesImportantesHabilitado && (
              <BotaoPrimario
                titulo="Lance importante"
                Icone={Sparkles}
                desativado={cooldownLance}
                onPress={() => void handleLance()}
              />
            )}
            <View style={styles.tituloLinha}>
              <Eyebrow>Lista de artilheiros ({ordenados.length})</Eyebrow>
              <SegOrdenacao
                opcoes={[
                  { chave: "NOME", rotulo: "A-Z" },
                  { chave: "GOLS", rotulo: "Gols" },
                ]}
                valor={ordenacao}
                onChange={setOrdenacao}
              />
            </View>
            {ordenados.length === 0 && (
              <Text style={styles.vazio}>Ninguém fez check-in ainda.</Text>
            )}
            {ordenados.map((j) => {
              const n = golsPorJogador[j.id] ?? 0;
              const grav = golsGravadosPorJogador[j.id] ?? 0;
              return (
                <CardJogadorPartida
                  key={j.id}
                  id={j.id}
                  nome={j.nome}
                  apelido={j.apelido}
                  fotoUrl={j.fotoUrl}
                  posicaoNome={posicaoNome.get(j.id)}
                  onAbrirPerfil={() => setPerfilId(j.id)}
                  direita={
                    <View style={styles.golDireita}>
                      <View style={styles.golLinha}>
                        <Pressable
                          style={styles.golMenos}
                          disabled={n === 0}
                          onPress={() => setDesmarcar(j)}
                        >
                          <Text style={[styles.golMenosTexto, n === 0 && { opacity: 0.3 }]}>−</Text>
                        </Pressable>
                        <Text style={styles.golN}>{n}</Text>
                        <Pressable
                          style={styles.golBtn}
                          disabled={emCooldown.has(j.id)}
                          onPress={() => void handleMarcarGol(j)}
                        >
                          <Text style={styles.golBtnTexto}>Gol</Text>
                        </Pressable>
                      </View>
                      {grav > 0 && (
                        <Text style={styles.golGrav}>
                          🎥 {grav} gravado{grav > 1 ? "s" : ""}
                        </Text>
                      )}
                    </View>
                  }
                />
              );
            })}
          </View>
        ) : abaVisivel === "LANCES" ? (
          lances === null ? (
            <Text style={styles.vazio}>Carregando lances...</Text>
          ) : (
            <ListaReplays gols={lancesComVideo} vazioTexto="Nenhum lance importante gravado ainda." />
          )
        ) : gols === null ? (
          <Text style={styles.vazio}>Carregando gols...</Text>
        ) : (
          <ListaReplays gols={gols} vazioTexto="Nenhum gol registrado ainda." />
        )}
      </ScrollView>

      <Rodape
        voltarRotulo="Grupo"
        onVoltar={() => router.replace(`/grupos/${id}`)}
        primario={
          <BotaoPrimario
            titulo="Ver os times"
            cor="teal"
            onPress={() => router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`)}
          />
        }
      />

      {comemoracao && (
        <Comemoracao
          key={comemoracao.key}
          titulo={comemoracao.titulo}
          sub={comemoracao.sub}
          onFim={() => setComemoracao(null)}
        />
      )}

      <ModalConfirmar
        aberto={desmarcar !== null}
        eyebrow="Reduzir gol"
        titulo={desmarcar ? `Remover gol de ${desmarcar.nome}?` : ""}
        descricao={
          desmarcar && ultimoGolTemVideoPorJogador[desmarcar.id]
            ? "Esse gol já tem um replay gravado. Remover agora apaga esse vídeo também."
            : "Isso tira o último gol marcado desse jogador nessa partida."
        }
        destrutivo
        confirmarLabel="Sim, remover"
        onConfirmar={async () => {
          const j = desmarcar;
          setDesmarcar(null);
          if (!j) return;
          await comErroAcao(async () => {
            await desmarcarGol(chamarApi, partidaId, j.id);
            await carregarAoVivo();
          });
        }}
        onFechar={() => setDesmarcar(null)}
      />

      <ModalConfirmar
        aberto={confirmarReset}
        eyebrow="Resetar cronômetro"
        titulo="Resetar o cronômetro?"
        descricao={
          !podeResetar
            ? `Essa rodada ainda não bateu a meta de gols nem o tempo zerou. Resetar volta o cronômetro pra ${config.duracaoRodadaMin} min.`
            : restante > 0
              ? `Ainda faltam ${formatarMMSS(restante)}. Resetar volta o tempo pra ${config.duracaoRodadaMin} min.`
              : `Começa a próxima rodada com ${config.duracaoRodadaMin} min.`
        }
        destrutivo={!podeResetar || restante > 0}
        confirmarLabel="Sim, resetar"
        onConfirmar={async () => {
          setConfirmarReset(false);
          await comErroAcao(async () => {
            const novo = await resetarCronometro(chamarApi, partidaId);
            setAoVivo((prev) =>
              prev ? { ...prev, estado: novo, golsNaRodadaAtual: 0 } : prev
            );
          });
        }}
        onFechar={() => setConfirmarReset(false)}
      />

      {modalConfig && (
        <ModalEditarCronometro
          config={config}
          onFechar={() => setModalConfig(false)}
          onSalvar={async (dados) => {
            await comErroAcao(async () => {
              await salvarConfiguracao(chamarApi, partidaId, dados);
              await carregarAoVivo();
            });
            setModalConfig(false);
          }}
        />
      )}

      {perfilId && (
        <ModalPerfil
          key={perfilId}
          aberto
          chamarApi={chamarApi}
          grupoId={id}
          jogadorId={perfilId}
          onFechar={() => setPerfilId(null)}
        />
      )}
    </TelaPartida>
  );
}

function ModalEditarCronometro({
  config,
  onFechar,
  onSalvar,
}: {
  config: EstadoAoVivoCompleto["config"];
  onFechar: () => void;
  onSalvar: (d: {
    jogadoresPorTime: number;
    duracaoRodadaMin: number;
    golsParaEncerrarRodada: number;
  }) => void;
}) {
  const [duracao, setDuracao] = useState(config.duracaoRodadaMin);
  const [golsEncerrar, setGolsEncerrar] = useState(config.golsParaEncerrarRodada);

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <Eyebrow>Cronômetro</Eyebrow>
      <Text style={styles.modalTitulo}>Duração da rodada</Text>
      <View style={styles.modalLinha}>
        <Text style={styles.modalLabel}>Minutos por rodada</Text>
        <Stepper valor={duracao} onChange={setDuracao} min={0} max={90} />
      </View>
      <View style={styles.modalLinha}>
        <Text style={styles.modalLabel}>Gols pra encerrar antes (0 = só tempo)</Text>
        <Stepper valor={golsEncerrar} onChange={setGolsEncerrar} min={0} max={20} />
      </View>
      <Pressable
        style={styles.modalBotao}
        onPress={() =>
          onSalvar({
            jogadoresPorTime: config.jogadoresPorTime,
            duracaoRodadaMin: duracao,
            golsParaEncerrarRodada: golsEncerrar,
          })
        }
      >
        <Text style={styles.modalBotaoTexto}>Salvar</Text>
      </Pressable>
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150, gap: 16 },
  cron: { borderRadius: raio.card, borderWidth: 1, padding: 16, alignItems: "center", gap: 8 },
  cronParado: { borderColor: cores.cardBorda, backgroundColor: cores.cardFundo },
  cronRodando: { borderColor: "rgba(16,185,129,0.5)", backgroundColor: "rgba(16,185,129,0.1)" },
  cronZerado: { borderColor: "rgba(239,68,68,0.5)", backgroundColor: cores.erroFundo },
  cronStatus: { fontSize: 13, fontWeight: "700", color: cores.slate400 },
  cronTempo: { fontSize: 44, fontWeight: "800", color: cores.branco, fontVariant: ["tabular-nums"] },
  cronBotoes: { flexDirection: "row", alignItems: "center", gap: 12 },
  cronBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cronBtnTexto: { fontSize: 13, color: cores.slate300 },
  cronPlay: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  cronEditar: { fontSize: 12, color: cores.teal, textDecorationLine: "underline" },
  cronErro: { fontSize: 12, color: cores.erroTexto },
  semCron: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.avisoBorda,
    padding: 14,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  semCronTexto: { fontSize: 13, color: cores.slate400 },
  tituloLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  vazio: { fontSize: 13, color: cores.slate400 },
  golDireita: { alignItems: "flex-end", gap: 3 },
  golLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  golMenos: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  golMenosTexto: { fontSize: 16, color: cores.slate300 },
  golN: { minWidth: 20, textAlign: "center", fontSize: 18, fontWeight: "800", color: cores.branco },
  golBtn: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  golBtnTexto: { fontSize: 13, fontWeight: "800", color: cores.dark },
  golGrav: { fontSize: 11, color: cores.slate400 },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalLinha: { gap: 6 },
  modalLabel: { fontSize: 13, color: cores.slate300 },
  modalBotao: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  modalBotaoTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
