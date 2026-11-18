import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import { Text } from "@/ui/Texto";
import {
  ArrowDownAZ,
  Ban,
  Clock,
  EllipsisVertical,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Share2,
  Shield,
  Star,
  Trash2,
  UserCheck,
  UserPlus,
  Wallet,
  X,
} from "@/ui/Icone";

import { buscarDadosDoGrupo, obterConvite } from "@/api/grupos";
import {
  buscarApoioDaPartida,
  cancelarMeuCheckin,
  definirPagamentoCheckin,
  fazerCheckinDeJogador,
  fazerMeuCheckin,
  removerCheckinDeJogador,
} from "@/api/checkins";
import { buscarResultadoAtivo } from "@/api/partidas";
import { definirMensalista, definirPosicao, definirScore } from "@/api/jogadores";
import { PRODUCAO_URL } from "@/config/links";
import { mensagemDoErro } from "@/mensagens-erro";
import { FormNovoJogador } from "@/jogadores/FormNovoJogador";
import { ModalPerfil, ModalPosicao, ModalScore } from "@/jogadores/modais";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalCartao, ModalConfirmar } from "@/grupo/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import {
  AvisoPartida,
  Cabecalho,
  CardJogadorPartida,
  Eyebrow,
  Rodape,
  BotaoPrimario,
  TelaPartida,
} from "@/partida/ui";
import {
  buscarPartida,
  checkinAberto,
  horasDoCheckin,
  limiteDoGrupo,
  proximaPartidaPeloHorario,
  scoreBloqueadoPeloAdmin,
} from "@/grupos";
import {
  formatarDiaSemanaData,
  formatarHora,
  scoreCongelado,
  textoHorasAntes,
} from "@/partidas";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import type {
  DadosDeApoioDaPartida,
  Grupo,
  JogadorEmPartida,
  PartidaResumo,
  ResultadoSalvo,
  TipoPagamento,
} from "@/contrato/tipos";

type Ordenacao = "NOME" | "CHEGADA" | "MENSALISTA" | "SCORE";

