import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { router, useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarApoioDaPartida } from "@/api/checkins";
import {
  buscarEstadoAoVivo,
  buscarGols,
  buscarLances,
  buscarResultadoAtivo,
  cancelarGol,
  corrigirGols,
  migrarGol,
  reativarGol,
  refazerSorteio,
} from "@/api/partidas";
import { buscarComentariosEmLote } from "@/api/resenha";
import { mensagemDoErro } from "@/mensagens-erro";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalCartao, ModalConfirmar } from "@/grupo/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { CardsReplay } from "@/partida/CardsReplay";
import { PainelGols } from "@/partida/PainelGols";
import { montarResultado, type JogadorNoTime, type ResultadoMontado } from "@/partida/montarResultado";
import {
  Abas,
  AvisoPartida,
  Cabecalho,
  Eyebrow,
  Rodape,
  BotaoPrimario,
  Stepper,
  TelaPartida,
  ToggleScore,
} from "@/partida/ui";
import { AvatarJogador } from "@/ui/AvatarJogador";
import {
  ArrowLeft,
  ArrowLeftRight,
  Ban,
  Clock,
  EllipsisVertical,
  Plus,
  Radio,
  RotateCcw,
  Share2,
  Shield,
  Shirt,
  Shuffle,
  Star,
  TriangleAlert,
  X,
} from "@/ui/Icone";
import { buscarPartida, duracaoDaPartida } from "@/grupos";
import {
  dentroDoPrazoDeEdicaoDeGols,
  formatarDiaSemanaData,
  formatarHora,
  JANELA_CHECKIN_ANTES_HORAS,
  partidaAindaNaoComecou,
  partidaEncerrada,
  PRAZO_EDICAO_GOLS_HORAS,
} from "@/partidas";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type {
  ComentarioResenha,
  GolComVideos,
  Grupo,
  PartidaResumo,
  PodeComentar,
} from "@/contrato/tipos";

type Aba = "TIMES" | "ARTILHEIROS" | "LANCES";

