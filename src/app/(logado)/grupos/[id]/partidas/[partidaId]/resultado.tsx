import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { router, useLocalSearchParams } from "expo-router";

import { buscarDadosDoGrupo } from "@/api/grupos";
import { buscarApoioDaPartida } from "@/api/checkins";
import {
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
import { ListaReplays } from "@/partida/ListaReplays";
import { montarResultado, type ResultadoMontado } from "@/partida/montarResultado";
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
  ToggleScore,
} from "@/partida/ui";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { ArrowLeftRight, Ban, EllipsisVertical, Plus, RotateCcw, Share2, Shuffle } from "@/ui/Icone";
import { buscarPartida, duracaoDaPartida } from "@/grupos";
import {
  dentroDoPrazoDeEdicaoDeGols,
  formatarDiaSemanaData,
  formatarHora,
  JANELA_CHECKIN_ANTES_HORAS,
  partidaAindaNaoComecou,
  partidaEncerrada,
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

  const carregar = useCallback(async () => {
    const [dados, resultado, gs, ls, apoio] = await Promise.all([
      buscarDadosDoGrupo(chamarApi, id),
      buscarResultadoAtivo(chamarApi, partidaId),
      buscarGols(chamarApi, partidaId, { incluirCancelados: true }),
      buscarLances(chamarApi, partidaId),
      buscarApoioDaPartida(chamarApi, partidaId),
    ]);
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
    const msg =
      `Saiu o resultado do racha do grupo ${grupo.nome}.\n` +
      `${formatarDiaSemanaData(d)} às ${formatarHora(d)}.\n` +
      `Veja os times e os gols no We Racha.`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelou
    }
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
        <TelaCarregando mensagem="Carregando resultado..." />
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
  if (partidaAindaNaoComecou(new Date(p.data), duracaoDaPartida(g, p))) {
    return (
      <TelaPartida>
        <AvisoPartida
          mensagem={`Essa tela abre ${JANELA_CHECKIN_ANTES_HORAS} horas antes da partida.`}
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }
  if (!montado) return <TelaPartida><TelaCarregando mensagem="Carregando resultado..." /></TelaPartida>;

  const timeQueComeca = montado.comecaComABola === 0 ? 1 : montado.comecaComABola === 1 ? 2 : null;
  const lancesComVideo = lances.filter((l) => l.videos.length > 0);
  // As abas Artilheiros/Lances só fazem sentido com a partida encerrada —
  // enquanto o jogo rola, o que importa aqui é ver quem está em quadra (o resto
  // é a tela "Ao vivo"). Mesma regra do site.
  const temAbaArtilheiros = encerrada && (golsAtivos.length > 0 || podeEditarGols);
  const temAbaLances = encerrada && lancesComVideo.length > 0;

  const abas: { chave: Aba; rotulo: string }[] = [
    { chave: "TIMES", rotulo: encerrada ? "Resultado" : "Times" },
    ...(temAbaArtilheiros ? [{ chave: "ARTILHEIROS" as Aba, rotulo: "Artilheiros" }] : []),
    ...(temAbaLances ? [{ chave: "LANCES" as Aba, rotulo: "Lances" }] : []),
  ];
  const abaVisivel: Aba =
    (aba === "ARTILHEIROS" && !temAbaArtilheiros) || (aba === "LANCES" && !temAbaLances)
      ? "TIMES"
      : aba;

  return (
    <TelaPartida>
      <Cabecalho
        titulo={encerrada ? "Resultado" : "Times"}
        grupoNome={g.nome}
        descricao={p.descricao}
        direita={
          <View style={styles.cabDireita}>
            {encerrada && (
              <Pressable hitSlop={8} onPress={() => void compartilhar()}>
                <Share2 size={18} color={cores.orange} />
              </Pressable>
            )}
            {souAdmin && !encerrada && (
              <Pressable hitSlop={8} onPress={() => setMenuMais(true)}>
                <EllipsisVertical size={20} color={cores.slate300} />
              </Pressable>
            )}
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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
                  <View
                    key={i}
                    style={[
                      styles.timeCard,
                      montado.coresTimes[i]
                        ? { borderColor: montado.coresTimes[i] as string }
                        : styles.timeCardCinza,
                    ]}
                  >
                    <View style={styles.timeCabecalho}>
                      <Text style={styles.timeNome}>
                        👕 Time {i + 1}
                        {montado.times.length > 2 && i >= 2 ? "  ·  próximo" : ""}
                      </Text>
                      {montado.times.length >= 2 && i < 2 && timeQueComeca != null && (
                        <Text style={styles.timeBadge}>
                          {timeQueComeca === i + 1 ? "Começa com a bola" : "Escolhe o lado"}
                        </Text>
                      )}
                    </View>
                    {time.map((j) => (
                      <CardJogadorPartida
                        key={j.jogadorId}
                        id={j.jogadorId}
                        nome={j.nome}
                        apelido={j.apelido}
                        fotoUrl={j.fotoUrl}
                        posicaoNome={j.posicaoNome}
                        score={j.score}
                        mostrarScore={!!souAdmin && verScore}
                        souEu={j.jogadorId === meuId}
                      />
                    ))}
                  </View>
                ))}
                {montado.proximos.length > 0 && (
                  <View style={[styles.timeCard, styles.timeCardCinza]}>
                    <Text style={styles.timeNome}>Próximos</Text>
                    {montado.proximos.map((j) => (
                      <CardJogadorPartida
                        key={j.jogadorId}
                        id={j.jogadorId}
                        nome={j.nome}
                        apelido={j.apelido}
                        fotoUrl={j.fotoUrl}
                        posicaoNome={j.posicaoNome}
                        score={j.score}
                        mostrarScore={!!souAdmin && verScore}
                        souEu={j.jogadorId === meuId}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        ) : abaVisivel === "ARTILHEIROS" ? (
          <View style={{ gap: 10 }}>
            {podeEditarGols && (
              <Pressable style={styles.adicionarGol} onPress={() => setAdicionarGol(true)}>
                <Plus size={14} color={cores.ambar} />
                <Text style={styles.adicionarGolTexto}>Adicionar gol</Text>
              </Pressable>
            )}
            {erroAcao && <Text style={styles.erroAcao}>{erroAcao}</Text>}
            <Eyebrow>Linha do tempo</Eyebrow>
            {gols.length === 0 ? (
              <Text style={styles.vazio}>Nenhum gol registrado.</Text>
            ) : (
              gols.map((gol) => (
                <Pressable
                  key={gol.golId}
                  style={[styles.golLinha, gol.cancelado && styles.golCancelado]}
                  disabled={!podeEditarGols}
                  onPress={() => podeEditarGols && setMenuGol(gol)}
                >
                  <AvatarJogador
                    id={gol.jogador?.id}
                    nome={gol.jogador?.nome ?? "?"}
                    fotoUrl={gol.jogador?.fotoUrl}
                    tamanho={32}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.golNome}>
                      {gol.jogador?.nome ?? "Ex-jogador"}
                      {gol.cancelado ? "  (cancelado)" : ""}
                      {gol.origem === "CORRECAO" ? "  ·  editado" : ""}
                    </Text>
                    <Text style={styles.golHora}>
                      {formatarHora(new Date(gol.criadoEm))}
                      {gol.migracao ? `  ·  de ${gol.migracao.deNome}` : ""}
                    </Text>
                  </View>
                  {podeEditarGols && <EllipsisVertical size={16} color={cores.slate400} />}
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <ListaReplays
            gols={lancesComVideo}
            vazioTexto="Nenhum lance importante nessa partida."
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
      </ScrollView>

      <Rodape
        voltarRotulo="Grupo"
        onVoltar={() => router.replace(`/grupos/${id}`)}
        primario={
          !encerrada ? (
            <BotaoPrimario
              titulo="Ao vivo"
              cor="red"
              onPress={() => router.replace(`/grupos/${id}/partidas/${partidaId}/ao-vivo`)}
            />
          ) : undefined
        }
      />

      <MenuAcoes
        aberto={menuMais}
        titulo="Resultado"
        itens={[
          {
            rotulo: "Refazer o sorteio",
            Icone: Shuffle,
            destrutivo: true,
            onPress: () => setConfirmarRefazer(true),
          },
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
  cabDireita: { flexDirection: "row", gap: 12, paddingTop: 4 },
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
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  timeCardCinza: { borderColor: "rgba(255,255,255,0.12)", backgroundColor: cores.superficieSutil },
  timeCabecalho: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  timeNome: { fontSize: 14, fontWeight: "800", color: cores.branco, textTransform: "uppercase", letterSpacing: 1 },
  timeBadge: { fontSize: 10, color: cores.slate400 },
  adicionarGol: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    padding: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  adicionarGolTexto: { fontSize: 13, fontWeight: "700", color: cores.ambar },
  erroAcao: { fontSize: 13, color: cores.erroTexto },
  vazio: { fontSize: 13, color: cores.slate400 },
  golLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  golCancelado: { opacity: 0.5 },
  golNome: { fontSize: 14, fontWeight: "600", color: cores.branco },
  golHora: { fontSize: 12, color: cores.slate500 },
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
