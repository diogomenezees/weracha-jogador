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
import { ReplaysDoJogadorInline } from "@/partida/ReplaysDoJogadorInline";
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
  ArrowLeftRight,
  Ban,
  Clock,
  EllipsisVertical,
  Goal,
  MapPin,
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
  formatarPartidaResumo,
  JANELA_CHECKIN_ANTES_HORAS,
  partidaAindaNaoComecou,
  partidaEncerrada,
  PRAZO_EDICAO_GOLS_HORAS,
} from "@/partidas";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { useVoltarDoCelular } from "@/ui/useVoltarDoCelular";
import type {
  ComentarioResenha,
  GolComVideos,
  Grupo,
  PartidaResumo,
  PodeComentar,
  Quadra,
} from "@/contrato/tipos";

type Aba = "TIMES" | "ARTILHEIROS" | "HISTORICO" | "LANCES";

export default function TelaResultado() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi, estado: sessao } = useSessao();
  const meuId = sessao.fase === "logado" ? sessao.jogador.id : null;
  const minhaDataNasc = sessao.fase === "logado" ? sessao.jogador.dataNascimento : null;

  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);
  const [partida, setPartida] = useState<PartidaResumo | null | undefined>(undefined);
  // Quadra vinculada ao grupo (já vem na mesma chamada dos dados do grupo). A pílula da
  // quadra abre o modal com nome e endereço, igual ao site.
  const [quadra, setQuadra] = useState<Quadra | null>(null);
  const [modalQuadra, setModalQuadra] = useState(false);
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
  // Gol que o menu pediu pra cancelar: confirma antes (igual ao site).
  const [golParaCancelar, setGolParaCancelar] = useState<GolComVideos | null>(null);
  const [cancelandoGol, setCancelandoGol] = useState(false);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  // Só em memória de propósito (igual ao site): some ao sair da tela.
  const [avisoGolsFechado, setAvisoGolsFechado] = useState(false);
  // Replays abertos INLINE no lugar da lista de artilheiros: os de um jogador (toque no
  // agrupado) ou só o de um gol (toque na linha do tempo).
  const [replayInline, setReplayInline] = useState<{
    jogadorId: string;
    golId?: string;
  } | null>(null);
  // Voltar do celular com replays abertos fecha eles (volta pra lista), não sai da tela.
  useVoltarDoCelular(replayInline !== null, () => setReplayInline(null));

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
    setQuadra(dados.quadra ?? null);
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

  // Todo mundo da partida, com quantos gols já tem, pro modal "Adicionar gol": serve pra
  // quem ainda não tem gol e pra quem já tem e esqueceram de marcar mais um.
  const jogadoresParaAdicionarGol = useMemo(
    () =>
      [...todosDaPartida]
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
        .map((j) => ({ ...j, gols: golsPorJogador[j.id] ?? 0 })),
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
  // As abas Artilheiros/Histórico/Lances só fazem sentido com a partida encerrada —
  // enquanto o jogo rola, o que importa aqui é ver quem está em quadra (o resto
  // é a tela "Ao vivo"). Mesma regra do site.
  const temAbaArtilheiros = encerrada && golsAtivos.length > 0;
  // Histórico = linha do tempo dos gols (inclui os cancelados) e onde o admin ajusta gols
  // (aviso das 24h, "Adicionar gol", menu ⋮ de cada gol). Por isso aparece também pro admin
  // dentro do prazo sem nenhum gol registrado: é o único caminho pra adicionar o primeiro.
  const temAbaHistorico = encerrada && (gols.length > 0 || podeEditarGols);
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
  // gol tocado, mesmo cancelado (o vídeo é a prova de que o gol não valia). Pela lista do
  // jogador (aba Artilheiros), gol cancelado fica de fora, pra bater com o "N gravado" dele.
  const jogadorDoReplay = replayInline
    ? (gols.find((x) => x.jogador?.id === replayInline.jogadorId)?.jogador ?? {
        id: replayInline.jogadorId,
        nome: jogadoresDoPainel.find((j) => j.jogadorId === replayInline.jogadorId)?.nome ?? "Jogador",
        fotoUrl: jogadoresDoPainel.find((j) => j.jogadorId === replayInline.jogadorId)?.fotoUrl ?? null,
      })
    : null;
  const golsDoReplayInline = replayInline
    ? gols.filter(
        (x) =>
          x.jogador?.id === replayInline.jogadorId &&
          x.videos.length > 0 &&
          (replayInline.golId ? x.golId === replayInline.golId : !x.cancelado)
      )
    : [];

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: "TIMES", rotulo: "Times" },
    ...(temAbaArtilheiros ? [{ chave: "ARTILHEIROS" as Aba, rotulo: "Artilheiros" }] : []),
    ...(temAbaHistorico ? [{ chave: "HISTORICO" as Aba, rotulo: "Histórico" }] : []),
    ...(temAbaLances ? [{ chave: "LANCES" as Aba, rotulo: "Lances" }] : []),
  ];
  const abaVisivel: Aba =
    (aba === "ARTILHEIROS" && !temAbaArtilheiros) ||
    (aba === "HISTORICO" && !temAbaHistorico) ||
    (aba === "LANCES" && !temAbaLances)
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
          {g.quadraId ? (
            <Pressable style={[styles.esportePill, styles.quadraPill]} onPress={() => setModalQuadra(true)}>
              <MapPin size={12} color={cores.branco} />
              <Text style={[styles.esportePillTexto, { flexShrink: 1 }]} numberOfLines={1}>
                {quadra?.nome ?? "Quadra não encontrada"}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.esportePill}>
              <Text style={styles.esportePillTexto}>{g.esporte}</Text>
            </View>
          )}
          <View style={styles.infoPill}>
            <Clock size={12} color={cores.zinc500} />
            <Text style={styles.infoPillTexto}>
              {formatarPartidaResumo(new Date(p.data))}
            </Text>
          </View>
          <View style={styles.infoPill}>
            <IconeModoSorteio size={12} color={cores.zinc500} />
            <Text style={styles.infoPillTexto}>{rotuloModoSorteio}</Text>
          </View>
        </View>
        {abas.length > 1 && (
          <Abas
            opcoes={abas}
            valor={abaVisivel}
            onChange={(nova) => {
              // Os replays inline são de uma aba só: trocar de aba volta pra lista.
              setReplayInline(null);
              setAba(nova);
            }}
          />
        )}

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
        ) : abaVisivel === "ARTILHEIROS" || abaVisivel === "HISTORICO" ? (
          <View style={{ gap: 10 }}>
            {abaVisivel === "HISTORICO" && souAdmin && podeEditarGols && !avisoGolsFechado && (
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
                pra não perder a posição da lista ao voltar. Artilheiros = agrupado por
                jogador; Histórico = linha do tempo. */}
            <View style={replayInline ? styles.escondido : undefined}>
              <PainelGols
                modoFixo={abaVisivel === "HISTORICO" ? "CRONOLOGICO" : "AGRUPADO"}
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

            {replayInline && jogadorDoReplay && (
              <ReplaysDoJogadorInline
                jogador={jogadorDoReplay}
                gols={golsDoReplayInline}
                grupoNome={g.nome}
                apenasUmGol={!!replayInline.golId}
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

      <ModalCartao aberto={modalQuadra} onFechar={() => setModalQuadra(false)}>
        <View style={styles.modalEyebrowLinha}>
          <MapPin size={16} color={cores.teal} />
          <Eyebrow>Quadra</Eyebrow>
        </View>
        <Text style={styles.modalTitulo}>{quadra?.nome ?? "Quadra não encontrada"}</Text>
        {quadra && quadra.status !== "VALIDADA" && (
          <View style={styles.pendentePill}>
            <Text style={styles.pendenteTexto}>Pendente</Text>
          </View>
        )}
        <View style={[styles.esportePill, { alignSelf: "flex-start" }]}>
          <Text style={styles.esportePillTexto}>{g.esporte}</Text>
        </View>
        <Text style={styles.modalDesc}>{quadra?.endereco ?? "Endereço não informado."}</Text>
      </ModalCartao>

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
            ? // Cancelar é a última opção (a mais destrutiva), igual o site.
              menuGol.cancelado
              ? ([
                  {
                    rotulo: "Reativar gol",
                    Icone: RotateCcw,
                    onPress: () => void acaoGol(() => reativarGol(chamarApi, menuGol.golId)),
                  },
                ] as ItemMenu[])
              : ([
                  {
                    rotulo: "Migrar pra outro jogador",
                    Icone: ArrowLeftRight,
                    onPress: () => setMigrar(menuGol),
                  },
                  {
                    rotulo: "Cancelar gol",
                    Icone: Ban,
                    destrutivo: true,
                    onPress: () => setGolParaCancelar(menuGol),
                  },
                ] as ItemMenu[])
            : []
        }
        onFechar={() => setMenuGol(null)}
      />

      <ModalConfirmar
        aberto={golParaCancelar !== null}
        Icone={Ban}
        eyebrow="Cancelar gol"
        titulo={`Cancelar esse gol de ${golParaCancelar?.jogador?.nome ?? ""}?`}
        descricao={
          golParaCancelar && golParaCancelar.videos.length > 0
            ? "O gol sai do ranking de artilheiros, da contagem e da resenha. Fica na linha do tempo marcado como cancelado, e o replay continua disponível ali como registro. Dá pra reativar o gol depois."
            : "O gol sai do ranking de artilheiros e da contagem. Fica registrado na linha do tempo que foi cancelado, e dá pra reativar depois."
        }
        destrutivo
        confirmarLabel="Sim, cancelar"
        ocupado={cancelandoGol}
        onConfirmar={async () => {
          const gol = golParaCancelar;
          if (!gol) return;
          setCancelandoGol(true);
          await acaoGol(() => cancelarGol(chamarApi, gol.golId));
          setCancelandoGol(false);
          setGolParaCancelar(null);
        }}
        onFechar={() => {
          if (!cancelandoGol) setGolParaCancelar(null);
        }}
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
          jogadores={jogadoresParaAdicionarGol}
          onFechar={() => setAdicionarGol(false)}
          onSalvar={async (jogadorId, total) => {
            setAdicionarGol(false);
            await acaoGol(() => corrigirGols(chamarApi, partidaId, jogadorId, total));
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

// Qualquer jogador da partida (com ou sem gol registrado). Só AUMENTA: o contador é
// "quantos gols adicionar" (mínimo 1), e a API recebe o total (o que já tem + o que
// está adicionando). Pra tirar um gol, o admin usa "Cancelar gol" no menu da linha do tempo.
function ModalAdicionarGol({
  jogadores,
  onFechar,
  onSalvar,
}: {
  jogadores: { id: string; nome: string; gols: number }[];
  onFechar: () => void;
  onSalvar: (jogadorId: string, total: number) => void;
}) {
  const [sel, setSel] = useState<string | null>(jogadores[0]?.id ?? null);
  const [adicionar, setAdicionar] = useState(1);
  const jaTem = jogadores.find((j) => j.id === sel)?.gols ?? 0;

  return (
    <ModalCartao aberto onFechar={onFechar}>
      <View style={styles.modalEyebrowLinha}>
        <Goal size={16} color={cores.teal} />
        <Eyebrow>Adicionar gol</Eyebrow>
      </View>
      <Text style={styles.modalTitulo}>Quem fez o gol?</Text>
      {jogadores.length === 0 ? (
        <Text style={styles.modalDesc}>Ninguém fez check-in nessa partida.</Text>
      ) : (
        <>
          <ScrollView style={{ maxHeight: 220 }}>
            {jogadores.map((j) => (
              <Pressable
                key={j.id}
                style={[styles.opcao, styles.opcaoLinha, sel === j.id && styles.opcaoAtiva]}
                onPress={() => {
                  setSel(j.id);
                  setAdicionar(1);
                }}
              >
                <Text style={[styles.opcaoTexto, { flex: 1 }]} numberOfLines={1}>
                  {j.nome}
                </Text>
                {j.gols > 0 && (
                  <Text style={styles.opcaoGols}>
                    {j.gols} gol{j.gols > 1 ? "s" : ""}
                  </Text>
                )}
              </Pressable>
            ))}
          </ScrollView>
          <Text style={styles.modalRotulo}>Gols a adicionar</Text>
          <View style={styles.modalStepper}>
            <Stepper valor={adicionar} onChange={setAdicionar} min={1} max={30} />
          </View>
          <Text style={[styles.modalDesc, { textAlign: "center" }]}>
            {jaTem > 0
              ? `Já tem ${jaTem} gol${jaTem > 1 ? "s" : ""}. Depois de salvar: ${jaTem + adicionar}.`
              : "Ainda não tem gol registrado."}{" "}
            Pra tirar um gol, use Cancelar gol no menu da linha do tempo.
          </Text>
          <Pressable
            style={styles.modalBotao}
            disabled={!sel}
            onPress={() => sel && onSalvar(sel, jaTem + adicionar)}
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
  // Pílula da quadra: mesma cor da do esporte, com o ícone de pino à frente e clicável.
  quadraPill: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  pendentePill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pendenteTexto: { fontSize: 10, fontWeight: "700", color: cores.ambar, textTransform: "uppercase" },
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
  opcaoLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  opcaoGols: { fontSize: 12, color: cores.slate400 },
  modalEyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalRotulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: cores.slate400,
    textAlign: "center",
    textTransform: "uppercase",
    marginTop: 4,
  },
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