export default function TelaResultado() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi, estado: sessao } = useSessao();
  const meuId = sessao.fase === "logado" ? sessao.jogador.id : null;
  const minhaDataNasc = sessao.fase === "logado" ? sessao.jogador.dataNascimento : null;

  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);
  const [partida, setPartida] = useState<PartidaResumo | null | undefined>(undefined);
  const [montado, setMontado] = useState<ResultadoMontado | null>(null);
  const [gols, setGols] = useState<GolComVideos[]>([]);
  const [lances, setLances] = useState<GolComVideos[]>([]);
  const [comentarios, setComentarios] = useState<Record<string, ComentarioResenha[]>>({});
  // Do estado "ao vivo" da partida: se o We Racha Cam avisou que gravou (liga os ícones
  // de replay por gol) e quantos replays cada jogador tem. Null = não deu pra buscar.
  const [aoVivoDaPartida, setAoVivoDaPartida] = useState<{
    cameraAtiva: boolean;
    golsGravadosPorJogador: Record<string, number>;
  } | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [aba, setAba] = useState<Aba>("TIMES");
  const [verScore, setVerScore] = useState(false);
  const [menuGol, setMenuGol] = useState<GolComVideos | null>(null);
  const [menuMais, setMenuMais] = useState(false);
  const [confirmarRefazer, setConfirmarRefazer] = useState(false);
  const [adicionarGol, setAdicionarGol] = useState(false);
  const [migrar, setMigrar] = useState<GolComVideos | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  // Só em memória de propósito (igual ao site): some ao sair da tela.
  const [avisoGolsFechado, setAvisoGolsFechado] = useState(false);
  // Replays abertos INLINE no lugar da lista de artilheiros: os de um jogador (toque no
  // agrupado) ou só o de um gol (toque na linha do tempo).
  const [replayInline, setReplayInline] = useState<{
    jogadorId: string;
    golId?: string;
  } | null>(null);

  const carregar = useCallback(async () => {
    const [dados, resultado, gs, ls, apoio, aoVivo] = await Promise.all([
      buscarDadosDoGrupo(chamarApi, id),
      buscarResultadoAtivo(chamarApi, partidaId),
      buscarGols(chamarApi, partidaId, { incluirCancelados: true }),
      buscarLances(chamarApi, partidaId),
      buscarApoioDaPartida(chamarApi, partidaId),
      buscarEstadoAoVivo(chamarApi, partidaId).catch(() => null),
    ]);
    setAoVivoDaPartida(
      aoVivo
        ? {
            cameraAtiva: aoVivo.cameraAtiva,
            golsGravadosPorJogador: aoVivo.golsGravadosPorJogador,
          }
        : null
    );
    const g = dados.grupo ?? null;
    const p = g ? buscarPartida(g, partidaId) ?? null : null;
    setGrupo(g);
    setPartida(p);
    setGols(gs);
    setLances(ls);

    if (!g || !p) return;
    if (!resultado) {
      router.replace(`/grupos/${id}/partidas/${partidaId}/configurar`);
      return;
    }
    setMontado(
      montarResultado(resultado, apoio.checkins, apoio.membros, apoio.posicoes, apoio.jogadores)
    );

    const ids = [
      ...gs.map((x) => x.pedidoReplayId),
      ...ls.filter((x) => x.videos.length > 0).map((x) => x.pedidoReplayId),
    ].filter((x): x is string => !!x);
    if (ids.length > 0) {
      setComentarios(await buscarComentariosEmLote(chamarApi, ids));
    }
  }, [chamarApi, id, partidaId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregar();
        if (vivo) setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  async function recarregarGols() {
    try {
      setGols(await buscarGols(chamarApi, partidaId, { incluirCancelados: true }));
    } catch {
      // mantém
    }
  }

  const souAdmin = grupo?.meuPapel === "ADMIN";
  const encerrada =
    !!partida && !!grupo && partidaEncerrada(new Date(partida.data), duracaoDaPartida(grupo, partida));
  const podeEditarGols =
    !!souAdmin &&
    !!partida &&
    !!grupo &&
    dentroDoPrazoDeEdicaoDeGols(new Date(partida.data), duracaoDaPartida(grupo, partida));

  const golsAtivos = useMemo(() => gols.filter((g) => !g.cancelado), [gols]);
  const golsPorJogador = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of golsAtivos) if (g.jogador) m[g.jogador.id] = (m[g.jogador.id] ?? 0) + 1;
    return m;
  }, [golsAtivos]);

  const todosDaPartida = useMemo(() => {
    if (!montado) return [] as { id: string; nome: string }[];
    return [...montado.times.flat(), ...montado.proximos].map((j) => ({
      id: j.jogadorId,
      nome: j.nome,
    }));
  }, [montado]);

  const jogadoresSemGol = useMemo(
    () => todosDaPartida.filter((j) => (golsPorJogador[j.id] ?? 0) === 0),
    [todosDaPartida, golsPorJogador]
  );

  const podeComentar: PodeComentar = minhaDataNasc ? { ok: true } : { ok: false, motivo: "sem-data-nascimento" };

  async function acaoGol(fn: () => Promise<unknown>) {
    setErroAcao(null);
    try {
      await fn();
      await recarregarGols();
    } catch (e) {
      setErroAcao(mensagemDoErro(e));
    }
  }

  async function compartilhar() {
    if (!grupo || !partida) return;
    const d = new Date(partida.data);
    const msg = encerrada
      ? `Saiu o resultado do racha do grupo ${grupo.nome}.\n` +
        `${formatarDiaSemanaData(d)} às ${formatarHora(d)}.\n` +
        `Veja os times e os gols no We Racha.`
      : `Saiu a separação dos times do racha do grupo ${grupo.nome}.\n` +
        `${formatarDiaSemanaData(d)} às ${formatarHora(d)}.\n` +
        `Veja quem tá no seu time no We Racha.`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelou
    }
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
        <TelaCarregando mensagem="Carregando resultado..." />
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
  if (partidaAindaNaoComecou(new Date(p.data), duracaoDaPartida(g, p))) {
    return (
      <TelaPartida voltar="Grupo">
        <AvisoPartida
          mensagem={`Essa tela abre ${JANELA_CHECKIN_ANTES_HORAS} horas antes da partida.`}
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }
  if (!montado) {
    return (
      <TelaPartida voltar="Grupo">
        <TelaCarregando mensagem="Carregando resultado..." />
      </TelaPartida>
    );
  }

  const timeQueComeca = montado.comecaComABola === 0 ? 1 : montado.comecaComABola === 1 ? 2 : null;
  // Só há "jogando"/"próximo" de verdade quando dá pra formar os 2 primeiros
  // times por completo — com só 1 time (ou nenhum), ninguém está "esperando a
  // vez" ainda. Mesmo critério do site (weracha-site .../resultado/page.tsx).
  const temPartida = montado.times.length >= 2;
  const lancesComVideo = lances.filter((l) => l.videos.length > 0);
  // As abas Artilheiros/Lances só fazem sentido com a partida encerrada —
  // enquanto o jogo rola, o que importa aqui é ver quem está em quadra (o resto
  // é a tela "Ao vivo"). Mesma regra do site.
  const temAbaArtilheiros = encerrada && (golsAtivos.length > 0 || podeEditarGols);
  const temAbaLances = encerrada && lancesComVideo.length > 0;

  // Quem entra no painel de artilheiros (elenco da partida, com o que o card do jogador
  // mostra) e quantos replays cada um tem (do servidor; sem ele, conta pelos próprios gols).
  const jogadoresDoPainel = [...montado.times.flat(), ...montado.proximos];
  const golsGravadosPorJogador: Record<string, number> =
    aoVivoDaPartida?.golsGravadosPorJogador ??
    golsAtivos.reduce<Record<string, number>>((m, x) => {
      if (x.jogador && x.videos.length > 0) m[x.jogador.id] = (m[x.jogador.id] ?? 0) + 1;
      return m;
    }, {});
  // Replays do jogador abertos no lugar do painel. Pela linha do tempo (`golId`), só o
  // gol tocado.
  const jogadorDoReplay = replayInline
    ? (golsAtivos.find((x) => x.jogador?.id === replayInline.jogadorId)?.jogador ?? {
        id: replayInline.jogadorId,
        nome: jogadoresDoPainel.find((j) => j.jogadorId === replayInline.jogadorId)?.nome ?? "Jogador",
        fotoUrl: jogadoresDoPainel.find((j) => j.jogadorId === replayInline.jogadorId)?.fotoUrl ?? null,
      })
    : null;
  const golsDoReplayInline = replayInline
    ? golsAtivos.filter(
        (x) =>
          x.jogador?.id === replayInline.jogadorId &&
          x.videos.length > 0 &&
          (!replayInline.golId || x.golId === replayInline.golId)
      )
    : [];

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: "TIMES", rotulo: encerrada ? "Resultado" : "Times" },
    ...(temAbaArtilheiros ? [{ chave: "ARTILHEIROS" as Aba, rotulo: "Artilheiros" }] : []),
    ...(temAbaLances ? [{ chave: "LANCES" as Aba, rotulo: "Lances" }] : []),
  ];
  const abaVisivel: Aba =
    (aba === "ARTILHEIROS" && !temAbaArtilheiros) || (aba === "LANCES" && !temAbaLances)
      ? "TIMES"
      : aba;

  const IconeModoSorteio =
    montado.modoSorteio === "SORTE" ? Shuffle : montado.modoSorteio === "POSICAO" ? Shield : Star;
  const rotuloModoSorteio =
    montado.modoSorteio === "SORTE" ? "Sorte" : montado.modoSorteio === "POSICAO" ? "Posição" : "Score";

  return (
    <TelaPartida voltar="Grupo">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Cabecalho
          titulo={encerrada ? "Resultado" : "Times"}
          grupoNome={g.nome}
          descricao={p.descricao}
          direita={
            <Pressable hitSlop={8} onPress={() => setMenuMais(true)}>
              <EllipsisVertical size={20} color={cores.slate300} />
            </Pressable>
          }
        />
        <View style={styles.bridges}>
          <View style={styles.esportePill}>
            <Text style={styles.esportePillTexto}>{g.esporte}</Text>
          </View>
          <View style={styles.infoPill}>
            <Clock size={12} color={cores.zinc500} />
            <Text style={styles.infoPillTexto}>
              {formatarDiaSemanaData(new Date(p.data))} · {formatarHora(new Date(p.data))}
            </Text>
          </View>
          <View style={styles.infoPill}>
            <IconeModoSorteio size={12} color={cores.zinc500} />
            <Text style={styles.infoPillTexto}>{rotuloModoSorteio}</Text>
          </View>
        </View>
        {abas.length > 1 && <Abas opcoes={abas} valor={abaVisivel} onChange={setAba} />}

        {abaVisivel === "TIMES" ? (
          <View style={{ gap: 14 }}>
            <View style={styles.timesTopo}>
              <Eyebrow>{encerrada ? "Resultado final" : "Vão jogar agora"}</Eyebrow>
              {souAdmin && (
                <View style={styles.scoreToggleGrupo}>
                  <ToggleScore ligado={verScore} onToggle={() => setVerScore((v) => !v)} />
                </View>
              )}
            </View>
            {montado.times.length === 0 && montado.proximos.length === 0 ? (
              <Text style={styles.avisoErro}>Não foi possível formar nem um time completo.</Text>
            ) : (
              <>
                {montado.times.map((time, i) => (
                  <CardTime
                    key={i}
                    numero={i + 1}
                    jogadores={time}
                    mostrarScore={!!souAdmin && verScore}
                    badge={!temPartida ? null : i < 2 ? "jogando" : "proximo"}
                    comecaComABola={temPartida && i + 1 === timeQueComeca}
                    escolheLado={temPartida && i < 2 && i + 1 !== timeQueComeca}
                    corHex={montado.coresTimes[i] ?? null}
                  />
                ))}
                {montado.proximos.length > 0 && (
                  <CardTime
                    numero={montado.times.length + 1}
                    jogadores={montado.proximos}
                    mostrarScore={!!souAdmin && verScore}
                    badge="proximo"
                    comecaComABola={false}
                    escolheLado={false}
                    corHex={null}
                  />
                )}
              </>
            )}
          </View>
        ) : abaVisivel === "ARTILHEIROS" ? (
          <View style={{ gap: 10 }}>
            {souAdmin && podeEditarGols && !avisoGolsFechado && (
              <View style={styles.avisoGols}>
                <TriangleAlert size={16} color={cores.ambar} style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.avisoGolsTexto}>
                    É possível ajustar gols até {PRAZO_EDICAO_GOLS_HORAS}h depois do fim da partida.
                  </Text>
                  <Pressable style={styles.avisoGolsAcao} onPress={() => setAdicionarGol(true)}>
                    <Plus size={14} color={cores.ambar} />
                    <Text style={styles.avisoGolsAcaoTexto}>Adicionar gol</Text>
                  </Pressable>
                </View>
                <Pressable
                  hitSlop={8}
                  accessibilityLabel="Fechar aviso"
                  onPress={() => setAvisoGolsFechado(true)}
                >
                  <X size={16} color={cores.ambar} />
                </Pressable>
              </View>
            )}
            {erroAcao && <Text style={styles.erroAcao}>{erroAcao}</Text>}

            {/* O painel fica montado (só escondido) enquanto os replays estão abertos,
                pra não perder o modo agrupado/linha do tempo ao voltar. */}
            <View style={replayInline ? styles.escondido : undefined}>
              <PainelGols
                gols={gols}
                golsPorJogador={golsPorJogador}
                golsGravadosPorJogador={golsGravadosPorJogador}
                jogadores={jogadoresDoPainel}
                meuId={meuId}
                dataPartida={new Date(p.data)}
                mostrarScore={!!souAdmin && verScore}
                mostrarStatusGravacao={aoVivoDaPartida?.cameraAtiva ?? golsAtivos.some((x) => x.videos.length > 0)}
                slotDireita={
                  souAdmin ? <ToggleScore ligado={verScore} onToggle={() => setVerScore((v) => !v)} /> : undefined
                }
                podeEditarGols={podeEditarGols}
                onMenuGol={setMenuGol}
                onAbrirReplayJogador={(jogadorId) => setReplayInline({ jogadorId })}
                onAbrirReplayGol={(golId) => {
                  const g = gols.find((x) => x.golId === golId);
                  if (g?.jogador) setReplayInline({ jogadorId: g.jogador.id, golId });
                }}
              />
            </View>

            {replayInline && (
              <View style={{ gap: 10 }}>
                <Pressable style={styles.replayVoltar} onPress={() => setReplayInline(null)}>
                  <ArrowLeft size={16} color={cores.branco} />
                  <Text style={styles.replayVoltarTexto}>Artilheiros</Text>
                </Pressable>
                {jogadorDoReplay && (
                  <View style={styles.replayJogador}>
                    <AvatarJogador
                      id={jogadorDoReplay.id}
                      nome={jogadorDoReplay.nome}
                      fotoUrl={jogadorDoReplay.fotoUrl}
                      tamanho={48}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.replayJogadorNome} numberOfLines={1}>
                        {jogadorDoReplay.nome}
                      </Text>
                      <Text style={styles.replayJogadorSub}>
                        {replayInline.golId
                          ? "Replay desse gol"
                          : `${golsDoReplayInline.length} replay${golsDoReplayInline.length === 1 ? "" : "s"} nessa partida`}
                      </Text>
                    </View>
                  </View>
                )}
                <CardsReplay
                  gols={golsDoReplayInline}
                  grupoNome={g.nome}
                  vazioTexto="Nenhum replay desse jogador nessa partida."
                  comentar={{
                    chamarApi,
                    meuJogadorId: meuId,
                    podeComentar,
                    podeModerar: !!souAdmin,
                    porPedido: comentarios,
                    onComentarios: (pid, lista) =>
                      setComentarios((prev) => ({ ...prev, [pid]: lista })),
                  }}
                />
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            <Eyebrow>Lances importantes</Eyebrow>
            <CardsReplay
              gols={lancesComVideo}
              grupoNome={g.nome}
              vazioTexto="Nenhum lance importante registrado nessa partida."
              comentar={{
                chamarApi,
                meuJogadorId: meuId,
                podeComentar,
                podeModerar: !!souAdmin,
                porPedido: comentarios,
                onComentarios: (pid, lista) =>
                  setComentarios((prev) => ({ ...prev, [pid]: lista })),
              }}
            />
          </View>
        )}
      </ScrollView>

      {!encerrada && (
        <Rodape
          primario={
            <BotaoPrimario
              titulo="Ao vivo"
              cor="red"
              Icone={Radio}
              onPress={() => router.replace(`/grupos/${id}/partidas/${partidaId}/ao-vivo`)}
            />
          }
        />
      )}

      <MenuAcoes
        aberto={menuMais}
        titulo="Times"
        itens={[
          {
            rotulo: "Compartilhar resultado",
            Icone: Share2,
            cor: cores.orange,
            onPress: () => void compartilhar(),
          },
          ...(souAdmin && !encerrada
            ? [
                {
                  rotulo: "Refazer o sorteio",
                  Icone: Shuffle,
                  destrutivo: true,
                  onPress: () => setConfirmarRefazer(true),
                } as ItemMenu,
              ]
            : []),
        ]}
        onFechar={() => setMenuMais(false)}
      />

      <MenuAcoes
        aberto={menuGol !== null}
        titulo={menuGol?.jogador ? `Gol de ${menuGol.jogador.nome}` : "Gol"}
        itens={
          menuGol
            ? ([
                menuGol.cancelado
                  ? {
                      rotulo: "Reativar gol",
                      Icone: RotateCcw,
                      onPress: () => void acaoGol(() => reativarGol(chamarApi, menuGol.golId)),
                    }
                  : {
                      rotulo: "Cancelar gol",
                      Icone: Ban,
                      destrutivo: true,
                      onPress: () => void acaoGol(() => cancelarGol(chamarApi, menuGol.golId)),
                    },
                ...(!menuGol.cancelado
                  ? [
                      {
                        rotulo: "Migrar pra outro jogador",
                        Icone: ArrowLeftRight,
                        onPress: () => setMigrar(menuGol),
                      } as ItemMenu,
                    ]
                  : []),
              ] as ItemMenu[])
            : []
        }
        onFechar={() => setMenuGol(null)}
      />

      <ModalConfirmar
        aberto={confirmarRefazer}
        Icone={Shuffle}
        eyebrow="Refazer sorteio"
        titulo="Refazer o sorteio?"
        descricao="Descarta os times e o placar atuais, junto com os gols e lances registrados nessa partida."
        destrutivo
        confirmarLabel="Refazer"
        onConfirmar={async () => {
          setConfirmarRefazer(false);
          try {
            await refazerSorteio(chamarApi, partidaId);
            router.replace(`/grupos/${id}/partidas/${partidaId}/configurar`);
          } catch (e) {
            setErroAcao(mensagemDoErro(e));
          }
        }}
        onFechar={() => setConfirmarRefazer(false)}
      />

      {adicionarGol && (
        <ModalAdicionarGol
          jogadores={jogadoresSemGol}
          onFechar={() => setAdicionarGol(false)}
          onSalvar={async (jogadorId, quantidade) => {
            setAdicionarGol(false);
            await acaoGol(() => corrigirGols(chamarApi, partidaId, jogadorId, quantidade));
          }}
        />
      )}

      {migrar && (
        <ModalMigrarGol
          nome={migrar.jogador?.nome ?? ""}
          jogadores={todosDaPartida.filter((j) => j.id !== migrar.jogador?.id)}
          onFechar={() => setMigrar(null)}
          onSalvar={async (novoJogadorId) => {
            const golId = migrar.golId;
            setMigrar(null);
            await acaoGol(() => migrarGol(chamarApi, golId, novoJogadorId));
          }}
        />
      )}
    </TelaPartida>
  );
}

