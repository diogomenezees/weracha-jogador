import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Text } from "@/ui/Texto";
import { X } from "@/ui/Icone";

import { buscarDadosDoGrupo } from "@/api/grupos";
import {
  buscarApoioDaPartida,
  cancelarMeuCheckin,
  definirPagamentoCheckin,
  fazerCheckinDeJogador,
  fazerMeuCheckin,
  removerCheckinDeJogador,
} from "@/api/checkins";
import { buscarResultadoAtivo } from "@/api/partidas";
import { definirMensalista } from "@/api/jogadores";
import { mensagemDoErro } from "@/mensagens-erro";
import { FormNovoJogador } from "@/jogadores/FormNovoJogador";
import { ModalPerfil } from "@/jogadores/modais";
import { ModalCartao, ModalConfirmar } from "@/grupo/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import {
  AvisoPartida,
  Cabecalho,
  CardJogadorPartida,
  Eyebrow,
  Rodape,
  BotaoPrimario,
  SegOrdenacao,
  TelaPartida,
  ToggleScore,
} from "@/partida/ui";
import { buscarPartida, duracaoDaPartida } from "@/grupos";
import { dentroDaJanelaDeCheckin, JANELA_CHECKIN_ANTES_MIN } from "@/partidas";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type {
  DadosDeApoioDaPartida,
  Grupo,
  JogadorEmPartida,
  PartidaResumo,
  ResultadoSalvo,
  TipoPagamento,
} from "@/contrato/tipos";

type Ordenacao = "NOME" | "MENSALISTA" | "SCORE";

