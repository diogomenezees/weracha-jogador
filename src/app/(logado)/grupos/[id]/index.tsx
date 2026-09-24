import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";

import { buscarStatusExclusao } from "@/api/conta";
import {
  adicionarPartidaAvulsa,
  buscarDadosDoGrupo,
  editarGrupo,
  excluirGrupo,
  obterConvite,
  regenerarConvite,
  renovarGrupo,
  sairDoGrupo,
  vincularQuadra,
} from "@/api/grupos";
import {
  cancelarPartida,
  editarDescricaoPartida,
  excluirPartida,
  reativarPartida,
} from "@/api/partidas";
import { buscarQuadras, sugerirQuadra } from "@/api/quadras";
import {
  Ban,
  BarChart3,
  Calendar,
  CalendarPlus,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  EllipsisVertical,
  type LucideIcon,
  LogOut,
  MapPin,
  MessageCircle,
  NotebookPen,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Share2,
  Star,
  Trash2,
  Trophy,
  Users,
} from "@/ui/Icone";
import { PRODUCAO_URL } from "@/config/links";
import { ehHoje } from "@/formato";
import {
  aguardandoRenovacao,
  duracaoDaPartida,
  mesDeRenovacao,
  partidasEmAndamento,
  partidasFuturas,
  partidasPassadas,
} from "@/grupos";
import { mensagemDoErro } from "@/mensagens-erro";
import {
  abreviarDiaSemana,
  formatarContagemRegressiva,
  formatarDiaSemanaData,
  formatarHora,
  hojeISO,
  JANELA_CHECKIN_ANTES_HORAS,
  nomeDoMes,
  partidaEncerrada,
} from "@/partidas";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalCartao, ModalConfirmar, ModalTexto } from "@/grupo/modais";
import { SeletorData, SeletorDuracao, SeletorHora } from "@/grupo/pickers";
import { Navbar } from "@/ui/Navbar";
import { useSessao } from "@/sessao/contexto";
import { useDialogos } from "@/ui/Dialogos";
import { cores, raio } from "@/tema";
import type { DadosDaTelaGrupo, Grupo, PartidaResumo, Quadra } from "@/contrato/tipos";

type Aba = "detalhe" | "quadra" | "horarios" | "adicionar" | null;

