import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Text } from "@/ui/Texto";
import { Comemoracao } from "@/partida/Comemoracao";
import {
  ArrowDownAZ,
  ArrowDownUp,
  Goal,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Sparkles,
  Timer,
  Users,
  Video,
} from "@/ui/Icone";

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
  const { chamarApi, estado: sessao } = useSessao();
  const meuId = sessao.fase === "logado" ? sessao.jogador.id : null;

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
  const [modoGols, setModoGols] = useState<"AGRUPADO" | "CRONOLOGICO">("AGRUPADO");
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
      <TelaPartida voltar="Grupo">
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </TelaPartida>
    );
  }
  if (grupo === undefined || partida === undefined) {
    return (
      <TelaPartida voltar="Grupo">
        <TelaCarregando mensagem="Carregando ao vivo..." />
      </TelaPartida>
    );
  }
  const g = grupo;
  const p = partida;
  if (!g || !p) {
    return (
      <TelaPartida voltar="Grupo">
        <AvisoPartida mensagem="Partida não encontrada." destino="/painel" rotuloDestino="Painel" />
      </TelaPartida>
    );
  }
  if (!aoVivo) {
    return (
      <TelaPartida voltar="Grupo">
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

  const goleadores = presentes
    .map((j) => ({
      jogador: j,
      gols: golsPorJogador[j.id] ?? 0,
      gravados: golsGravadosPorJogador[j.id] ?? 0,
    }))
    .filter((x) => x.gols > 0)
    .sort((a, b) => b.gols - a.gols || a.jogador.nome.localeCompare(b.jogador.nome, "pt-BR"));

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: "ARTILHEIROS", rotulo: "Artilheiros" },
    { chave: "HISTORICO", rotulo: "Histórico" },
    ...(mostrarAbaLances ? [{ chave: "LANCES" as Aba, rotulo: "Lances" }] : []),
  ];

  return (
    <TelaPartida voltar="Grupo">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Cabecalho titulo="Ao vivo" Icone={Radio} grupoNome={g.nome} descricao={p.descricao} />
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
              <View style={styles.ordGrupo}>
                {(
                  [
                    ["NOME", ArrowDownAZ, "Ordenar por nome"],
                    ["GOLS", Goal, "Ordenar por saldo de gols"],
                  ] as const
                ).map(([v, Icone, rotulo], i) => (
                  <Pressable
                    key={v}
                    accessibilityLabel={rotulo}
                    style={[
                      styles.ordBtn,
                      i > 0 && styles.ordBtnDivisor,
                      ordenacao === v && styles.ordBtnAtivo,
                    ]}
                    onPress={() => setOrdenacao(v)}
                  >
                    <Icone size={16} color={ordenacao === v ? cores.dark : cores.slate400} />
                  </Pressable>
                ))}
              </View>
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
                          style={[styles.golBtn, emCooldown.has(j.id) && styles.golBtnOff]}
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
            <ListaReplays
              gols={lancesComVideo}
              vazioTexto="Nenhum lance importante gravado ainda."
              meuId={meuId}
            />
          )
        ) : (
          <View style={{ gap: 10 }}>
            <View style={styles.tituloLinha}>
              <Eyebrow>
                {modoGols === "AGRUPADO" ? "Gols por jogador" : "Linha do tempo dos gols"}
              </Eyebrow>
              <View style={styles.ordGrupo}>
                {(
                  [
                    ["AGRUPADO", Users, "Ver agrupado por jogador"],
                    ["CRONOLOGICO", ArrowDownUp, "Ver em ordem cronológica"],
                  ] as const
                ).map(([v, Icone, rotulo], i) => (
                  <Pressable
                    key={v}
                    accessibilityLabel={rotulo}
                    style={[
                      styles.ordBtn,
                      i > 0 && styles.ordBtnDivisor,
                      modoGols === v && styles.ordBtnAtivo,
                    ]}
                    onPress={() => setModoGols(v)}
                  >
                    <Icone size={16} color={modoGols === v ? cores.dark : cores.slate400} />
                  </Pressable>
                ))}
              </View>
            </View>
            {gols === null ? (
              <Text style={styles.vazio}>Carregando gols...</Text>
            ) : modoGols === "CRONOLOGICO" ? (
              <ListaReplays gols={gols} vazioTexto="Nenhum gol registrado ainda." meuId={meuId} />
            ) : goleadores.length === 0 ? (
              <Text style={styles.vazio}>Nenhum gol registrado ainda.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {goleadores.map(({ jogador, gols: n, gravados }) => (
                  <CardJogadorPartida
                    key={jogador.id}
                    id={jogador.id}
                    nome={jogador.nome}
                    apelido={jogador.apelido}
                    fotoUrl={jogador.fotoUrl}
                    posicaoNome={posicaoNome.get(jogador.id)}
                    souEu={jogador.id === meuId}
                    onAbrirPerfil={() => setPerfilId(jogador.id)}
                    direita={
                      <View style={styles.agrupadoDireita}>
                        <Text style={styles.agrupadoGols}>
                          {n} gol{n > 1 ? "s" : ""}
                        </Text>
                        {gravados > 0 && (
                          <View style={styles.agrupadoGravLinha}>
                            <Video size={11} color={cores.slate400} />
                            <Text style={styles.agrupadoGrav}>
                              {gravados} gravado{gravados > 1 ? "s" : ""}
                            </Text>
                          </View>
                        )}
                      </View>
                    }
                  />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Rodape
        primario={
          <Pressable
            style={styles.verTimesBtn}
            onPress={() => router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`)}
          >
            <Users size={16} color={cores.orange} />
            <Text style={styles.verTimesTexto}>Ver os times</Text>
          </Pressable>
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
        Icone={RotateCcw}
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
      <View style={styles.modalEyebrowLinha}>
        <Timer size={16} color={cores.teal} />
        <Eyebrow>Cronômetro</Eyebrow>
      </View>
      <Text style={styles.modalTitulo}>Duração da rodada</Text>
      <Text style={styles.modalDescricao}>
        Controla quanto tempo cada rodada dura e, se quiser, quantos gols encerram ela antes da
        hora.
      </Text>
      <View style={styles.modalLinha}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalLabel}>Minutos por rodada</Text>
        </View>
        <Stepper valor={duracao} onChange={setDuracao} min={0} max={90} />
      </View>
      <View style={styles.modalLinha}>
        <View style={{ flex: 1 }}>
          <Text style={styles.modalLabel}>Gols pra encerrar antes (0 = só tempo)</Text>
        </View>
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
      {config.duracaoRodadaMin > 0 && (
        <Pressable
          style={styles.modalRemover}
          onPress={() =>
            onSalvar({
              jogadoresPorTime: config.jogadoresPorTime,
              duracaoRodadaMin: 0,
              golsParaEncerrarRodada: 0,
            })
          }
        >
          <Text style={styles.modalRemoverTexto}>Remover cronômetro</Text>
        </Pressable>
      )}
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150, gap: 16 },
  // Contorno laranja, sem preenchimento: no site esse botão é discreto de
  // propósito (o cronômetro/gols é o foco da tela), diferente do laranja
  // sólido do BotaoPrimario usado nas ações principais das outras telas.
  verTimesBtn: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.laranjaBorda,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  verTimesTexto: { fontSize: 15, fontWeight: "600", color: cores.orange },
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
  ordGrupo: {
    flexDirection: "row",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    overflow: "hidden",
  },
  ordBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  ordBtnDivisor: { borderLeftWidth: 1, borderLeftColor: cores.avisoBorda },
  ordBtnAtivo: { backgroundColor: cores.teal },
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
  golBtnOff: { opacity: 0.4 },
  golBtnTexto: { fontSize: 13, fontWeight: "800", color: cores.dark },
  golGrav: { fontSize: 11, color: cores.slate400 },
  agrupadoDireita: { alignItems: "flex-end", gap: 3 },
  agrupadoGols: { fontSize: 14, fontWeight: "700", color: cores.teal },
  agrupadoGravLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  agrupadoGrav: { fontSize: 11, color: cores.slate400 },
  modalEyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalDescricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  modalLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
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
  modalRemover: { height: 40, alignItems: "center", justifyContent: "center" },
  modalRemoverTexto: { fontSize: 13, fontWeight: "600", color: cores.erroTexto },
});