export default function TelaCheckin() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi, estado } = useSessao();
  const meuId = estado.fase === "logado" ? estado.jogador.id : "";

  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);
  const [partida, setPartida] = useState<PartidaResumo | null | undefined>(undefined);
  const [apoio, setApoio] = useState<DadosDeApoioDaPartida | null>(null);
  const [resultado, setResultado] = useState<ResultadoSalvo | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("NOME");
  const [verScore, setVerScore] = useState(false);
  const [formNovo, setFormNovo] = useState(false);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [aguardando, setAguardando] = useState(false);

  const [confirmar, setConfirmar] = useState<
    | null
    | { tipo: "cancelarMeu" }
    | { tipo: "removerOutro"; jogador: JogadorEmPartida }
    | { tipo: "pagamento"; jogadorId: string; nome: string; novo: TipoPagamento }
  >(null);
  const [confOcupado, setConfOcupado] = useState(false);
  const [confErro, setConfErro] = useState<string | null>(null);

  const carregarApoio = useCallback(async () => {
    const [a, r] = await Promise.all([
      buscarApoioDaPartida(chamarApi, partidaId),
      buscarResultadoAtivo(chamarApi, partidaId),
    ]);
    setApoio(a);
    setResultado(r);
  }, [chamarApi, partidaId]);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const dados = await buscarDadosDoGrupo(chamarApi, id);
        if (!vivo) return;
        const g = dados.grupo ?? null;
        setGrupo(g);
        const p = g ? buscarPartida(g, partidaId) ?? null : null;
        setPartida(p);
        if (g && p) await carregarApoio();
        if (vivo) setErro(null);
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, id, partidaId, carregarApoio, tentativa]);

  // Polling 5s (só com o app em primeiro plano).
  useEffect(() => {
    if (!grupo || !partida) return;
    const t = setInterval(() => {
      if (AppState.currentState === "active") carregarApoio().catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [grupo, partida, carregarApoio]);

  const souAdmin = grupo?.meuPapel === "ADMIN";
  const jogadorPorId = useMemo(
    () => new Map((apoio?.jogadores ?? []).map((j) => [j.id, j])),
    [apoio?.jogadores]
  );
  const posicaoNomePorJogador = useMemo(() => {
    const nomePorPos = new Map((apoio?.posicoes ?? []).map((p) => [p.id, p.nome]));
    const m = new Map<string, string>();
    for (const mb of apoio?.membros ?? []) {
      const n = mb.posicaoId ? nomePorPos.get(mb.posicaoId) : undefined;
      if (n) m.set(mb.jogadorId, n);
    }
    return m;
  }, [apoio?.membros, apoio?.posicoes]);
  const scorePorJogador = useMemo(
    () => new Map((apoio?.checkins ?? []).map((c) => [c.jogadorId, c.scoreNoCheckin ?? 50])),
    [apoio?.checkins]
  );
  const pagamentoPorJogador = useMemo(
    () =>
      new Map<string, TipoPagamento>(
        (apoio?.checkins ?? []).map((c) => [c.jogadorId, c.tipoPagamento])
      ),
    [apoio?.checkins]
  );
  const presentesIds = useMemo(
    () => new Set((apoio?.checkins ?? []).map((c) => c.jogadorId)),
    [apoio?.checkins]
  );
  const jaFizCheckin = presentesIds.has(meuId);

  // Membro que já confirmou e o sorteio saiu: vai direto pro resultado.
  const jaAbriuResultado = useRef(false);
  useEffect(() => {
    if (souAdmin || !resultado || !jaFizCheckin || jaAbriuResultado.current) return;
    jaAbriuResultado.current = true;
    router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`);
  }, [souAdmin, resultado, jaFizCheckin, id, partidaId]);

  async function comConfirmacao(fn: () => Promise<unknown>) {
    setConfOcupado(true);
    setConfErro(null);
    try {
      await fn();
      setConfirmar(null);
      await carregarApoio();
    } catch (e) {
      setConfErro(mensagemDoErro(e));
    } finally {
      setConfOcupado(false);
    }
  }

  async function handleMeuCheckin() {
    try {
      await fazerMeuCheckin(chamarApi, partidaId);
      await carregarApoio();
      if (!souAdmin && !resultado) setAguardando(true);
    } catch (e) {
      setErro(mensagemDoErro(e));
    }
  }

  async function adicionarCheckin(jogador: JogadorEmPartida) {
    try {
      await fazerCheckinDeJogador(chamarApi, partidaId, jogador.id);
      setBusca("");
      await carregarApoio();
    } catch (e) {
      setErro(mensagemDoErro(e));
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
        <TelaCarregando mensagem="Carregando check-in..." />
      </TelaPartida>
    );
  }
  const grupoAtual = grupo;
  const partidaAtual = partida;
  if (!grupoAtual || !partidaAtual) {
    return (
      <TelaPartida>
        <AvisoPartida mensagem="Partida não encontrada." destino="/painel" rotuloDestino="Painel" />
      </TelaPartida>
    );
  }
  if (!apoio) {
    return (
      <TelaPartida>
        <TelaCarregando mensagem="Carregando check-in..." />
      </TelaPartida>
    );
  }
  if (partidaAtual.cancelada) {
    return (
      <TelaPartida>
        <AvisoPartida
          mensagem="Essa partida foi cancelada."
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }
  if (
    !dentroDaJanelaDeCheckin(
      new Date(partidaAtual.data),
      duracaoDaPartida(grupoAtual, partidaAtual)
    )
  ) {
    return (
      <TelaPartida>
        <AvisoPartida
          mensagem={`O check-in abre ${JANELA_CHECKIN_ANTES_MIN} minutos antes do início da partida.`}
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }

  const confirmados = [...presentesIds]
    .map((jid) => jogadorPorId.get(jid))
    .filter((j): j is JogadorEmPartida => !!j)
    .sort((a, b) => {
      if (ordenacao === "MENSALISTA") {
        const pa = pagamentoPorJogador.get(a.id) ?? "AVULSO";
        const pb = pagamentoPorJogador.get(b.id) ?? "AVULSO";
        if (pa !== pb) return pa === "MENSALISTA" ? -1 : 1;
      } else if (ordenacao === "SCORE") {
        const sa = scorePorJogador.get(a.id) ?? 50;
        const sb = scorePorJogador.get(b.id) ?? 50;
        if (sa !== sb) return sb - sa;
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });

  const alvo = busca.trim().toLowerCase();
  const resultadosBusca = alvo
    ? (apoio.membros ?? [])
        .filter((m) => !presentesIds.has(m.jogadorId))
        .map((m) => jogadorPorId.get(m.jogadorId))
        .filter((j): j is JogadorEmPartida => !!j)
        .filter(
          (j) =>
            j.nome.toLowerCase().includes(alvo) ||
            (j.apelido?.toLowerCase().includes(alvo) ?? false)
        )
    : [];

  const contagem =
    confirmados.length === 0
      ? "Aguardando jogadores"
      : `${confirmados.length} confirmado${confirmados.length === 1 ? "" : "s"}`;

  const podeAvancar = confirmados.length >= 2;

  return (
    <TelaPartida>
      <Cabecalho
        titulo="Lista de presença"
        grupoNome={grupoAtual.nome}
        descricao={partidaAtual.descricao}
      />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {souAdmin && (
          <View style={{ gap: 8 }}>
            <TextInput
              placeholder="Buscar jogador pelo nome ou apelido..."
              placeholderTextColor={cores.slate500}
              value={busca}
              onChangeText={setBusca}
              style={styles.input}
            />
            {alvo !== "" && (
              <View style={{ gap: 8 }}>
                {resultadosBusca.map((j) => (
                  <Pressable key={j.id} onPress={() => void adicionarCheckin(j)}>
                    <CardJogadorPartida
                      id={j.id}
                      nome={j.nome}
                      apelido={j.apelido}
                      fotoUrl={j.fotoUrl}
                      posicaoNome={posicaoNomePorJogador.get(j.id)}
                      direita={<Text style={styles.maisTexto}>＋</Text>}
                    />
                  </Pressable>
                ))}
                {resultadosBusca.length === 0 && (
                  <View style={styles.semResultado}>
                    <Text style={styles.semResultadoTexto}>
                      Nenhum jogador com esse nome no elenco.
                    </Text>
                    <Pressable style={styles.cadastrarBtn} onPress={() => setFormNovo(true)}>
                      <Text style={styles.cadastrarBtnTexto}>Cadastrar novo jogador</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {resultado && (
          <View style={styles.avisoLaranja}>
            <Text style={styles.avisoLaranjaTexto}>
              Os times já foram definidos. Quem fizer check-in agora entra na lista de próximos.
            </Text>
          </View>
        )}

        {jaFizCheckin ? (
          !souAdmin && !resultado ? (
            <View style={styles.aguardandoBox}>
              <Text style={styles.aguardandoTexto}>
                Presença confirmada. Aguardando o admin iniciar a partida.
              </Text>
            </View>
          ) : null
        ) : (
          <BotaoPrimario titulo="Eu vou jogar" onPress={() => void handleMeuCheckin()} />
        )}

        <View style={styles.tituloLinha}>
          <Eyebrow>Confirmados ({confirmados.length})</Eyebrow>
          <View style={styles.tituloAcoes}>
            <SegOrdenacao
              opcoes={[
                { chave: "NOME", rotulo: "A-Z" },
                { chave: "MENSALISTA", rotulo: "Mensal" },
                { chave: "SCORE", rotulo: "Score" },
              ]}
              valor={ordenacao}
              onChange={setOrdenacao}
            />
            {souAdmin && <ToggleScore ligado={verScore} onToggle={() => setVerScore((v) => !v)} />}
          </View>
        </View>

        {confirmados.length === 0 ? (
          <Text style={styles.vazio}>Ninguém chegou ainda.</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {confirmados.map((j) => {
              const souEu = j.id === meuId;
              const pag = pagamentoPorJogador.get(j.id) ?? "AVULSO";
              return (
                <CardJogadorPartida
                  key={j.id}
                  id={j.id}
                  nome={j.nome}
                  apelido={j.apelido}
                  fotoUrl={j.fotoUrl}
                  posicaoNome={posicaoNomePorJogador.get(j.id)}
                  score={scorePorJogador.get(j.id)}
                  mostrarScore={souAdmin && verScore}
                  souEu={souEu}
                  onAbrirPerfil={() => setPerfilId(j.id)}
                  direita={
                    <View style={styles.cardDireita}>
                      <Pressable
                        disabled={!souAdmin}
                        onPress={() =>
                          setConfirmar({
                            tipo: "pagamento",
                            jogadorId: j.id,
                            nome: j.nome,
                            novo: pag === "MENSALISTA" ? "AVULSO" : "MENSALISTA",
                          })
                        }
                      >
                        <View
                          style={[styles.pagPill, pag === "MENSALISTA" && styles.pagPillMensal]}
                        >
                          <Text
                            style={[
                              styles.pagPillTexto,
                              pag === "MENSALISTA" && styles.pagPillTextoMensal,
                            ]}
                          >
                            {pag === "MENSALISTA" ? "MENSAL" : "AVULSO"}
                          </Text>
                        </View>
                      </Pressable>
                      {(souEu ? !resultado : souAdmin && !resultado) && (
                        <Pressable
                          hitSlop={8}
                          onPress={() =>
                            souEu
                              ? setConfirmar({ tipo: "cancelarMeu" })
                              : setConfirmar({ tipo: "removerOutro", jogador: j })
                          }
                        >
                          <X size={15} color={cores.slate400} />
                        </Pressable>
                      )}
                    </View>
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      <Rodape
        voltarRotulo="Grupo"
        onVoltar={() => router.replace(`/grupos/${id}`)}
        primario={
          resultado ? (
            <BotaoPrimario
              titulo="Mostrar os times"
              onPress={() => router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`)}
            />
          ) : souAdmin ? (
            <BotaoPrimario
              titulo="Chegaram todos"
              desativado={!podeAvancar}
              onPress={() => router.push(`/grupos/${id}/partidas/${partidaId}/configurar`)}
            />
          ) : (
            <View style={styles.contagemRodape}>
              <Text style={styles.contagemRodapeTexto}>{contagem}</Text>
            </View>
          )
        }
      />

      <ModalConfirmar
        aberto={confirmar?.tipo === "cancelarMeu"}
        eyebrow="Cancelar presença"
        titulo="Cancelar sua presença?"
        descricao="Você sai da lista de confirmados. Dá pra fazer o check-in de novo depois."
        destrutivo
        confirmarLabel="Sim, cancelar"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() => void comConfirmacao(() => cancelarMeuCheckin(chamarApi, partidaId))}
        onFechar={() => {
          setConfirmar(null);
          setConfErro(null);
        }}
      />
      <ModalConfirmar
        aberto={confirmar?.tipo === "removerOutro"}
        eyebrow="Remover check-in"
        titulo={
          confirmar?.tipo === "removerOutro"
            ? `Remover ${confirmar.jogador.nome} da lista?`
            : ""
        }
        descricao="Ele sai da lista de presentes. O check-in pode ser feito de novo depois."
        destrutivo
        confirmarLabel="Sim, remover"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() =>
          confirmar?.tipo === "removerOutro" &&
          void comConfirmacao(() =>
            removerCheckinDeJogador(chamarApi, partidaId, confirmar.jogador.id)
          )
        }
        onFechar={() => {
          setConfirmar(null);
          setConfErro(null);
        }}
      />
      <ModalConfirmar
        aberto={confirmar?.tipo === "pagamento"}
        eyebrow="Confirmar mudança"
        titulo={
          confirmar?.tipo === "pagamento"
            ? confirmar.novo === "MENSALISTA"
              ? `Tornar ${confirmar.nome} mensalista?`
              : `Tornar ${confirmar.nome} avulso?`
            : ""
        }
        descricao="Vale pra essa partida e pro grupo."
        confirmarLabel="Sim, confirmar"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() =>
          confirmar?.tipo === "pagamento" &&
          void comConfirmacao(async () => {
            await Promise.all([
              definirPagamentoCheckin(chamarApi, partidaId, confirmar.jogadorId, confirmar.novo),
              definirMensalista(
                chamarApi,
                id,
                confirmar.jogadorId,
                confirmar.novo === "MENSALISTA"
              ),
            ]);
          })
        }
        onFechar={() => {
          setConfirmar(null);
          setConfErro(null);
        }}
      />

      <ModalCartao aberto={aguardando} onFechar={() => setAguardando(false)}>
        <Eyebrow>Presença confirmada</Eyebrow>
        <Text style={styles.modalTitulo}>Você está confirmado!</Text>
        <Text style={styles.modalDesc}>
          Aguardando todos os jogadores chegarem pro admin iniciar a partida.
        </Text>
        <Pressable style={styles.modalBotao} onPress={() => setAguardando(false)}>
          <Text style={styles.modalBotaoTexto}>Fechar</Text>
        </Pressable>
      </ModalCartao>

      <FormNovoJogador
        aberto={formNovo}
        chamarApi={chamarApi}
        grupoId={id}
        esporte={grupoAtual.esporte}
        onFechar={() => setFormNovo(false)}
        onAdicionado={async (membro) => {
          setFormNovo(false);
          setBusca("");
          try {
            await fazerCheckinDeJogador(chamarApi, partidaId, membro.jogadorId);
          } catch {
            // o jogador entrou no elenco; se o check-in falhar, o admin refaz na busca
          }
          await carregarApoio();
        }}
      />

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

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 150, gap: 14 },
  input: {
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    fontSize: 15,
    color: cores.branco,
  },
  maisTexto: { fontSize: 22, color: cores.teal, paddingHorizontal: 6 },
  semResultado: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.avisoBorda,
    padding: 12,
    gap: 8,
    alignItems: "center",
  },
  semResultadoTexto: { fontSize: 13, color: cores.slate400, textAlign: "center" },
  cadastrarBtn: {
    backgroundColor: cores.teal,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cadastrarBtnTexto: { fontSize: 13, fontWeight: "700", color: cores.dark },
  avisoLaranja: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.laranjaBorda,
    backgroundColor: cores.laranjaFundo,
    padding: 10,
  },
  avisoLaranjaTexto: { fontSize: 12, lineHeight: 17, color: cores.slate300 },
  aguardandoBox: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    padding: 12,
  },
  aguardandoTexto: { fontSize: 13, lineHeight: 18, color: cores.slate300 },
  tituloLinha: { gap: 8 },
  tituloAcoes: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  vazio: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: cores.cardBorda,
    padding: 16,
    textAlign: "center",
    fontSize: 13,
    color: cores.slate400,
  },
  cardDireita: { flexDirection: "row", alignItems: "center", gap: 10 },
  pagPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: cores.superficieMedia,
  },
  pagPillMensal: { backgroundColor: cores.tealDark },
  pagPillTexto: { fontSize: 10, fontWeight: "700", color: cores.slate400 },
  pagPillTextoMensal: { color: cores.branco },
  removerTexto: { fontSize: 14, color: cores.slate400, paddingHorizontal: 4 },
  contagemRodape: { flex: 1, height: 48, alignItems: "center", justifyContent: "center" },
  contagemRodapeTexto: { fontSize: 14, color: cores.slate400 },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalDesc: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
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