type BadgeTime = "jogando" | "proximo";

const ESTILO_BADGE_TIME: Record<
  BadgeTime,
  { cor: string; fundo: string; borda: string; label: string }
> = {
  jogando: {
    cor: "#6ee7b7",
    fundo: "rgba(16, 185, 129, 0.1)",
    borda: "rgba(16, 185, 129, 0.3)",
    label: "Em quadra",
  },
  proximo: {
    cor: cores.orange,
    fundo: cores.laranjaFundo,
    borda: cores.laranjaBorda,
    label: "Próximo",
  },
};

/** Card de um time no resultado: porte de `TimeCard` de
 * weracha-site/.../resultado/page.tsx. Cor do colete vira fundo bem sutil
 * (mesma técnica do site: hex + "12" ≈ 7% de opacidade) + borda cheia, em vez
 * de só borda — sem cor cadastrada, cinza neutro (ver comentário no site
 * sobre não ter default bonito de propósito). */
function CardTime({
  numero,
  jogadores,
  mostrarScore,
  badge,
  comecaComABola,
  escolheLado,
  corHex,
}: {
  numero: number;
  jogadores: JogadorNoTime[];
  mostrarScore: boolean;
  badge: BadgeTime | null;
  comecaComABola: boolean;
  escolheLado: boolean;
  corHex: string | null;
}) {
  return (
    <View
      style={[
        styles.timeCard,
        corHex ? { borderColor: corHex, backgroundColor: `${corHex}12` } : styles.timeCardCinza,
      ]}
    >
      <View style={styles.timeCabecalho}>
        <View style={{ flex: 1 }}>
          <View style={styles.timeNomeLinha}>
            <Shirt size={16} color={corHex ?? cores.branco} />
            <Text style={styles.timeNome}>Time {numero}</Text>
          </View>
          {(comecaComABola || escolheLado) && (
            <Text style={styles.timeSub}>
              {comecaComABola ? "Começa com a bola" : "Escolhe o lado da quadra"}
            </Text>
          )}
        </View>
        {badge && (
          <View
            style={[
              styles.timeBadgePill,
              {
                backgroundColor: ESTILO_BADGE_TIME[badge].fundo,
                borderColor: ESTILO_BADGE_TIME[badge].borda,
              },
            ]}
          >
            <Text style={[styles.timeBadgeTexto, { color: ESTILO_BADGE_TIME[badge].cor }]}>
              {ESTILO_BADGE_TIME[badge].label}
            </Text>
          </View>
        )}
      </View>
      <View style={{ gap: 12 }}>
        {jogadores.map((j) => (
          <LinhaJogadorTime key={j.jogadorId} jogador={j} mostrarScore={mostrarScore} />
        ))}
      </View>
    </View>
  );
}