export default function TelaCheckin() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  const { chamarApi, estado } = useSessao();
  const meuId = estado.fase === "logado" ? estado.jogador.id : "";

  const [grupo, setGrupo] = useState<Grupo | null | undefined>(undefined);
  const [partida, setPartida] = useState<PartidaResumo | null | undefined>(undefined);
  const [apoio, setApoio] = useState<DadosDeApoioDaPartida | null>(null);
  const [resultado, setResultado] = useState<ResultadoSalvo | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [erroMeuCheckin, setErroMeuCheckin] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);

  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("NOME");
  const [verScore, setVerScore] = useState(false);
  const [formNovo, setFormNovo] = useState(false);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [aguardando, setAguardando] = useState(false);
  // Modal "Check-in lotado" (jogador comum sem check-in): abre sozinho enquanto
  // estiver lotado, até ele fechar.
  const [lotadoDispensado, setLotadoDispensado] = useState(false);

  const [confirmar, setConfirmar] = useState<
    | null
    | { tipo: "cancelarMeu" }
    | { tipo: "removerOutro"; jogador: JogadorEmPartida }
    | { tipo: "pagamento"; jogadorId: string; nome: string; novo: TipoPagamento }
  >(null);
  // Menu "⋮" do card de quem confirmou (Editar score / Editar posição /
  // Remover a confirmação), no lugar do antigo X. Espelha o site.
  const [menuDe, setMenuDe] = useState<JogadorEmPartida | null>(null);
  const [scoreDe, setScoreDe] = useState<{ jogadorId: string; nome: string; score: number } | null>(
    null
  );
  const [posicaoDe, setPosicaoDe] = useState<{
    jogadorId: string;
    nome: string;
    posicaoId: string | null;
  } | null>(null);
  const [salvandoModal, setSalvandoModal] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
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
  // Admin sempre; o resto só se o grupo liberou nas Configurações (o servidor
  // manda o score dos outros null nos demais casos).
  const vejoScore = souAdmin || !!grupo?.scoreVisivelTodos;
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
  const criadoEmPorJogador = useMemo(
    () => new Map((apoio?.membros ?? []).map((m) => [m.jogadorId, m.criadoEm])),
    [apoio?.membros]
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
  // Limite de check-ins (Configurações do grupo). Só barra o jogador comum; o
  // admin pode passar dele (o servidor aplica a mesma regra).
  const limite = grupo ? limiteDoGrupo(grupo) : null;
  const lotado = limite != null && presentesIds.size >= limite;
  // Só o próprio score (o dos outros é do admin). Depois do check-in vale o
  // snapshot gravado nele, que é o que o sorteio usa.
  const meuCheckinScore = apoio?.checkins.find((c) => c.jogadorId === meuId)?.scoreNoCheckin;

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
    setErroMeuCheckin(null);
    try {
      await fazerMeuCheckin(chamarApi, partidaId);
      await carregarApoio();
      if (!souAdmin && !resultado) setAguardando(true);
    } catch (e) {
      // Lotou (ou a janela fechou) entre o último polling e o toque: mostra o
      // motivo aqui mesmo, sem trocar a tela inteira pela de erro.
      setErroMeuCheckin(mensagemDoErro(e));
      carregarApoio().catch(() => {});
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
      <TelaPartida voltar="Grupo">
        <TelaErro mensagem={erro} onTentar={() => {
            setErro(null);
            setTentativa((t) => t + 1);
          }} />
      </TelaPartida>
    );
  }
  if (grupo === undefined || partida === undefined) {
    return (
      <TelaPartida voltar="Grupo">
        <TelaCarregando mensagem="Carregando check-in..." />
      </TelaPartida>
    );
  }
  const grupoAtual = grupo;
  const partidaAtual = partida;
  if (!grupoAtual || !partidaAtual) {
    return (
      <TelaPartida voltar="Grupo">
        <AvisoPartida mensagem="Partida não encontrada." destino="/painel" rotuloDestino="Painel" />
      </TelaPartida>
    );
  }
  if (!apoio) {
    return (
      <TelaPartida voltar="Grupo">
        <TelaCarregando mensagem="Carregando check-in..." />
      </TelaPartida>
    );
  }
  if (partidaAtual.cancelada) {
    return (
      <TelaPartida voltar="Grupo">
        <AvisoPartida
          mensagem="Essa partida foi cancelada."
          destino={`/grupos/${id}`}
          rotuloDestino="Grupo"
        />
      </TelaPartida>
    );
  }
  if (!checkinAberto(grupoAtual, partidaAtual)) {
    return (
      <TelaPartida voltar="Grupo">
        <AvisoPartida
          mensagem={`O check-in abre ${textoHorasAntes(horasDoCheckin(grupoAtual))} antes do início da partida.`}
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
      if (ordenacao === "CHEGADA") {
        const ca = new Date(criadoEmPorJogador.get(a.id) ?? 0).getTime();
        const cb = new Date(criadoEmPorJogador.get(b.id) ?? 0).getTime();
        if (ca !== cb) return cb - ca;
      } else if (ordenacao === "MENSALISTA") {
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


  const podeAvancar = confirmados.length >= 2;

  // Itens do menu "⋮" do card. "Remover a confirmação" é o antigo X e, como
  // ele, só existe antes do sorteio. Editar o score antes do sorteio também
  // atualiza o desta partida (servidor); depois, só vale da próxima. O próprio
  // score trava com cadeado nas mesmas regras do "Meu score".
  const meuScoreTravado =
    !souAdmin &&
    (scoreBloqueadoPeloAdmin(grupoAtual) ||
      (!grupoAtual.souNovato && scoreCongelado(proximaPartidaPeloHorario(grupoAtual))));

  function itensDoMenu(j: JogadorEmPartida): ItemMenu[] {
    const souEu = j.id === meuId;
    const g = grupoAtual!;
    const membro = apoio?.membros.find((m) => m.jogadorId === j.id);
    const travado = souEu && meuScoreTravado;
    const itens: ItemMenu[] = [
      travado
        ? { rotulo: "Score travado", Icone: Lock, desativado: true, onPress: () => {} }
        : {
            rotulo: "Editar score",
            Icone: Star,
            onPress: () =>
              setScoreDe({
                jogadorId: j.id,
                nome: j.nome,
                score: souEu ? g.meuScore : (membro?.score ?? scorePorJogador.get(j.id) ?? 50),
              }),
          },
    ];
    if ((apoio?.posicoes.length ?? 0) > 0) {
      itens.push({
        rotulo: "Editar posição",
        Icone: Shield,
        onPress: () =>
          setPosicaoDe({
            jogadorId: j.id,
            nome: j.nome,
            posicaoId: souEu ? g.meuPosicaoId : (membro?.posicaoId ?? null),
          }),
      });
    }
    if (!resultado) {
      itens.push({
        rotulo: "Remover a confirmação",
        Icone: X,
        destrutivo: true,
        onPress: () =>
          souEu
            ? setConfirmar({ tipo: "cancelarMeu" })
            : setConfirmar({ tipo: "removerOutro", jogador: j }),
      });
    }
    return itens;
  }

  async function salvarScore(valor: number) {
    if (!scoreDe) return;
    setSalvandoModal(true);
    setErroModal(null);
    try {
      await definirScore(chamarApi, id, scoreDe.jogadorId, valor);
      if (scoreDe.jogadorId === meuId) {
        setGrupo((g) => (g ? { ...g, meuScore: valor } : g));
      }
      setScoreDe(null);
      await carregarApoio().catch(() => {});
    } catch (e) {
      setErroModal(mensagemDoErro(e));
    } finally {
      setSalvandoModal(false);
    }
  }

  async function salvarPosicao(posicaoId: string | null) {
    if (!posicaoDe) return;
    setSalvandoModal(true);
    setErroModal(null);
    try {
      await definirPosicao(chamarApi, id, posicaoDe.jogadorId, posicaoId);
      if (posicaoDe.jogadorId === meuId) {
        setGrupo((g) => (g ? { ...g, meuPosicaoId: posicaoId } : g));
      }
      setPosicaoDe(null);
      await carregarApoio().catch(() => {});
    } catch (e) {
      setErroModal(mensagemDoErro(e));
    } finally {
      setSalvandoModal(false);
    }
  }

  // Compartilha o link de convite com ?partida=, pra quem não está com o
  // celular que passa de mão em mão dar entrada sozinho (espelha
  // weracha-site/app/grupos/[id]/partidas/[partidaId]/checkin/page.tsx).
  // Serve pra membro e pra quem ainda não é do grupo: o convite põe no grupo
  // (se preciso) e manda direto pro check-in enquanto a janela está aberta.
  // Se buscar o token falhar, cai no link direto do check-in (só pra membro).
  async function compartilhar() {
    if (!grupoAtual || !partidaAtual) return;
    const data = new Date(partidaAtual.data);
    let link = `${PRODUCAO_URL}/grupos/${id}/partidas/${partidaId}/checkin`;
    try {
      const token = await obterConvite(chamarApi, id);
      link = `${PRODUCAO_URL}/convite/${token}?partida=${partidaId}`;
    } catch {
      // mantém o link direto do check-in
    }
    const texto =
      `Faz seu check-in pro racha do grupo *${grupoAtual.nome}*!\n` +
      `📅 ${formatarDiaSemanaData(data)} às ${formatarHora(data)}\n\n` +
      `Confirma presença direto no link:\n${link}`;
    try {
      await Share.share({ message: texto });
    } catch {
      // cancelou
    }
  }

  return (
    <TelaPartida voltar="Grupo">
      <ScrollTeclado contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Cabecalho
          titulo="Lista de presença"
          Icone={UserCheck}
          grupoNome={grupoAtual.nome}
          meuScore={meuCheckinScore ?? grupoAtual.meuScore}
          meuScoreTravado={scoreBloqueadoPeloAdmin(grupoAtual)}
          descricao={partidaAtual.descricao}
          direita={
            <Pressable
              hitSlop={8}
              accessibilityLabel="Compartilhar link do check-in"
              onPress={() => void compartilhar()}
            >
              <Share2 size={18} color={cores.orange} />
            </Pressable>
          }
        />
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
              {/* Girando, igual o Loader2 do site: está esperando o admin. */}
              <ActivityIndicator size="small" color={cores.ambar} />
              <Text style={styles.aguardandoTexto}>
                Presença confirmada. Aguardando o admin iniciar a partida.
              </Text>
              {/* Pílula na cor da faixa, à direita (o texto quebra à esquerda
                  dela), igual no site: "★ N ✎" abre o score; travado, "★ N 🔒". */}
              {meuScoreTravado ? (
                <View style={[styles.pilulaScore, styles.pilulaScoreTravada]}>
                  <Star size={13} color={cores.ambar} />
                  <Text style={styles.pilulaScoreTexto}>{grupoAtual.meuScore}</Text>
                  <Lock size={13} color={cores.ambar} />
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [styles.pilulaScore, pressed && styles.pilulaScorePressionada]}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={`Revisar meu score (${grupoAtual.meuScore})`}
                  onPress={() =>
                    setScoreDe({
                      jogadorId: meuId,
                      nome: jogadorPorId.get(meuId)?.nome ?? "Meu score",
                      score: grupoAtual.meuScore,
                    })
                  }
                >
                  <Star size={13} color={cores.ambar} />
                  <Text style={styles.pilulaScoreTexto}>{grupoAtual.meuScore}</Text>
                  <Pencil size={13} color={cores.ambar} />
                </Pressable>
              )}
            </View>
          ) : null
        ) : lotado && !souAdmin ? null : (
          <BotaoPrimario titulo="Eu vou jogar" compacto onPress={() => void handleMeuCheckin()} />
        )}

        {erroMeuCheckin && !jaFizCheckin && !lotado ? (
          <Text style={styles.erroMeuCheckin}>{erroMeuCheckin}</Text>
        ) : null}

        <View style={styles.tituloLinha}>
          {/* Encolhe e quebra de linha em vez de empurrar os filtros pra fora da
              tela. Lotado é sinalizado pelo banner acima da lista, não aqui. */}
          <View style={styles.tituloTexto}>
            <Eyebrow>
              {limite != null
                ? `Jogadores (${presentesIds.size}/${limite})`
                : `Jogadores (${confirmados.length})`}
            </Eyebrow>
            <Text style={styles.tituloDica}>Toque no jogador para ver o perfil</Text>
          </View>
          <View style={styles.tituloAcoes}>
            <View style={styles.ordGrupo}>
              {(
                [
                  ["NOME", ArrowDownAZ, "Ordenar por nome"],
                  ["CHEGADA", Clock, "Ordenar por chegada (mais novo primeiro)"],
                  ["MENSALISTA", Wallet, "Ordenar por mensalista/avulso"],
                  ["SCORE", Star, "Ordenar por score"],
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
            {vejoScore && (
              <>
                <Text style={styles.scoreRotulo}>Score:</Text>
                <Pressable
                  accessibilityLabel={
                    verScore ? "Ocultar score dos jogadores" : "Mostrar score dos jogadores"
                  }
                  style={[styles.verScore, verScore && styles.verScoreAtivo]}
                  onPress={() => setVerScore((v) => !v)}
                >
                  {verScore ? (
                    <Eye size={16} color={cores.dark} />
                  ) : (
                    <EyeOff size={16} color={cores.slate400} />
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        {/* Banner de lotado logo acima do primeiro jogador. Pro jogador que ficou
            de fora ele também explica por que o "Eu vou jogar" sumiu. */}
        {lotado ? (
          <View style={styles.bannerLotado}>
            <Ban size={20} color="#f87171" />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerLotadoTitulo}>
                Check-in lotado · {presentesIds.size}/{limite}
              </Text>
              <Text style={styles.bannerLotadoTexto}>
                {souAdmin
                  ? "Como admin, você ainda pode incluir alguém."
                  : jaFizCheckin
                    ? "Sua vaga está garantida."
                    : "Se alguém desistir, a vaga abre de novo."}
              </Text>
            </View>
          </View>
        ) : null}

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
                  mostrarScore={vejoScore && verScore}
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
                      {(souEu || souAdmin) && (
                        <Pressable
                          hitSlop={8}
                          onPress={() => setMenuDe(j)}
                          accessibilityRole="button"
                          accessibilityLabel={`Mais opções de ${j.nome}`}
                        >
                          <EllipsisVertical size={18} color={cores.slate400} />
                        </Pressable>
                      )}
                    </View>
                  }
                />
              );
            })}
          </View>
        )}
      </ScrollTeclado>

      {/* Jogador comum antes do sorteio: sem rodapé (só teria a contagem, que já
          aparece em "Jogadores (N)", e ficava uma faixa grossa e vazia). */}
      {(resultado || souAdmin) && (
      <Rodape
        primario={
          resultado ? (
            <>
              {souAdmin && (
                <Pressable
                  style={styles.novoJogadorRodape}
                  onPress={() => setFormNovo(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Cadastrar novo jogador"
                >
                  <UserPlus size={20} color={cores.dark} />
                </Pressable>
              )}
              <BotaoPrimario
                titulo="Mostrar os times"
                onPress={() => router.replace(`/grupos/${id}/partidas/${partidaId}/resultado`)}
              />
            </>
          ) : souAdmin ? (
            <>
              {/* Atalho pro mesmo formulário do "Cadastrar novo jogador" da
                  busca (que só aparece quando a busca não acha ninguém). */}
              <Pressable
                style={styles.novoJogadorRodape}
                onPress={() => setFormNovo(true)}
                accessibilityRole="button"
                accessibilityLabel="Cadastrar novo jogador"
              >
                <UserPlus size={20} color={cores.dark} />
              </Pressable>
              <BotaoPrimario
                titulo="Chegaram todos"
                desativado={!podeAvancar}
                onPress={() => router.push(`/grupos/${id}/partidas/${partidaId}/configurar`)}
              />
            </>
          ) : null
        }
      />
      )}

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
        Icone={Trash2}
        eyebrow="Ação irreversível"
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
        Icone={Wallet}
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
          Aguardando todos os jogadores chegarem pro admin iniciar a partida.{" "}
          {/* Na mesma linha, sem ocupar linha nova: hora certa de conferir o
              score (o sorteio ainda não saiu e o novo já vale nesta partida).
              Travado, mostra o score com cadeado. */}
          {meuScoreTravado ? (
            <Text>
              Seu score: {grupoAtual.meuScore}{" "}
              <Lock size={13} color={cores.slate400} style={styles.cadeadoInline} />
            </Text>
          ) : (
            <Text
              style={styles.revisarScoreTexto}
              accessibilityRole="link"
              onPress={() => {
                setAguardando(false);
                // Abre o de score só depois do fade deste: no iOS, um Modal
                // apresentado enquanto outro ainda está saindo não aparece
                // (mesmo motivo do MenuAcoes rodar a ação depois de fechar).
                const alvo = {
                  jogadorId: meuId,
                  nome: jogadorPorId.get(meuId)?.nome ?? "Meu score",
                  score: grupoAtual.meuScore,
                };
                setTimeout(() => setScoreDe(alvo), 350);
              }}
            >
              Revise seu score ({grupoAtual.meuScore})
            </Text>
          )}
        </Text>
        <Pressable style={styles.modalBotao} onPress={() => setAguardando(false)}>
          <Text style={styles.modalBotaoTexto}>Fechar</Text>
        </Pressable>
      </ModalCartao>

      {/* Só pro jogador comum que ainda não fez check-in: o banner da lista
          sozinho passava batido. O admin pode passar do limite, então não vê. */}
      <ModalCartao
        aberto={lotado && !souAdmin && !jaFizCheckin && !lotadoDispensado}
        onFechar={() => setLotadoDispensado(true)}
      >
        <View style={styles.modalLotadoEyebrow}>
          <Ban size={14} color="#f87171" />
          <Text style={styles.modalLotadoEyebrowTexto}>
            Check-in lotado · {presentesIds.size}/{limite}
          </Text>
        </View>
        <Text style={styles.modalTitulo}>Não tem mais vaga nesta partida</Text>
        <Text style={styles.modalDesc}>
          O limite é de {limite} jogadores e todas as vagas já foram preenchidas. Se alguém
          desistir, a vaga abre de novo e você pode confirmar por aqui.
        </Text>
        <Pressable style={styles.modalBotao} onPress={() => setLotadoDispensado(true)}>
          <Text style={styles.modalBotaoTexto}>Entendi</Text>
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

      <MenuAcoes
        aberto={menuDe !== null}
        titulo={menuDe?.nome}
        itens={menuDe ? itensDoMenu(menuDe) : []}
        onFechar={() => setMenuDe(null)}
      />

      {scoreDe && (
        <ModalScore
          aberto
          nome={scoreDe.nome}
          scoreAtual={scoreDe.score}
          aviso={
            resultado
              ? "Os times desta partida já foram sorteados. O novo score vale a partir da próxima."
              : "Também atualiza o score nesta partida, que ainda não foi sorteada."
          }
          salvando={salvandoModal}
          erro={erroModal}
          onSalvar={(v) => void salvarScore(v)}
          onFechar={() => {
            setScoreDe(null);
            setErroModal(null);
          }}
        />
      )}

      {posicaoDe && (
        <ModalPosicao
          aberto
          nome={posicaoDe.nome}
          posicaoAtualId={posicaoDe.posicaoId}
          posicoes={apoio.posicoes}
          salvando={salvandoModal}
          erro={erroModal}
          onSalvar={(p) => void salvarPosicao(p)}
          onFechar={() => {
            setPosicaoDe(null);
            setErroModal(null);
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

const styles = StyleSheet.create({
  novoJogadorRodape: {
    width: 45,
    height: 45,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 150, gap: 14 },
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
  // Vermelho do card de partida cancelada, no formato dos cards de jogador
  // (mesmo raio e borda de 1px em volta toda).
  bannerLotado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bannerLotadoTitulo: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: cores.erroTexto,
  },
  bannerLotadoTexto: { fontSize: 12, lineHeight: 17, color: cores.slate300 },
  erroMeuCheckin: { fontSize: 12, textAlign: "center", color: cores.erroTexto },
  // Amarelo de "espera": o jogador já confirmou e depende do admin.
  aguardandoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    padding: 12,
  },
  aguardandoTexto: { flex: 1, fontSize: 13, lineHeight: 18, color: cores.ambar },
  pilulaScore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.ambarBorda,
    backgroundColor: cores.ambarFundo,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pilulaScorePressionada: { backgroundColor: "rgba(251, 191, 36, 0.18)" },
  pilulaScoreTravada: { opacity: 0.6 },
  pilulaScoreTexto: { fontSize: 12, fontWeight: "600", color: cores.ambar },
  tituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  tituloTexto: { flexShrink: 1, gap: 2 },
  tituloDica: { fontSize: 11, lineHeight: 14, color: cores.slate500 },
  tituloAcoes: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  ordGrupo: {
    flexDirection: "row",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    overflow: "hidden",
  },
  ordBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  ordBtnDivisor: { borderLeftWidth: 1, borderLeftColor: cores.avisoBorda },
  ordBtnAtivo: { backgroundColor: cores.teal },
  scoreRotulo: { fontSize: 13, fontWeight: "500", color: cores.slate300 },
  verScore: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
  },
  verScoreAtivo: { backgroundColor: cores.teal, borderColor: cores.teal },
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
  modalTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalLotadoEyebrow: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalLotadoEyebrowTexto: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#f87171",
  },
  modalDesc: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  // Sem sublinhado (no site ele só aparece no hover, que não existe no toque).
  revisarScoreTexto: { fontWeight: "600", color: cores.teal },
  // Ícone dentro do texto apoia na linha de base e fica alto: desce 2px.
  cadeadoInline: { transform: [{ translateY: 2 }] },
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