export default function TelaGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, chamarApi } = useSessao();
  const { avisar, confirmar: confirmarDialogo } = useDialogos();
  const meuId = estado.fase === "logado" ? estado.jogador.id : "";
  const insets = useSafeAreaInsets();

  const [dados, setDados] = useState<DadosDaTelaGrupo | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [contaPendente, setContaPendente] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  const [aba, setAba] = useState<Aba>(null);
  const [verTodasPassadas, setVerTodasPassadas] = useState(false);
  const [partidaSel, setPartidaSel] = useState<PartidaResumo | null>(null);
  const [tokenConvite, setTokenConvite] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ titulo?: string; itens: ItemMenu[] } | null>(null);
  const [verDescricaoGrupo, setVerDescricaoGrupo] = useState(false);

  // Edições de texto (nome / descrição do grupo / descrição da partida).
  const [editando, setEditando] = useState<
    | null
    | { tipo: "nome" }
    | { tipo: "descGrupo" }
    | { tipo: "descPartida"; partidaId: string; cancelada: boolean }
    | { tipo: "cancelarPartida"; partidaId: string }
  >(null);
  const [textoEdit, setTextoEdit] = useState("");
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  // Confirmações que precisam de erro/loading próprios.
  const [confirmando, setConfirmando] = useState<
    null | { tipo: "excluirGrupo" } | { tipo: "sair" } | { tipo: "novoLink" } | { tipo: "excluirPartida"; partidaId: string }
  >(null);
  const [confOcupado, setConfOcupado] = useState(false);
  const [confErro, setConfErro] = useState<string | null>(null);

  // Modal de quadra.
  const [termoQuadra, setTermoQuadra] = useState("");
  const [quadrasBusca, setQuadrasBusca] = useState<Quadra[]>([]);
  const [novaQuadra, setNovaQuadra] = useState<{ nome: string; endereco: string } | null>(null);
  const [salvandoQuadra, setSalvandoQuadra] = useState(false);
  const [erroQuadra, setErroQuadra] = useState<string | null>(null);

  // Modal adicionar partida.
  const [novaData, setNovaData] = useState(hojeISO());
  const [novaHora, setNovaHora] = useState("12:00");
  const [novaDuracao, setNovaDuracao] = useState(60);
  const [salvandoPartida, setSalvandoPartida] = useState(false);
  const [erroNovaPartida, setErroNovaPartida] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    const status = await buscarStatusExclusao(chamarApi);
    if (status.solicitacaoPendente) {
      setContaPendente(true);
      return;
    }
    setDados(await buscarDadosDoGrupo(chamarApi, id));
  }, [chamarApi, id]);

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

  // Voltar de outra tela (resultado, configurar, check-in...) com `router.back()`
  // devolve esta tela JÁ MONTADA, com os dados de antes: o que mudou lá (sorteio
  // refeito, resultado salvo, check-in) não aparecia até sair pro painel e entrar de
  // novo. Então, a cada vez que a tela volta ao foco, recarrega em silêncio (sem
  // spinner: segue mostrando o que já tem e troca quando a resposta chega; se falhar,
  // mantém o que estava). O primeiro foco é pulado porque o effect acima já busca.
  const carregarRef = useRef(carregar);
  useEffect(() => {
    carregarRef.current = carregar;
  });
  const primeiroFoco = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (primeiroFoco.current) {
        primeiroFoco.current = false;
        return;
      }
      void carregarRef.current().catch(() => {});
    }, [])
  );

  // Voltar do segundo plano (o jogador viu o aviso no WhatsApp e abriu o app): a tela
  // ficou parada e pode estar velha (check-in aberto, resultado publicado). Recarrega em
  // silêncio, igual ao foco acima. Só enquanto esta tela está em foco, pra não disparar
  // pra telas do grupo que ficaram empilhadas por baixo.
  useFocusEffect(
    useCallback(() => {
      const sub = AppState.addEventListener("change", (estadoApp) => {
        if (estadoApp === "active") void carregarRef.current().catch(() => {});
      });
      return () => sub.remove();
    }, [])
  );

  // Puxar pra atualizar. Se falhar, mantém o que já está na tela e só avisa.
  async function atualizarPuxando() {
    setAtualizando(true);
    try {
      await carregar();
    } catch (e) {
      avisar("Não deu pra atualizar", mensagemDoErro(e));
    } finally {
      setAtualizando(false);
    }
  }

  const grupo = dados?.grupo;
  const souAdmin = grupo?.meuPapel === "ADMIN";
  const souDono = !!grupo && grupo.adminId === meuId;

  // Token de convite: busca quando o admin abre o detalhe de uma partida.
  useEffect(() => {
    if (aba !== "detalhe" || !souAdmin || !grupo || tokenConvite) return;
    obterConvite(chamarApi, grupo.id)
      .then(setTokenConvite)
      .catch(() => {});
  }, [aba, souAdmin, grupo, tokenConvite, chamarApi]);

  // Busca de quadras dentro do modal.
  useEffect(() => {
    if (aba !== "quadra" || !grupo || grupo.quadraId || !souAdmin) return;
    let vivo = true;
    buscarQuadras(chamarApi, grupo.esporte, termoQuadra)
      .then((qs) => vivo && setQuadrasBusca(qs))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [aba, grupo, souAdmin, termoQuadra, chamarApi]);

  function recarregar() {
    setTentativa((t) => t + 1);
  }

  async function comApi<T>(fn: () => Promise<T>, aoErrar: (msg: string) => void): Promise<T | null> {
    try {
      return await fn();
    } catch (e) {
      aoErrar(mensagemDoErro(e));
      return null;
    }
  }

  // ---- Menus (action sheet de baixo) -------------------------------------
  function abrirMenuGrupo() {
    if (!grupo) return;
    const itens: ItemMenu[] = [];
    if (souAdmin) {
      itens.push(
        {
          rotulo: "Editar nome",
          Icone: Pencil,
          onPress: () => iniciarEdicao({ tipo: "nome" }, grupo.nome),
        },
        {
          rotulo: grupo.descricao ? "Editar descrição" : "Adicionar descrição",
          Icone: NotebookPen,
          onPress: () => iniciarEdicao({ tipo: "descGrupo" }, grupo.descricao ?? ""),
        },
        {
          rotulo: "Gerar link de convite novo",
          Icone: RefreshCw,
          onPress: () => setConfirmando({ tipo: "novoLink" }),
        }
      );
      if (dados && dados.idsComResultado.length === 0) {
        itens.push({
          rotulo: "Excluir grupo",
          Icone: Trash2,
          destrutivo: true,
          onPress: () => setConfirmando({ tipo: "excluirGrupo" }),
        });
      }
    }
    itens.push({
      rotulo: "Sair do grupo",
      Icone: LogOut,
      destrutivo: true,
      onPress: () =>
        souDono
          ? avisar(
              "Você é o dono",
              "Pra sair, transfira o grupo pra outra pessoa admin primeiro (pelo site, em Gerenciar jogadores)."
            )
          : setConfirmando({ tipo: "sair" }),
    });
    setMenu({ titulo: grupo.nome, itens });
  }

  function abrirMenuPartida(p: PartidaResumo, temResultado: boolean) {
    const itens: ItemMenu[] = [
      {
        rotulo: p.descricao ? "Editar descrição" : "Adicionar descrição",
        Icone: NotebookPen,
        onPress: () =>
          iniciarEdicao(
            { tipo: "descPartida", partidaId: p.id, cancelada: p.cancelada },
            p.descricao ?? ""
          ),
      },
    ];
    if (!temResultado) {
      if (p.cancelada) {
        itens.push(
          {
            rotulo: "Reativar partida",
            Icone: RotateCcw,
            onPress: () => void handleReativar(p.id),
          },
          {
            rotulo: "Excluir partida",
            Icone: Trash2,
            destrutivo: true,
            onPress: () => setConfirmando({ tipo: "excluirPartida", partidaId: p.id }),
          }
        );
      } else {
        itens.push({
          rotulo: "Cancelar partida",
          Icone: Ban,
          destrutivo: true,
          onPress: () => iniciarEdicao({ tipo: "cancelarPartida", partidaId: p.id }, ""),
        });
      }
    }
    setMenu({ titulo: "Opções da partida", itens });
  }

  // ---- Edições -----------------------------------------------------------
  function iniciarEdicao(alvo: NonNullable<typeof editando>, valorAtual: string) {
    setTextoEdit(valorAtual);
    setErroEdit(null);
    setEditando(alvo);
  }

  async function salvarEdicao() {
    if (!editando || !grupo) return;
    setSalvandoEdit(true);
    setErroEdit(null);
    const texto = textoEdit.trim();
    try {
      if (editando.tipo === "nome") {
        if (!texto) throw new Error("O nome não pode ficar em branco.");
        await editarGrupo(chamarApi, grupo.id, { nome: texto });
      } else if (editando.tipo === "descGrupo") {
        await editarGrupo(chamarApi, grupo.id, { descricao: textoEdit });
      } else if (editando.tipo === "descPartida") {
        await editarDescricaoPartida(chamarApi, editando.partidaId, textoEdit);
      } else if (editando.tipo === "cancelarPartida") {
        await cancelarPartida(chamarApi, editando.partidaId, textoEdit);
      }
      setEditando(null);
      await carregar();
    } catch (e) {
      setErroEdit(e instanceof Error && !("codigo" in e) ? e.message : mensagemDoErro(e));
    } finally {
      setSalvandoEdit(false);
    }
  }

  async function handleReativar(partidaId: string) {
    await comApi(
      () => reativarPartida(chamarApi, partidaId),
      (m) => avisar("Não deu pra reativar", m)
    );
    recarregar();
  }

  async function confirmar() {
    if (!confirmando || !grupo) return;
    setConfOcupado(true);
    setConfErro(null);
    try {
      if (confirmando.tipo === "excluirGrupo") {
        await excluirGrupo(chamarApi, grupo.id);
        router.replace("/painel");
      } else if (confirmando.tipo === "sair") {
        await sairDoGrupo(chamarApi, grupo.id);
        router.replace("/painel");
      } else if (confirmando.tipo === "novoLink") {
        setTokenConvite(await regenerarConvite(chamarApi, grupo.id));
        setConfirmando(null);
      } else if (confirmando.tipo === "excluirPartida") {
        await excluirPartida(chamarApi, confirmando.partidaId);
        setConfirmando(null);
        await carregar();
      }
    } catch (e) {
      setConfErro(mensagemDoErro(e));
    } finally {
      setConfOcupado(false);
    }
  }

  async function handleRenovar() {
    if (!grupo) return;
    const atualizado = await comApi(
      () => renovarGrupo(chamarApi, grupo.id),
      (m) => avisar("Não deu pra renovar", m)
    );
    if (atualizado) recarregar();
  }

  async function handleAdicionarPartida() {
    if (!grupo) return;
    setErroNovaPartida(null);
    const [a, m, d] = novaData.split("-").map(Number);
    const [hh, mm] = novaHora.split(":").map(Number);
    if (partidaEncerrada(new Date(a, m - 1, d, hh, mm), novaDuracao)) {
      setErroNovaPartida("Esse horário já passou. Escolha uma data e hora futuras.");
      return;
    }
    setSalvandoPartida(true);
    try {
      await adicionarPartidaAvulsa(chamarApi, grupo.id, {
        data: novaData,
        horaInicio: novaHora,
        duracaoMin: novaDuracao,
      });
      setAba(null);
      await carregar();
    } catch (e) {
      setErroNovaPartida(mensagemDoErro(e));
    } finally {
      setSalvandoPartida(false);
    }
  }

  async function handleVincularQuadraExistente(q: Quadra) {
    if (!grupo) return;
    confirmarDialogo({
      eyebrow: "Quadra",
      titulo: "Vincular quadra?",
      descricao: `Vincular "${q.nome}" a esse grupo? Não dá pra trocar a quadra depois.`,
      confirmarLabel: "Vincular",
      onConfirmar: async () => {
        setSalvandoQuadra(true);
        const r = await comApi(() => vincularQuadra(chamarApi, grupo.id, q.id), setErroQuadra);
        setSalvandoQuadra(false);
        if (r !== null) {
          setAba(null);
          recarregar();
        }
      },
    });
  }

  async function handleCadastrarQuadra() {
    if (!grupo || !novaQuadra) return;
    if (!novaQuadra.nome.trim() || !novaQuadra.endereco.trim()) {
      setErroQuadra("Preencha nome e endereço da quadra.");
      return;
    }
    setSalvandoQuadra(true);
    setErroQuadra(null);
    try {
      const q = await sugerirQuadra(chamarApi, {
        nome: novaQuadra.nome.trim(),
        endereco: novaQuadra.endereco.trim(),
        esporte: grupo.esporte,
      });
      await vincularQuadra(chamarApi, grupo.id, q.id);
      setAba(null);
      setNovaQuadra(null);
      recarregar();
    } catch (e) {
      setErroQuadra(mensagemDoErro(e));
    } finally {
      setSalvandoQuadra(false);
    }
  }

  function linkConvite(p: PartidaResumo | null): string {
    const base = `${PRODUCAO_URL}/convite/${tokenConvite}`;
    return p ? `${base}?partida=${p.id}` : base;
  }

  async function compartilharConvite(p: PartidaResumo) {
    if (!tokenConvite || !grupo) return;
    const data = new Date(p.data);
    const msg =
      `Bora jogar? Você foi convidado pro grupo ${grupo.nome} no We Racha.\n` +
      `${formatarDiaSemanaData(data)} às ${formatarHora(data)}\n\n` +
      `Entra no link pra fazer parte da turma:\n${linkConvite(p)}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // usuário cancelou
    }
  }

  async function copiarLink(p: PartidaResumo) {
    if (!tokenConvite) return;
    // Sem Alert aqui de propósito: Android e iOS já mostram a notificação
    // nativa de "copiado pra área de transferência" sozinhos, o usuário já
    // conhece esse aviso — um aviso por cima seria feio e redundante.
    await Clipboard.setStringAsync(linkConvite(p));
  }

  async function chamarGalera() {
    if (!grupo) return;
    const link = `${PRODUCAO_URL}/grupos/${grupo.id}`;
    const msg =
      grupo.tipo === "RECORRENTE"
        ? `As partidas do grupo ${grupo.nome} pararam. Só falta o dono renovar. Vamos continuar jogando?\n${link}`
        : `As partidas do grupo ${grupo.nome} acabaram. Vamos marcar a próxima?\n${link}`;
    try {
      await Share.share({ message: msg });
    } catch {
      // cancelou
    }
  }

  // ---- Render -----------------------------------------------------------
  const voltar = <Navbar voltar="Painel" />;

  if (contaPendente) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <View style={styles.centro}>
          <Text style={styles.aviso}>
            Sua conta está marcada para exclusão. Reative no painel pra abrir seus grupos.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro mensagem={erro} onTentar={recarregar} />
      </SafeAreaView>
    );
  }

  if (dados === undefined) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaCarregando mensagem="Carregando grupo..." />
      </SafeAreaView>
    );
  }

  if (!grupo) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <View style={styles.centro}>
          <Text style={styles.aviso}>Grupo não encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const idsResultado = new Set(dados.idsComResultado);
  const idsMeuCheckin = new Set(dados.idsComMeuCheckin);
  const emAndamento = partidasEmAndamento(grupo);
  const idsEmAndamento = new Set(emAndamento.map((p) => p.id));
  const proximas = [...emAndamento, ...partidasFuturas(grupo)].sort(
    (x, y) => new Date(x.data).getTime() - new Date(y.data).getTime()
  );
  const passadas = partidasPassadas(grupo);
  const renovar = aguardandoRenovacao(grupo);
  const proximoMes = nomeDoMes(mesDeRenovacao(grupo).mes);

  function partidaJaEncerrada(p: PartidaResumo): boolean {
    return !p.cancelada && partidaEncerrada(new Date(p.data), duracaoDaPartida(grupo!, p));
  }

  function abrirPartida(p: PartidaResumo) {
    const temResultado = !p.cancelada && idsResultado.has(p.id);
    if (temResultado && !idsEmAndamento.has(p.id)) {
      router.push(`/grupos/${id}/partidas/${p.id}/resultado`);
      return;
    }
    setPartidaSel(p);
    setAba("detalhe");
  }

  function abrirAdicionarPartida() {
    setNovaData(hojeISO());
    setNovaHora("12:00");
    setNovaDuracao(60);
    setErroNovaPartida(null);
    setAba("adicionar");
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => void atualizarPuxando()}
            tintColor={cores.teal}
          />
        }
      >
        <View style={styles.topoGrupo}>
          <View style={styles.tituloDescBloco}>
            <View style={styles.cabecalho}>
              <View style={styles.tituloLinha}>
                <Users size={20} color={cores.branco} />
                <Text style={styles.h1} numberOfLines={2}>
                  {grupo.nome}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={abrirMenuGrupo}>
                <EllipsisVertical size={22} color={cores.slate400} />
              </Pressable>
            </View>

            {grupo.descricao ? (
              <DescricaoGrupo texto={grupo.descricao} onVerMais={() => setVerDescricaoGrupo(true)} />
            ) : null}
          </View>

          <View style={styles.pills}>
            <Pressable
              style={styles.pill}
              onPress={() => {
                setErroQuadra(null);
                setNovaQuadra(null);
                setTermoQuadra("");
                setAba("quadra");
              }}
            >
              <MapPin size={12} color={cores.branco} />
              <Text style={styles.pillTexto}>
                {grupo.quadraId ? (dados.quadra?.nome ?? "Quadra") : grupo.esporte}
              </Text>
            </Pressable>
            <Pressable style={styles.pill} onPress={() => setAba("horarios")}>
              <Clock size={12} color={cores.branco} />
              <Text style={styles.pillTexto}>Horários</Text>
            </Pressable>
            <View style={[styles.pill, styles.pillCinza]}>
              <Star size={12} color={cores.zinc500} />
              <Text style={[styles.pillTexto, styles.pillTextoCinza]}>Score {grupo.meuScore}</Text>
            </View>
          </View>
        </View>

        {souAdmin && !grupo.quadraId && (
          <Banner
            cor="orange"
            Icone={MapPin}
            titulo="Cadastre o local do jogo pra galera."
            chamada="Cadastrar quadra"
            onPress={() => {
              setErroQuadra(null);
              setNovaQuadra(null);
              setTermoQuadra("");
              setAba("quadra");
            }}
          />
        )}

        {renovar && souAdmin && (
          <Banner
            cor="teal"
            Icone={RefreshCw}
            titulo="Nenhuma partida agendada ainda."
            chamada={`Criar as partidas de ${proximoMes}`}
            onPress={() => void handleRenovar()}
          />
        )}
        {renovar && !souAdmin && (
          <Banner
            cor="red"
            Icone={Share2}
            titulo="As partidas acabaram, mas o grupo não."
            chamada="Chamar todo mundo pra jogar"
            onPress={() => void chamarGalera()}
          />
        )}

        {proximas.length > 0 && (
          <View style={styles.secao}>
            <View style={styles.secaoCabecalho}>
              <Text style={styles.secaoTitulo}>Próximas partidas</Text>
              <Text style={styles.secaoSub}>
                O check-in abre {JANELA_CHECKIN_ANTES_HORAS} horas antes de cada partida.
              </Text>
            </View>
            {proximas.map((p) => (
              <CardPartida
                key={p.id}
                partida={p}
                grupo={grupo}
                checkinAberto={idsEmAndamento.has(p.id)}
                temResultado={!p.cancelada && idsResultado.has(p.id)}
                jaFizCheckin={idsMeuCheckin.has(p.id)}
                souAdmin={!!souAdmin}
                onAbrir={() => abrirPartida(p)}
                onMenu={() => abrirMenuPartida(p, !p.cancelada && idsResultado.has(p.id))}
                onCheckin={() => router.push(`/grupos/${id}/partidas/${p.id}/checkin`)}
                onAoVivo={() => router.push(`/grupos/${id}/partidas/${p.id}/ao-vivo`)}
              />
            ))}
          </View>
        )}

        {!renovar && proximas.length === 0 && grupo.tipo === "AVULSO" && (
          <Banner
            cor={souAdmin ? "orange" : "red"}
            Icone={souAdmin ? CalendarPlus : Share2}
            titulo={souAdmin ? "Bora marcar outra partida?" : "As partidas acabaram."}
            chamada={souAdmin ? "Mesmos jogadores, esporte e quadra" : "Chamar todo mundo pra jogar"}
            onPress={souAdmin ? () => abrirAdicionarPartida() : () => void chamarGalera()}
          />
        )}
        {!renovar && proximas.length === 0 && grupo.tipo === "RECORRENTE" && (
          <Text style={styles.vazio}>Nenhuma partida por aqui.</Text>
        )}

        {passadas.length > 0 && (
          <View style={styles.secao}>
            <View style={styles.secaoCabecalho}>
              <Text style={styles.secaoTitulo}>Partidas anteriores</Text>
              <Text style={styles.secaoSub}>Confira o histórico das partidas já realizadas.</Text>
            </View>
            {(verTodasPassadas ? passadas : passadas.slice(0, 3)).map((p) => (
              <CardPartida
                key={p.id}
                partida={p}
                grupo={grupo}
                passada
                checkinAberto={false}
                temResultado={!p.cancelada && idsResultado.has(p.id)}
                jaFizCheckin={false}
                souAdmin={!!souAdmin}
                onAbrir={() => abrirPartida(p)}
                onMenu={() => abrirMenuPartida(p, !p.cancelada && idsResultado.has(p.id))}
                onCheckin={() => {}}
                onAoVivo={() => {}}
              />
            ))}
            {!verTodasPassadas && passadas.length > 3 && (
              <Pressable style={styles.verMaisBotao} onPress={() => setVerTodasPassadas(true)}>
                <Text style={styles.verMaisTexto}>
                  Ver mais {passadas.length - 3} {passadas.length - 3 === 1 ? "partida" : "partidas"}
                </Text>
                <ChevronDown size={16} color={cores.teal} />
              </Pressable>
            )}
          </View>
        )}

        {dados.temPartidaExcluida && (
          <Text style={styles.notaExcluida}>Esse grupo teve partidas excluídas.</Text>
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
        <View style={styles.rodapeLinha}>
          {grupo.tipo === "AVULSO" && souAdmin && (
            <Pressable style={styles.rodapeIcone} onPress={() => abrirAdicionarPartida()}>
              <Plus size={18} color={cores.branco} />
            </Pressable>
          )}
          <Pressable
            style={styles.rodapeIcone}
            onPress={() => router.push(`/grupos/${grupo.id}/enquetes`)}
          >
            <BarChart3 size={18} color={cores.branco} />
          </Pressable>
          <Pressable
            style={styles.rodapeBotao}
            onPress={() => router.push(`/grupos/${grupo.id}/artilheiros`)}
          >
            <Trophy size={16} color={cores.branco} />
            <Text style={styles.rodapeBotaoTexto}>Artilheiros</Text>
          </Pressable>
        </View>
        <View style={styles.rodapeLinha}>
          <Pressable
            style={styles.rodapeIconeTeal}
            onPress={() => router.push(`/grupos/${grupo.id}/resenha`)}
          >
            <MessageCircle size={18} color={cores.branco} />
          </Pressable>
          <Pressable
            style={styles.rodapeBotaoLaranja}
            onPress={() => router.push(`/grupos/${grupo.id}/jogadores`)}
          >
            <Users size={16} color={cores.dark} />
            <Text style={styles.rodapeBotaoLaranjaTexto}>
              {souAdmin ? "Gerenciar jogadores" : "Ver jogadores"} · {dados.totalMembros}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Modal: detalhe da partida */}
      <ModalCartao aberto={aba === "detalhe" && !!partidaSel} onFechar={() => setAba(null)}>
        {partidaSel && (
          <DetalhePartida
            partida={partidaSel}
            grupo={grupo}
            quadra={dados.quadra}
            encerrada={partidaJaEncerrada(partidaSel)}
            emCheckin={!partidaSel.cancelada && idsEmAndamento.has(partidaSel.id)}
            temResultado={!partidaSel.cancelada && idsResultado.has(partidaSel.id)}
            jaFizCheckin={idsMeuCheckin.has(partidaSel.id)}
            souAdmin={!!souAdmin}
            temToken={!!tokenConvite}
            onCopiar={() => void copiarLink(partidaSel)}
            onCompartilhar={() => void compartilharConvite(partidaSel)}
            onIr={(rota) => {
              setAba(null);
              router.push(`/grupos/${grupo.id}/partidas/${partidaSel.id}/${rota}`);
            }}
            onFechar={() => setAba(null)}
          />
        )}
      </ModalCartao>

      {/* Modal: quadra */}
      <ModalCartao aberto={aba === "quadra"} onFechar={() => setAba(null)}>
        <ModalQuadra
          grupo={grupo}
          quadra={dados.quadra}
          souAdmin={!!souAdmin}
          termo={termoQuadra}
          onTermo={setTermoQuadra}
          resultados={quadrasBusca}
          nova={novaQuadra}
          onNova={setNovaQuadra}
          salvando={salvandoQuadra}
          erro={erroQuadra}
          onVincular={handleVincularQuadraExistente}
          onCadastrar={handleCadastrarQuadra}
        />
      </ModalCartao>

      {/* Modal: horários */}
      <ModalCartao aberto={aba === "horarios"} onFechar={() => setAba(null)}>
        <View style={styles.modalEyebrowLinha}>
          <Clock size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Horários</Text>
        </View>
        <Text style={styles.modalTitulo}>
          {grupo.tipo === "RECORRENTE" ? "Partida semanal" : "Sem horário fixo"}
        </Text>
        <Text style={styles.modalDesc}>
          {grupo.tipo === "RECORRENTE"
            ? "Essas partidas se repetem toda semana."
            : "O admin marca cada partida na hora que a turma combina."}
        </Text>
        {grupo.tipo === "RECORRENTE" &&
          grupo.horarios
            .filter((h) => h.diaSemana !== null)
            .map((h) => (
              <View key={h.id} style={styles.horarioLinha}>
                <Text style={styles.horarioDia}>{abreviarDiaSemana(h.diaSemana as number)}</Text>
                <Text style={styles.horarioHora}>
                  {h.horaInicio} · {h.duracaoMin}min
                </Text>
              </View>
            ))}
      </ModalCartao>

      {/* Modal: adicionar partida */}
      <ModalCartao aberto={aba === "adicionar"} onFechar={() => setAba(null)}>
        <View style={styles.modalEyebrowLinha}>
          <Calendar size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Adicionar partida</Text>
        </View>
        <Text style={styles.modalTitulo}>Marcar mais um jogo</Text>
        <Text style={styles.modalDesc}>Esporte e quadra continuam os mesmos do grupo.</Text>
        <SeletorData iso={novaData} onChange={setNovaData} minIso={hojeISO()} />
        <SeletorHora hhmm={novaHora} onChange={setNovaHora} />
        <SeletorDuracao min={novaDuracao} onChange={setNovaDuracao} />
        {erroNovaPartida ? <Text style={styles.modalErro}>{erroNovaPartida}</Text> : null}
        <Pressable
          style={[styles.modalBotao, salvandoPartida && { opacity: 0.6 }]}
          onPress={() => void handleAdicionarPartida()}
          disabled={salvandoPartida}
        >
          <Text style={styles.modalBotaoTexto}>
            {salvandoPartida ? "Salvando..." : "Adicionar partida"}
          </Text>
        </Pressable>
      </ModalCartao>

      {/* Edição de texto (nome / descrições / justificativa de cancelamento) */}
      <ModalTexto
        aberto={editando?.tipo === "nome"}
        eyebrow="Grupo"
        titulo="Editar nome"
        valor={textoEdit}
        onChangeValor={setTextoEdit}
        multiline={false}
        ocupado={salvandoEdit}
        erro={erroEdit}
        onSalvar={() => void salvarEdicao()}
        onFechar={() => setEditando(null)}
      />
      <ModalTexto
        aberto={editando?.tipo === "descGrupo"}
        eyebrow="Descrição do grupo"
        titulo={grupo.descricao ? "Editar descrição" : "Adicionar descrição"}
        descricao="Visível pra todo mundo do grupo."
        placeholder="Ex.: mensalidade até o dia 5."
        valor={textoEdit}
        onChangeValor={setTextoEdit}
        ocupado={salvandoEdit}
        erro={erroEdit}
        onSalvar={() => void salvarEdicao()}
        onFechar={() => setEditando(null)}
      />
      <ModalCartao aberto={verDescricaoGrupo} onFechar={() => setVerDescricaoGrupo(false)}>
        <View style={styles.descricaoModalEyebrowLinha}>
          <NotebookPen size={16} color={cores.teal} />
          <Text style={styles.descricaoModalEyebrow}>Descrição do grupo</Text>
        </View>
        <Text style={styles.descricaoModalTitulo}>{grupo.nome}</Text>
        <Text style={styles.descricaoModalTexto}>{grupo.descricao}</Text>
        <View style={styles.descricaoModalAcoes}>
          {souAdmin && (
            <Pressable
              style={styles.descricaoModalBtnSecundario}
              onPress={() => {
                setVerDescricaoGrupo(false);
                iniciarEdicao({ tipo: "descGrupo" }, grupo.descricao ?? "");
              }}
            >
              <Text style={styles.descricaoModalBtnSecundarioTexto}>Editar</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.descricaoModalBtnPrimario}
            onPress={() => setVerDescricaoGrupo(false)}
          >
            <Text style={styles.descricaoModalBtnPrimarioTexto}>Fechar</Text>
          </Pressable>
        </View>
      </ModalCartao>
      <ModalTexto
        aberto={editando?.tipo === "descPartida"}
        eyebrow="Descrição da partida"
        titulo="Descrição da partida"
        descricao="Visível pra todo mundo do grupo. Use pra avisos do dia."
        placeholder="Ex.: hoje de camiseta amarela, churras depois."
        valor={textoEdit}
        onChangeValor={setTextoEdit}
        ocupado={salvandoEdit}
        erro={erroEdit}
        onSalvar={() => void salvarEdicao()}
        onFechar={() => setEditando(null)}
      />
      <ModalTexto
        aberto={editando?.tipo === "cancelarPartida"}
        eyebrow="Cancelar partida"
        titulo="Justificativa do cancelamento"
        descricao="Conta rapidinho por que a partida foi cancelada."
        placeholder="Ex.: chuva forte, quadra indisponível."
        valor={textoEdit}
        onChangeValor={setTextoEdit}
        salvarLabel="Cancelar partida"
        destrutivo
        ocupado={salvandoEdit}
        erro={erroEdit}
        onSalvar={() => void salvarEdicao()}
        onFechar={() => setEditando(null)}
      />

      <MenuAcoes
        aberto={menu !== null}
        titulo={menu?.titulo}
        itens={menu?.itens ?? []}
        onFechar={() => setMenu(null)}
      />

      {/* Confirmações */}
      <ModalConfirmar
        aberto={confirmando?.tipo === "excluirGrupo"}
        eyebrow="Ação irreversível"
        titulo="Excluir grupo?"
        descricao={`O grupo "${grupo.nome}" some do painel pra todo mundo.`}
        destrutivo
        confirmarLabel="Sim, excluir"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() => void confirmar()}
        onFechar={() => { setConfirmando(null); setConfErro(null); }}
      />
      <ModalConfirmar
        aberto={confirmando?.tipo === "sair"}
        eyebrow="Sair do grupo"
        titulo="Tem certeza que quer sair?"
        descricao="Você sai do elenco e perde acesso a artilheiros, enquetes e resenha. Dá pra voltar por um convite novo."
        destrutivo
        confirmarLabel="Sim, sair"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() => void confirmar()}
        onFechar={() => { setConfirmando(null); setConfErro(null); }}
      />
      <ModalConfirmar
        aberto={confirmando?.tipo === "novoLink"}
        eyebrow="Convite"
        titulo="Gerar link de convite novo?"
        descricao="O link antigo para de funcionar na hora. Quem já entrou continua normalmente."
        confirmarLabel="Gerar novo link"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() => void confirmar()}
        onFechar={() => { setConfirmando(null); setConfErro(null); }}
      />
      <ModalConfirmar
        aberto={confirmando?.tipo === "excluirPartida"}
        eyebrow="Ação irreversível"
        titulo="Excluir partida?"
        descricao="Essa partida some da lista do grupo."
        destrutivo
        confirmarLabel="Sim, excluir"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() => void confirmar()}
        onFechar={() => { setConfirmando(null); setConfErro(null); }}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------

function Banner({
  cor,
  Icone,
  titulo,
  chamada,
  onPress,
}: {
  cor: "teal" | "orange" | "red";
  Icone: LucideIcon;
  titulo: string;
  chamada: string;
  onPress: () => void;
}) {
  const paleta =
    cor === "teal"
      ? { borda: cores.avisoBorda, fundo: cores.avisoFundo, texto: cores.teal }
      : cor === "orange"
        ? { borda: cores.laranjaBorda, fundo: cores.laranjaFundo, texto: cores.orange }
        : { borda: cores.erroBorda, fundo: cores.erroFundo, texto: cores.erroTexto };
  return (
    <Pressable
      style={[styles.banner, { borderColor: paleta.borda, backgroundColor: paleta.fundo }]}
      onPress={onPress}
    >
      <Icone size={16} color={paleta.texto} style={styles.bannerIcone} />
      <View style={styles.bannerTextos}>
        <Text style={styles.bannerTitulo}>{titulo}</Text>
        <Text style={[styles.bannerChamada, { color: paleta.texto }]}>{chamada}</Text>
      </View>
    </Pressable>
  );
}

// Espelha o `DescricaoCurta` do site: mostra a descrição em 1 linha só; se não
// couber (medida por um Text invisível, sem limite de linhas, sobreposto),
// troca pelo botão "Ver descrição" em vez de cortar o texto no meio.
function DescricaoGrupo({ texto, onVerMais }: { texto: string; onVerMais: () => void }) {
  const [truncada, setTruncada] = useState(false);

  return (
    <View style={styles.descricaoContainer}>
      <Text
        style={[styles.descricao, styles.descricaoMedidor]}
        onTextLayout={(e) => setTruncada(e.nativeEvent.lines.length > 1)}
      >
        {texto}
      </Text>
      {truncada ? (
        <Pressable onPress={onVerMais} hitSlop={6}>
          <Text style={styles.verDescricao}>Ver descrição</Text>
        </Pressable>
      ) : (
        <Text style={styles.descricao} numberOfLines={1}>
          {texto}
        </Text>
      )}
    </View>
  );
}

// Bolinha do "Ao vivo": mesmo pulso do `animate-pulse` do site (opacidade 1 → 0,5 → 1 em 2s).
function PontoPulsante() {
  const [opacidade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const easing = Easing.bezier(0.4, 0, 0.6, 1);
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(opacidade, { toValue: 0.5, duration: 1000, easing, useNativeDriver: true }),
        Animated.timing(opacidade, { toValue: 1, duration: 1000, easing, useNativeDriver: true }),
      ])
    );
    animacao.start();
    return () => animacao.stop();
  }, [opacidade]);

  return <Animated.View style={[styles.aoVivoPonto, { opacity: opacidade }]} />;
}

function CardPartida({
  partida: p,
  grupo,
  passada = false,
  checkinAberto,
  temResultado,
  jaFizCheckin,
  souAdmin,
  onAbrir,
  onMenu,
  onCheckin,
  onAoVivo,
}: {
  partida: PartidaResumo;
  grupo: Grupo;
  passada?: boolean;
  checkinAberto: boolean;
  temResultado: boolean;
  jaFizCheckin: boolean;
  souAdmin: boolean;
  onAbrir: () => void;
  onMenu: () => void;
  onCheckin: () => void;
  onAoVivo: () => void;
}) {
  const data = new Date(p.data);
  const concluida = passada && !p.cancelada && temResultado;
  // Partida passada, não cancelada e sem resultado: pendência do admin, não
  // "em dia" como uma futura — por isso o cinza neutro, nunca o teal.
  const pendente = !!passada && !p.cancelada && !temResultado;
  const corBorda = p.cancelada
    ? "#ef4444"
    : concluida
      ? "#10b981"
      : pendente
        ? cores.slate500
        : cores.teal;
  const corFundo = p.cancelada
    ? "rgba(239, 68, 68, 0.1)"
    : concluida
      ? "rgba(16, 185, 129, 0.1)"
      : pendente
        ? "rgba(100, 116, 139, 0.08)"
        : cores.cardFundo;
  const corBordaCartao = p.cancelada
    ? "rgba(239, 68, 68, 0.2)"
    : concluida
      ? "rgba(16, 185, 129, 0.2)"
      : pendente
        ? "rgba(100, 116, 139, 0.2)"
        : cores.cardBorda;

  return (
    <View style={styles.cardLinha}>
      <Pressable
        style={[styles.card, { borderLeftColor: corBorda, borderColor: corBordaCartao, backgroundColor: corFundo }]}
        onPress={onAbrir}
      >
        <View style={styles.cardTopo}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.cardData,
                p.cancelada && styles.textoCancelado,
                concluida && styles.textoConcluido,
                pendente && styles.textoPendente,
              ]}
            >
              {formatarDiaSemanaData(data)}
              {ehHoje(data) && !passada ? " · hoje" : ""}
            </Text>
            <Text style={[styles.cardHora, p.cancelada && styles.textoCanceladoFraco]}>
              {formatarHora(data)} · {duracaoDaPartida(grupo, p)}min
            </Text>
          </View>
          {checkinAberto && !p.cancelada ? (
            !jaFizCheckin ? (
              <Pressable style={styles.checkinBtn} onPress={onCheckin}>
                <Text style={styles.checkinBtnTexto}>Check-in</Text>
                <ChevronRight size={14} color={cores.dark} />
              </Pressable>
            ) : temResultado ? (
              <Pressable style={styles.aoVivoBtn} onPress={onAoVivo}>
                <PontoPulsante />
                <Text style={styles.aoVivoBtnTexto}>Ao vivo</Text>
              </Pressable>
            ) : (
              <View style={styles.confirmadoPill}>
                <Text style={styles.confirmadoTexto}>Confirmado</Text>
              </View>
            )
          ) : p.cancelada ? (
            <View style={styles.canceladaPill}>
              <Text style={styles.canceladaTexto}>Cancelada</Text>
            </View>
          ) : concluida ? (
            <View style={styles.concluidaPill}>
              <Text style={styles.concluidaTexto}>Concluída</Text>
            </View>
          ) : pendente ? (
            <View style={styles.partidaPendentePill}>
              <Text style={styles.partidaPendenteTexto}>Encerrada</Text>
            </View>
          ) : (
            <ChevronRight size={18} color={cores.slate500} />
          )}
        </View>
        {/* Partida anterior não mostra a descrição no card (só na tela de resultado),
            igual ao site. */}
        {p.descricao && !passada ? (
          <Text style={[styles.cardDescricao, p.cancelada && styles.textoCanceladoFraco]} numberOfLines={2}>
            {p.descricao}
          </Text>
        ) : null}
      </Pressable>
      {souAdmin && (
        <Pressable style={styles.cardMenu} hitSlop={8} onPress={onMenu}>
          <EllipsisVertical size={18} color={cores.slate400} />
        </Pressable>
      )}
    </View>
  );
}

function DetalhePartida({
  partida: p,
  grupo,
  quadra,
  encerrada,
  emCheckin,
  temResultado,
  jaFizCheckin,
  souAdmin,
  temToken,
  onCopiar,
  onCompartilhar,
  onIr,
  onFechar,
}: {
  partida: PartidaResumo;
  grupo: Grupo;
  quadra?: Quadra;
  encerrada: boolean;
  emCheckin: boolean;
  temResultado: boolean;
  jaFizCheckin: boolean;
  souAdmin: boolean;
  temToken: boolean;
  onCopiar: () => void;
  onCompartilhar: () => void;
  onIr: (rota: "checkin" | "ao-vivo" | "resultado") => void;
  onFechar: () => void;
}) {
  const data = new Date(p.data);
  const podeConvidar = souAdmin && !p.cancelada && !encerrada;
  const corEyebrow = p.cancelada ? cores.erroTexto : encerrada ? cores.slate400 : cores.teal;

  return (
    <>
      <View style={styles.modalEyebrowLinha}>
        {p.cancelada ? <Ban size={16} color={corEyebrow} /> : <Clock size={16} color={corEyebrow} />}
        <Text style={[styles.modalEyebrow, { color: corEyebrow }]}>
          {p.cancelada ? "Partida cancelada" : encerrada ? "Partida encerrada" : "Contagem regressiva"}
        </Text>
      </View>
      <Text style={styles.detalheGrande}>
        {p.cancelada || encerrada
          ? `${formatarDiaSemanaData(data)}, ${formatarHora(data)}`
          : formatarContagemRegressiva(data)}
      </Text>

      <View style={styles.divisor} />

      <View style={styles.detalheTituloBloco}>
        <View style={styles.detalheLinha}>
          <View style={styles.detalheTituloLinha}>
            <Users size={16} color={cores.branco} />
            <Text style={styles.modalTitulo} numberOfLines={1}>
              {grupo.nome}
            </Text>
          </View>
          {podeConvidar && (
            <View style={styles.detalheAcoes}>
              <BotaoAcaoComFlash onPress={onCopiar} disabled={!temToken} label="Copiar link do convite">
                <Copy size={15} color={cores.slate300} />
              </BotaoAcaoComFlash>
              <BotaoAcaoComFlash onPress={onCompartilhar} disabled={!temToken} label="Compartilhar convite">
                <Share2 size={15} color={cores.orange} />
              </BotaoAcaoComFlash>
            </View>
          )}
        </View>

        {grupo.descricao ? <DescricaoGrupoResumo texto={grupo.descricao} /> : null}
      </View>

      <View style={styles.divisor} />

      <View style={styles.pills}>
        <View style={styles.pill}>
          <Text style={styles.pillTexto}>{grupo.esporte}</Text>
        </View>
      </View>

      {!p.cancelada && (
        <View style={styles.detalheInfoLinha}>
          <Calendar size={14} color={cores.slate400} />
          <Text style={styles.modalDesc}>
            {formatarDiaSemanaData(data)} · {formatarHora(data)} · {duracaoDaPartida(grupo, p)} min
          </Text>
        </View>
      )}
      <View style={styles.detalheInfoLinha}>
        <MapPin size={14} color={cores.slate400} />
        <Text style={styles.modalDesc}>
          {quadra?.nome ?? "Quadra não cadastrada"}
          {quadra?.endereco ? ` · ${quadra.endereco}` : ""}
        </Text>
      </View>

      {p.descricao ? (
        <View style={[styles.detalheDescBox, p.cancelada && styles.detalheDescBoxCancel]}>
          <Text style={[styles.detalheDescRotulo, p.cancelada && { color: cores.erroTexto }]}>
            {p.cancelada ? "Justificativa" : "Descrição"}
          </Text>
          <Text style={styles.detalheDescTexto}>{p.descricao}</Text>
        </View>
      ) : null}

      {emCheckin && !jaFizCheckin ? (
        <Pressable style={styles.modalBotao} onPress={() => onIr("checkin")}>
          <Text style={styles.modalBotaoTexto}>Check-in</Text>
        </Pressable>
      ) : emCheckin && temResultado ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable style={[styles.modalBotao, { flex: 1 }]} onPress={() => onIr("resultado")}>
              <Text style={styles.modalBotaoTexto}>Times</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBotao, { flex: 1, backgroundColor: "#dc2626" }]}
              onPress={() => onIr("ao-vivo")}
            >
              <Text style={[styles.modalBotaoTexto, { color: cores.branco }]}>Ao vivo</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => onIr("checkin")} hitSlop={6} style={styles.verMeuCheckinLinha}>
            <Text style={styles.verMeuCheckin}>Ver meu check-in</Text>
          </Pressable>
        </View>
      ) : emCheckin ? (
        <Pressable
          style={[styles.modalBotao, { backgroundColor: "#10b981" }]}
          onPress={() => onIr("checkin")}
        >
          <Text style={styles.modalBotaoTexto}>Ir para o Check-in</Text>
        </Pressable>
      ) : temResultado ? (
        <Pressable style={styles.modalBotao} onPress={() => onIr("resultado")}>
          <Text style={styles.modalBotaoTexto}>Resultado</Text>
        </Pressable>
      ) : (
        <Pressable style={styles.modalBotao} onPress={onFechar}>
          <Text style={styles.modalBotaoTexto}>Fechar</Text>
        </Pressable>
      )}
    </>
  );
}

// Feedback de toque dos botões de copiar/compartilhar convite: a borda pisca
// em teal rapidinho. Pro copiar, é o único aviso — a notificação nativa do
// próprio celular ("copiado pra área de transferência") já avisa por texto.
function BotaoAcaoComFlash({
  onPress,
  disabled,
  label,
  children,
}: {
  onPress: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  const [flash] = useState(() => new Animated.Value(0));

  function lidarComPress() {
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
    onPress();
  }

  return (
    <Pressable
      style={styles.detalheAcao}
      onPress={lidarComPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.detalheAcaoBorda, { opacity: flash }]} pointerEvents="none" />
      {children}
    </Pressable>
  );
}

// Mesma regra do site (DescricaoCurta, variante "mensagem"): mostra a
// descrição do grupo em uma linha só; se não couber, troca por um aviso
// estático em vez de truncar no meio da palavra — o modal já tem outro botão
// pra copiar/compartilhar, não faz sentido empilhar mais uma ação aqui.
function DescricaoGrupoResumo({ texto }: { texto: string }) {
  const [truncada, setTruncada] = useState(false);
  return (
    <View style={styles.descricaoContainer}>
      <Text
        style={[styles.modalDesc, styles.descricaoMedidor]}
        onTextLayout={(e) => setTruncada(e.nativeEvent.lines.length > 1)}
      >
        {texto}
      </Text>
      {truncada ? (
        <Text style={styles.detalheDescGrupoAviso}>Há descrição completa no grupo</Text>
      ) : (
        <Text style={styles.modalDesc} numberOfLines={1}>
          {texto}
        </Text>
      )}
    </View>
  );
}

function ModalQuadra({
  grupo,
  quadra,
  souAdmin,
  termo,
  onTermo,
  resultados,
  nova,
  onNova,
  salvando,
  erro,
  onVincular,
  onCadastrar,
}: {
  grupo: Grupo;
  quadra?: Quadra;
  souAdmin: boolean;
  termo: string;
  onTermo: (v: string) => void;
  resultados: Quadra[];
  nova: { nome: string; endereco: string } | null;
  onNova: (v: { nome: string; endereco: string } | null) => void;
  salvando: boolean;
  erro: string | null;
  onVincular: (q: Quadra) => void;
  onCadastrar: () => void;
}) {
  if (grupo.quadraId) {
    return (
      <>
        <View style={styles.modalEyebrowLinha}>
          <MapPin size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Quadra</Text>
        </View>
        <Text style={styles.modalTitulo}>{quadra?.nome ?? "Quadra não encontrada"}</Text>
        {quadra && quadra.status !== "VALIDADA" && (
          <View style={styles.pendentePill}>
            <Text style={styles.pendenteTexto}>Pendente de conferência</Text>
          </View>
        )}
        <Text style={styles.modalDesc}>{quadra?.endereco ?? "Endereço não informado."}</Text>
      </>
    );
  }
  if (!souAdmin) {
    return (
      <>
        <View style={styles.modalEyebrowLinha}>
          <MapPin size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Quadra</Text>
        </View>
        <Text style={styles.modalTitulo}>Sem quadra vinculada</Text>
        <Text style={styles.modalDesc}>O admin do grupo ainda não cadastrou uma quadra.</Text>
      </>
    );
  }
  if (nova) {
    return (
      <>
        <View style={styles.modalEyebrowLinha}>
          <MapPin size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Quadra</Text>
        </View>
        <Text style={styles.modalTitulo}>Cadastrar quadra</Text>
        <Text style={styles.modalDesc}>
          Fica disponível pra todo mundo com a marca &quot;Pendente&quot; até ser conferida.
        </Text>
        <ModalInput placeholder="Nome da quadra" valor={nova.nome} onChange={(v) => onNova({ ...nova, nome: v })} />
        <ModalInput placeholder="Endereço" valor={nova.endereco} onChange={(v) => onNova({ ...nova, endereco: v })} />
        {erro ? <Text style={styles.modalErro}>{erro}</Text> : null}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable style={[styles.modalBotaoContorno, { flex: 1 }]} onPress={() => onNova(null)}>
            <Text style={styles.modalBotaoContornoTexto}>Voltar</Text>
          </Pressable>
          <Pressable
            style={[styles.modalBotao, { flex: 1 }, salvando && { opacity: 0.6 }]}
            onPress={onCadastrar}
            disabled={salvando}
          >
            <Text style={styles.modalBotaoTexto}>{salvando ? "Salvando..." : "Salvar quadra"}</Text>
          </Pressable>
        </View>
      </>
    );
  }
  return (
    <>
      <View style={styles.modalEyebrowLinha}>
        <MapPin size={16} color={cores.teal} />
        <Text style={styles.modalEyebrow}>Quadra</Text>
      </View>
      <Text style={styles.modalTitulo}>Vincular quadra</Text>
      <Text style={styles.modalDesc}>Busque uma quadra ou cadastre uma nova pra esse grupo.</Text>
      <ModalInput placeholder="Buscar quadra..." valor={termo} onChange={onTermo} />
      <View style={{ gap: 4, maxHeight: 200 }}>
        {resultados.length === 0 ? (
          <Text style={styles.modalDesc}>Nenhuma quadra cadastrada ainda pra {grupo.esporte}.</Text>
        ) : (
          resultados.map((q) => (
            <Pressable key={q.id} style={styles.quadraItem} onPress={() => onVincular(q)} disabled={salvando}>
              <Text style={styles.quadraNome}>
                {q.nome}
                {q.status !== "VALIDADA" ? "  (pendente)" : ""}
              </Text>
              <Text style={styles.quadraEndereco}>{q.endereco}</Text>
            </Pressable>
          ))
        )}
      </View>
      {erro ? <Text style={styles.modalErro}>{erro}</Text> : null}
      <Pressable onPress={() => onNova({ nome: "", endereco: "" })}>
        <Text style={styles.modalLink}>+ Cadastrar quadra</Text>
      </Pressable>
    </>
  );
}

function ModalInput({
  placeholder,
  valor,
  onChange,
}: {
  placeholder: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <TextInput
      value={valor}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={cores.slate500}
      style={styles.modalInput}
    />
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  aviso: { fontSize: 14, color: cores.slate400, textAlign: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 190, gap: 16 },

  topoGrupo: { gap: 8 },
  tituloDescBloco: { gap: 4 },
  cabecalho: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tituloLinha: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  h1: { flex: 1, fontSize: 24, fontWeight: "700", color: cores.branco },
  descricao: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  descricaoContainer: { position: "relative" },
  descricaoMedidor: { position: "absolute", left: 0, right: 0, opacity: 0 },
  verDescricao: { fontSize: 14, fontWeight: "600", color: cores.teal },

  descricaoModalEyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  descricaoModalEyebrow: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  descricaoModalTitulo: { fontSize: 18, fontWeight: "600", color: cores.branco, marginTop: 4 },
  descricaoModalTexto: { fontSize: 14, lineHeight: 20, color: cores.slate300, marginTop: 8 },
  descricaoModalAcoes: { flexDirection: "row", gap: 10, marginTop: 14 },
  descricaoModalBtnSecundario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  descricaoModalBtnSecundarioTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  descricaoModalBtnPrimario: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  descricaoModalBtnPrimarioTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },

  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: cores.tealDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillTexto: { fontSize: 12, fontWeight: "600", color: cores.branco },
  pillCinza: { backgroundColor: "rgba(113, 113, 122, 0.15)" },
  pillTextoCinza: { color: cores.zinc500 },

  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: raio.campo,
    borderWidth: 1,
    padding: 12,
  },
  bannerIcone: { marginTop: 2 },
  bannerTextos: { flex: 1, gap: 3 },
  bannerTitulo: { fontSize: 13, color: cores.slate300 },
  bannerChamada: { fontSize: 13, fontWeight: "700" },

  secao: { gap: 8 },
  secaoCabecalho: { gap: 4 },
  secaoTitulo: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  secaoSub: { fontSize: 13, color: cores.slate400 },
  verMaisBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 6,
  },
  verMaisTexto: { fontSize: 13, fontWeight: "600", color: cores.teal },
  vazio: { fontSize: 14, color: cores.slate400, textAlign: "center", paddingVertical: 24 },
  notaExcluida: {
    fontSize: 12,
    color: cores.slate500,
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    paddingTop: 14,
  },

  cardLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  card: {
    flex: 1,
    borderTopRightRadius: raio.campo,
    borderBottomRightRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    borderLeftWidth: 3,
    backgroundColor: cores.cardFundo,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  cardTopo: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardData: { fontSize: 15, fontWeight: "600", color: cores.branco },
  cardHora: { fontSize: 13, color: cores.slate400 },
  textoCancelado: { color: cores.erroTexto },
  textoCanceladoFraco: { color: "rgba(252,165,165,0.7)" },
  textoConcluido: { color: "#6ee7b7" },
  textoPendente: { color: cores.slate400 },
  cardDescricao: {
    fontSize: 13,
    color: cores.slate400,
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
    paddingTop: 6,
  },
  checkinBtn: {
    backgroundColor: cores.orange,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  checkinBtnTexto: { fontSize: 12, fontWeight: "700", color: cores.dark },
  aoVivoBtn: {
    backgroundColor: "#ef4444",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aoVivoBtnTexto: { fontSize: 12, fontWeight: "700", color: cores.branco },
  aoVivoPonto: { width: 6, height: 6, borderRadius: 3, backgroundColor: cores.branco },
  confirmadoPill: { backgroundColor: "#10b981", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  confirmadoTexto: { fontSize: 12, fontWeight: "700", color: cores.dark },
  canceladaPill: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  canceladaTexto: { fontSize: 12, fontWeight: "600", color: cores.erroTexto },
  concluidaPill: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  concluidaTexto: { fontSize: 12, fontWeight: "600", color: "#6ee7b7" },
  partidaPendentePill: { backgroundColor: "rgba(100,116,139,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  partidaPendenteTexto: { fontSize: 12, fontWeight: "600", color: cores.slate300 },
  cardMenu: { padding: 6 },

  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  rodapeLinha: { flexDirection: "row", gap: 8 },
  rodapeIcone: {
    width: 48,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeIconeTeal: {
    width: 48,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeBotao: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeBotaoTexto: { fontSize: 14, fontWeight: "600", color: cores.branco },
  rodapeBotaoLaranja: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeBotaoLaranjaTexto: { fontSize: 14, fontWeight: "700", color: cores.dark },

  modalEyebrowLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  modalTitulo: { fontSize: 18, fontWeight: "700", color: cores.branco },
  modalDesc: { fontSize: 14, lineHeight: 20, color: cores.slate400 },
  modalErro: { fontSize: 13, color: cores.erroTexto },
  modalInput: {
    height: 46,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    fontSize: 15,
    color: cores.branco,
  },
  modalBotao: {
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBotaoTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
  modalBotaoContorno: {
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBotaoContornoTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },
  modalLink: { fontSize: 14, fontWeight: "600", color: cores.teal },

  horarioLinha: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    borderRadius: raio.campo,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  horarioDia: { fontSize: 14, fontWeight: "600", color: cores.branco },
  horarioHora: { fontSize: 14, color: cores.slate400 },

  detalheGrande: { fontSize: 24, fontWeight: "600", color: cores.branco, lineHeight: 28 },
  detalheTituloBloco: { gap: 2, marginTop: 4 },
  detalheTituloLinha: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  detalheLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  detalheAcoes: { flexDirection: "row", gap: 2 },
  detalheAcao: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  detalheAcaoBorda: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: cores.teal,
  },
  divisor: { height: 1, backgroundColor: cores.linhaSutil },
  detalheInfoLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  detalheDescGrupoAviso: { fontSize: 13, color: cores.slate500 },
  verMeuCheckinLinha: { alignSelf: "center" },
  verMeuCheckin: {
    fontSize: 12,
    fontWeight: "600",
    color: cores.slate400,
    textDecorationLine: "underline",
  },
  detalheDescBox: {
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    borderRadius: raio.campo,
    padding: 12,
    gap: 3,
  },
  detalheDescBoxCancel: { borderColor: cores.erroBorda, backgroundColor: cores.erroFundo },
  detalheDescRotulo: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  detalheDescTexto: { fontSize: 14, lineHeight: 19, color: cores.slate200 },

  quadraItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: raio.campo,
    backgroundColor: cores.superficieSutil,
  },
  quadraNome: { fontSize: 14, color: cores.branco },
  quadraEndereco: { fontSize: 12, color: cores.slate500 },
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
});