/** Linha de jogador dentro de `CardTime`: porte de `JogadorLinha` do site.
 * Sem card/borda própria de propósito — já está dentro do card colorido do
 * time, uma segunda borda por jogador ficaria poluído (diferente do
 * CardJogadorPartida usado no check-in/configurar, que fica solto na tela). */
function LinhaJogadorTime({
  jogador,
  mostrarScore,
}: {
  jogador: JogadorNoTime;
  mostrarScore: boolean;
}) {
  const itens: ReactNode[] = [];
  if (jogador.apelido) {
    itens.push(<Text style={styles.linhaTimeMetaTexto}>{jogador.apelido}</Text>);
  }
  if (jogador.posicaoNome) {
    itens.push(
      <View style={styles.linhaTimeMetaItem}>
        <Shield size={11} color={cores.slate400} />
        <Text style={styles.linhaTimeMetaTexto}>{jogador.posicaoNome}</Text>
      </View>
    );
  }
  if (mostrarScore) {
    itens.push(
      <View style={styles.linhaTimeMetaItem}>
        <Star size={11} color={cores.slate400} />
        <Text style={styles.linhaTimeMetaTexto}>Score {jogador.score}</Text>
      </View>
    );
  }
  return (
    <View style={styles.linhaTime}>
      <AvatarJogador id={jogador.jogadorId} nome={jogador.nome} fotoUrl={jogador.fotoUrl} tamanho={36} />
      <View style={{ flex: 1 }}>
        <Text style={styles.linhaTimeNome} numberOfLines={1}>
          {jogador.nome}
        </Text>
        {itens.length > 0 && (
          <View style={styles.linhaTimeMeta}>
            {itens.map((item, i) => (
              <View key={i} style={styles.linhaTimeMetaItem}>
                {i > 0 && <Text style={styles.linhaTimeMetaTexto}>·</Text>}
                {item}
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function ModalAdicionarGol({
  jogadores,
  onFechar,
  onSalvar,
}: {
  jogadores: { id: string; nome: string }[];
  onFechar: () => void;
  onSalvar: (jogadorId: string, quantidade: number) => void;
}) {
  const [sel, setSel] = useState<string | null>(jogadores[0]?.id ?? null);
  const [qtd, setQtd] = useState(1);

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <Eyebrow>Adicionar gol</Eyebrow>
      <Text style={styles.modalTitulo}>Quem fez o gol?</Text>
      {jogadores.length === 0 ? (
        <Text style={styles.modalDesc}>Todo mundo da partida já tem gol registrado.</Text>
      ) : (
        <>
          <ScrollView style={{ maxHeight: 220 }}>
            {jogadores.map((j) => (
              <Pressable
                key={j.id}
                style={[styles.opcao, sel === j.id && styles.opcaoAtiva]}
                onPress={() => setSel(j.id)}
              >
                <Text style={styles.opcaoTexto}>{j.nome}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.modalStepper}>
            <Stepper valor={qtd} onChange={setQtd} min={0} max={30} />
          </View>
          <Pressable
            style={styles.modalBotao}
            disabled={!sel}
            onPress={() => sel && onSalvar(sel, qtd)}
          >
            <Text style={styles.modalBotaoTexto}>Salvar</Text>
          </Pressable>
        </>
      )}
    </ModalCartao>
  );
}

function ModalMigrarGol({
  nome,
  jogadores,
  onFechar,
  onSalvar,
}: {
  nome: string;
  jogadores: { id: string; nome: string }[];
  onFechar: () => void;
  onSalvar: (novoJogadorId: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(jogadores[0]?.id ?? null);
  return (
    <ModalCartao aberto onFechar={onFechar}>
      <Eyebrow>Migrar gol</Eyebrow>
      <Text style={styles.modalTitulo}>Migrar o gol de {nome} pra quem?</Text>
      <Text style={styles.modalDesc}>
        Use quando o gol foi marcado no jogador errado. Fica registrado que {nome} era o dono
        original.
      </Text>
      {jogadores.length === 0 ? (
        <Text style={styles.modalDesc}>Não há outro jogador nessa partida.</Text>
      ) : (
        <>
          <ScrollView style={{ maxHeight: 220 }}>
            {jogadores.map((j) => (
              <Pressable
                key={j.id}
                style={[styles.opcao, sel === j.id && styles.opcaoAtiva]}
                onPress={() => setSel(j.id)}
              >
                <Text style={styles.opcaoTexto}>{j.nome}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            style={styles.modalBotao}
            disabled={!sel}
            onPress={() => sel && onSalvar(sel)}
          >
            <Text style={styles.modalBotaoTexto}>Migrar gol</Text>
          </Pressable>
        </>
      )}
    </ModalCartao>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150, gap: 16 },
  bridges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  esportePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: cores.tealDark,
  },
  esportePillTexto: { fontSize: 12, fontWeight: "500", color: cores.branco },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(113, 113, 122, 0.15)",
  },
  infoPillTexto: { fontSize: 12, color: cores.zinc500 },
  timesTopo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreToggleGrupo: { flexDirection: "row", alignItems: "center", gap: 8 },
  avisoErro: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    padding: 12,
    fontSize: 13,
    color: cores.erroTexto,
  },
  timeCard: {
    borderRadius: raio.card,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  timeCardCinza: { borderColor: "rgba(255,255,255,0.12)", backgroundColor: cores.superficieSutil },
  timeCabecalho: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  timeNomeLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeNome: { fontSize: 13, fontWeight: "800", color: cores.branco, textTransform: "uppercase", letterSpacing: 1 },
  timeSub: { marginTop: 2, fontSize: 13, fontWeight: "500", color: cores.slate400 },
  timeBadgePill: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  timeBadgeTexto: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  linhaTime: { flexDirection: "row", alignItems: "center", gap: 10 },
  linhaTimeNome: { fontSize: 14, fontWeight: "600", color: cores.branco },
  linhaTimeMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 1, gap: 4 },
  linhaTimeMetaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  linhaTimeMetaTexto: { fontSize: 12, color: cores.slate400 },
  avisoGols: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  avisoGolsTexto: { fontSize: 14, lineHeight: 20, color: cores.ambar },
  avisoGolsAcao: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 },
  avisoGolsAcaoTexto: { fontSize: 12, fontWeight: "700", color: cores.ambar },
  escondido: { display: "none" },
  replayVoltar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
  },
  replayJogador: { flexDirection: "row", alignItems: "center", gap: 12 },
  replayJogadorNome: { fontSize: 18, fontWeight: "700", color: cores.branco },
  replayJogadorSub: { fontSize: 12, color: cores.slate400 },
  replayVoltarTexto: { fontSize: 15, color: cores.branco },
  erroAcao: { fontSize: 13, color: cores.erroTexto },
  opcao: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: cores.superficieSutil,
  },
  opcaoAtiva: { borderColor: cores.teal, backgroundColor: cores.avisoFundo },
  opcaoTexto: { fontSize: 15, color: cores.branco },
  modalStepper: { alignItems: "center", marginVertical: 6 },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalDesc: { fontSize: 13, lineHeight: 19, color: cores.slate400 },
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
