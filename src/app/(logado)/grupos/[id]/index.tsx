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
} from "@/api/grupos";
import {
  cancelarPartida,
  editarDescricaoPartida,
  excluirPartida,
  reativarPartida,
} from "@/api/partidas";
import {
  ArrowRight,
  Ban,
  Calendar,
  CalendarClock,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  History,
  Bell,
  EllipsisVertical,
  type LucideIcon,
  Link2,
  LogOut,
  MapPin,
  NotebookPen,
  PartyPopper,
  Pencil,
  RefreshCw,
  RotateCcw,
  Share2,
  Trash2,
  Trophy,
  UserPlus,
  Users,
} from "@/ui/Icone";
import { PRODUCAO_URL } from "@/config/links";
import { ehHoje } from "@/formato";
import {
  aguardandoRenovacao,
  horasDoCheckin,
  duracaoDaPartida,
  mesDeRenovacao,
  momentoDoMeuScore,
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
  textoHorasAntes,
  nomeDoMes,
  partidaEncerrada,
} from "@/partidas";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { FuncoesDoGrupo } from "@/grupo/FuncoesDoGrupo";
import { ModalMeuScore } from "@/grupo/ModalMeuScore";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { PilulaEsporte } from "@/grupo/PilulaEsporte";
import { ModalCartao, ModalConfirmar, ModalTexto } from "@/grupo/modais";
import { SeletorData, SeletorDuracao, SeletorHora } from "@/grupo/pickers";
import { Navbar } from "@/ui/Navbar";
import { useSessao } from "@/sessao/contexto";
import { useDialogos } from "@/ui/Dialogos";
import { cores, fontes, raio } from "@/tema";
import type { DadosDaTelaGrupo, Grupo, PartidaResumo, Quadra } from "@/contrato/tipos";
import type { AtividadeGrupo } from "@/contrato/atividades";
import { buscarAtividadesDoGrupo } from "@/api/atividades";
import { ListaAtividades } from "@/atividades/ListaAtividades";

type Aba = "detalhe" | "convidar" | "quadra" | "horarios" | "adicionar" | null;

// Quantas partidas finalizadas aparecem antes do "Ver tudo" (mesmo valor do
// site). Poucas pra "Atividades recentes", logo abaixo, não ficar longe.
const PARTIDAS_PASSADAS_VISIVEIS = 3;
// A API devolve 10 por página (o "Ver tudo" já abre com mais); a seção mostra 5.
const ATIVIDADES_NA_SECAO = 5;

// "Como funciona" do modal Convidar (mesmo texto do site).
const PASSOS_CONVITE = ["Copie o link", "Mande no grupo do WhatsApp", "A galera entra e confirma presença"];

export default function TelaGrupo() {
  const { id, bemVindo } = useLocalSearchParams<{ id: string; bemVindo?: string }>();
  const { estado, chamarApi } = useSessao();
  const { avisar } = useDialogos();
  const meuId = estado.fase === "logado" ? estado.jogador.id : "";
  const insets = useSafeAreaInsets();

  const [dados, setDados] = useState<DadosDaTelaGrupo | undefined>(undefined);
  const [meuScoreAberto, setMeuScoreAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [contaPendente, setContaPendente] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [atualizando, setAtualizando] = useState(false);

  const [aba, setAba] = useState<Aba>(null);
  // Quem acabou de criar o grupo chega com ?bemVindo=1 (criar-grupo.tsx) e vê uma
  // vez o modal de como trazer os jogadores. Mesmo modal do site
  // (weracha-site/components/dialog-primeiros-jogadores.tsx).
  const [boasVindasAberto, setBoasVindasAberto] = useState(bemVindo === "1");
  const [verTodasPassadas, setVerTodasPassadas] = useState(false);
  const [atividades, setAtividades] = useState<{ lista: AtividadeGrupo[]; em: number }>({
    lista: [],
    em: 0,
  });
  const [partidaSel, setPartidaSel] = useState<PartidaResumo | null>(null);
  const [tokenConvite, setTokenConvite] = useState<string | null>(null);
  const [linkGrupoCopiado, setLinkGrupoCopiado] = useState(false);
  const [menu, setMenu] = useState<{
    titulo?: string;
    icone?: LucideIcon;
    itens: ItemMenu[];
  } | null>(null);
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
    // Fora do caminho crítico: a tela já aparece, as atividades chegam depois.
    // Falha (ou site anterior à rota) só deixa a seção de fora.
    buscarAtividadesDoGrupo(chamarApi, id)
      .then((r) => setAtividades({ lista: r.atividades, em: Date.now() }))
      .catch(() => {});
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

  // Token de convite: busca quando o membro abre o detalhe de uma partida ou o
  // modal "Convidar jogadores" (Atalhos do grupo). Qualquer membro convida (o servidor
  // libera o convite pra todos; só regenerar é de admin).
  useEffect(() => {
    if ((aba !== "detalhe" && aba !== "convidar") || !grupo || tokenConvite) return;
    obterConvite(chamarApi, grupo.id)
      .then(setTokenConvite)
      .catch(() => {});
  }, [aba, grupo, tokenConvite, chamarApi]);

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
      );
      // Só grupo avulso cria partida na mão (recorrente gera pela renovação).
      if (grupo.tipo === "AVULSO") {
        itens.push({
          rotulo: "Adicionar partida",
          Icone: CalendarPlus,
          onPress: () => abrirAdicionarPartida(),
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
              "Pra sair, transfira o grupo pra outra pessoa admin primeiro (pelo site, em Gerenciar jogadores).",
              { eyebrow: "Sair do grupo", Icone: LogOut }
            )
          : setConfirmando({ tipo: "sair" }),
    });
    if (souAdmin && dados && dados.idsComResultado.length === 0) {
      itens.push({
        rotulo: "Excluir grupo",
        Icone: Trash2,
        destrutivo: true,
        onPress: () => setConfirmando({ tipo: "excluirGrupo" }),
      });
    }
    setMenu({ titulo: grupo.nome, icone: Users, itens });
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
    setMenu({ titulo: "Opções da partida", icone: Calendar, itens });
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
        setLinkGrupoCopiado(false);
        setConfirmando(null);
        // Volta pro modal de convite já com o link novo pronto pra copiar.
        setAba("convidar");
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

  function linkConvite(p: PartidaResumo | null): string {
    const base = `${PRODUCAO_URL}/convite/${tokenConvite}`;
    return p ? `${base}?partida=${p.id}` : base;
  }

  async function compartilharConvite(p: PartidaResumo) {
    if (!tokenConvite || !grupo) return;
    const data = new Date(p.data);
    const msg =
      `Bora jogar? Você foi convidado pro grupo ${grupo.nome} no WeRacha.\n` +
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

  // Link do grupo sem ?partida= — convite genérico, aberto pelo menu. Aqui o
  // botão é grande e troca o texto (diferente do ícone do detalhe da partida,
  // que só pisca a borda).
  async function copiarLinkDoGrupo() {
    if (!tokenConvite) return;
    await Clipboard.setStringAsync(linkConvite(null));
    setLinkGrupoCopiado(true);
    setTimeout(() => setLinkGrupoCopiado(false), 2000);
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
        contentContainerStyle={[styles.scroll, { paddingBottom: 100 + insets.bottom }]}
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

          {/* Pílulas numa linha só: o que não couber rola pro lado. */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsLinha}
          >
            <PilulaEsporte esporte={grupo.esporte} clicavel />
            {grupo.quadraId ? (
              <Pressable style={styles.pill} onPress={() => setAba("quadra")}>
                <MapPin size={12} color={cores.branco} />
                <Text style={styles.pillTexto}>{dados.quadra?.nome ?? "Quadra não encontrada"}</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.pill} onPress={() => setAba("horarios")}>
              <Clock size={12} color={cores.branco} />
              <Text style={styles.pillTexto}>Horários</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Espelha o aviso do site: score ainda no padrão (nasceu do maior score
            real do jogador em outro grupo do esporte, ou 50). Some depois que ele
            ajusta pra um valor diferente. */}
        {grupo.meuScoreOrigem === "PADRAO" && (
          <Banner
            cor="orange"
            Icone={Trophy}
            titulo="Seu score nesse grupo ainda está no padrão."
            chamada="Ajustar meu score"
            onPress={() => setMeuScoreAberto(true)}
          />
        )}

        {souAdmin && !grupo.quadraId && (
          <Banner
            cor="orange"
            Icone={MapPin}
            titulo="Cadastre o local do jogo pra galera."
            chamada="Cadastrar quadra"
            onPress={() => router.push(`/grupos/${grupo.id}/quadra`)}
          />
        )}

        {/* Atalhos do grupo em carrossel (antes ficavam presos num rodapé fixo),
            logo abaixo dos alertas. "Adicionar partida" (grupo avulso) aparece aqui
            e no menu ⋮ do topo. */}
        <FuncoesDoGrupo
          grupoId={grupo.id}
          onConvidar={() => setAba("convidar")}
          meuScore={grupo.meuScore}
          momentoMeuScore={momentoDoMeuScore(grupo)}
          onMeuScore={() => setMeuScoreAberto(true)}
          souAdmin={souAdmin}
          onAdicionarPartida={
            souAdmin && grupo.tipo === "AVULSO" ? () => abrirAdicionarPartida() : undefined
          }
        />

        {/* Título sempre visível: sem partida pela frente, o alerta laranja fica
            logo abaixo dele pra chamar atenção. */}
        <View style={styles.secao}>
          <View style={styles.secaoCabecalho}>
            <View style={styles.secaoTituloLinha}>
              <CalendarClock size={14} color={cores.teal} />
              <Text style={styles.secaoTitulo}>Próximas partidas</Text>
            </View>
            {/* Partida cancelada continua na lista até o horário passar; sozinha,
                não é partida pra jogar, então não leva a frase do check-in. */}
            {proximas.some((p) => !p.cancelada) && (
              <Text style={styles.secaoSub}>
                O check-in abre {textoHorasAntes(horasDoCheckin(grupo))} antes de cada partida.
              </Text>
            )}
          </View>
          {/* Grupo semanal sem partida pela frente: renovar (admin) ou chamar a
              galera (membro). Mesmo lugar e formato do alerta do avulso abaixo. */}
          {renovar && souAdmin && (
            <Banner
              cor="orange"
              Icone={RefreshCw}
              titulo="Nenhuma partida agendada ainda."
              chamada={`Criar as partidas de ${proximoMes}`}
              onPress={() => void handleRenovar()}
            />
          )}
          {renovar && !souAdmin && (
            <Banner
              cor="orange"
              Icone={Share2}
              titulo="As partidas acabaram, mas o grupo não."
              chamada="Chamar todo mundo pra jogar"
              onPress={() => void chamarGalera()}
            />
          )}
          {!renovar && proximas.length === 0 && grupo.tipo === "AVULSO" && (
            <Banner
              cor="orange"
              Icone={souAdmin ? CalendarPlus : Share2}
              titulo={souAdmin ? "Bora marcar outra partida?" : "As partidas acabaram."}
              chamada={souAdmin ? "Mesmos jogadores, esporte e quadra" : "Chamar todo mundo pra jogar"}
              onPress={souAdmin ? () => abrirAdicionarPartida() : () => void chamarGalera()}
            />
          )}
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
          {!renovar && proximas.length === 0 && grupo.tipo === "RECORRENTE" && (
            <Text style={styles.vazio}>Nenhuma partida por aqui.</Text>
          )}
        </View>

        {passadas.length > 0 && (
          <View style={styles.secao}>
            <View style={styles.secaoCabecalho}>
              <View style={styles.secaoTituloEntre}>
                <View style={styles.secaoTituloLinha}>
                  <History size={14} color={cores.teal} />
                  <Text style={styles.secaoTitulo}>Partidas anteriores</Text>
                </View>
                {passadas.length > PARTIDAS_PASSADAS_VISIVEIS && (
                  <Pressable
                    hitSlop={8}
                    style={styles.verTudo}
                    onPress={() => setVerTodasPassadas((v) => !v)}
                  >
                    <Text style={styles.verTudoTexto}>
                      {verTodasPassadas ? "Ver menos" : "Ver tudo"}
                    </Text>
                    {verTodasPassadas ? (
                      <ChevronUp size={14} color={cores.slate400} />
                    ) : (
                      <ChevronDown size={14} color={cores.slate400} />
                    )}
                  </Pressable>
                )}
              </View>
              <Text style={styles.secaoSub}>Confira o histórico das partidas já realizadas.</Text>
            </View>
            {(verTodasPassadas ? passadas : passadas.slice(0, PARTIDAS_PASSADAS_VISIVEIS)).map((p) => (
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
            {/* Colada no último card visível (acompanha o "Ver tudo"). */}
            {dados.temPartidaExcluida && (
              <Text style={styles.notaExcluida}>Esse grupo teve partidas excluídas.</Text>
            )}
          </View>
        )}

        {atividades.lista.length > 0 && (
          <View style={styles.secao}>
            <View style={styles.secaoCabecalho}>
              <View style={styles.secaoTituloEntre}>
                <View style={styles.secaoTituloLinha}>
                  <Bell size={14} color={cores.teal} />
                  <Text style={styles.secaoTitulo}>Atividades recentes</Text>
                </View>
                {/* Só quando há mais do que a seção mostra (igual Partidas anteriores). */}
                {atividades.lista.length > ATIVIDADES_NA_SECAO && (
                  <Pressable
                    hitSlop={8}
                    style={styles.verTudo}
                    onPress={() => router.push(`/grupos/${grupo.id}/atividades`)}
                  >
                    <Text style={styles.verTudoTexto}>Ver tudo</Text>
                    <ChevronRight size={14} color={cores.slate400} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.secaoSub}>O que rolou de novo no grupo.</Text>
            </View>
            <ListaAtividades
              atividades={atividades.lista.slice(0, ATIVIDADES_NA_SECAO)}
              agora={atividades.em}
              noGrupo
            />
          </View>
        )}

        {/* Sem partida anterior pra mostrar, a nota fica no fim da tela. */}
        {dados.temPartidaExcluida && passadas.length === 0 && (
          <Text style={styles.notaExcluida}>Esse grupo teve partidas excluídas.</Text>
        )}
      </ScrollView>

      {/* Rodapé fixo só com o atalho principal (elenco), igual o site. As outras
          sub-telas ficam em "Atalhos do grupo". */}
      <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
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

      {/* Modal: convidar jogadores (link do grupo, sem partida) */}
      <ModalCartao aberto={aba === "convidar"} onFechar={() => setAba(null)}>
        <View style={styles.modalEyebrowLinha}>
          <UserPlus size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Convidar jogadores</Text>
        </View>
        <View style={styles.convidarTituloLinha}>
          <Users size={16} color={cores.branco} />
          <Text style={[styles.modalTitulo, { flexShrink: 1 }]} numberOfLines={1}>
            {grupo.nome}
          </Text>
        </View>
        <Text style={styles.modalDesc}>
          Um link só pra galera toda. Ninguém precisa esperar você cadastrar.
        </Text>
        <View style={styles.convidarPassos}>
          {PASSOS_CONVITE.map((passo, i) => (
            <View key={passo} style={styles.convidarPasso}>
              <View style={styles.convidarPassoNumero}>
                <Text style={styles.convidarPassoNumeroTexto}>{i + 1}</Text>
              </View>
              <Text style={styles.convidarPassoTexto}>{passo}</Text>
            </View>
          ))}
        </View>
        {/* Prévia do link: mostra o que vai ser colado e também copia ao tocar. */}
        <Pressable
          style={styles.convidarPrevia}
          onPress={() => void copiarLinkDoGrupo()}
          disabled={!tokenConvite}
          accessibilityRole="button"
          accessibilityLabel="Copiar link de convite"
        >
          <Text style={styles.convidarPreviaTexto} numberOfLines={1}>
            {tokenConvite ? linkConvite(null).replace(/^https?:\/\//, "") : "Gerando link..."}
          </Text>
          {linkGrupoCopiado ? (
            <Check size={16} color={cores.teal} />
          ) : (
            <Copy size={16} color={cores.slate500} />
          )}
        </Pressable>
        <View style={styles.convidarAcoes}>
          {/* Só admin regenera; jogador comum só copia o link. */}
          {souAdmin && (
            <Pressable
              style={[styles.modalBotaoContorno, styles.convidarBotaoIcone]}
              onPress={() => {
                setAba(null);
                setConfirmando({ tipo: "novoLink" });
              }}
              accessibilityRole="button"
              accessibilityLabel="Gerar novo convite"
            >
              <RefreshCw size={18} color={cores.branco} />
            </Pressable>
          )}
          <Pressable
            style={[styles.modalBotao, styles.convidarBotaoLink, !tokenConvite && { opacity: 0.6 }]}
            onPress={() => void copiarLinkDoGrupo()}
            disabled={!tokenConvite}
          >
            {linkGrupoCopiado ? <Check size={16} color={cores.dark} /> : <Copy size={16} color={cores.dark} />}
            <Text style={styles.modalBotaoTexto}>
              {!tokenConvite ? "Carregando link..." : linkGrupoCopiado ? "Link copiado!" : "Copiar link"}
            </Text>
          </Pressable>
        </View>
      </ModalCartao>

      {/* Modal: logo depois de criar o grupo. Só explica os dois caminhos; quem
          clica em Convidar / Gerenciar jogadores é o dono. */}
      <ModalCartao
        aberto={boasVindasAberto && souAdmin}
        onFechar={() => setBoasVindasAberto(false)}
      >
        <View style={styles.modalEyebrowLinha}>
          <PartyPopper size={16} color={cores.teal} />
          <Text style={styles.modalEyebrow}>Grupo criado</Text>
        </View>
        <Text style={styles.modalTitulo}>Agora, traga a galera</Text>
        <Text style={styles.modalDesc}>Dois jeitos de colocar os jogadores.</Text>
        <View style={styles.boasVindasOpcao}>
          <View style={styles.boasVindasOpcaoTopo}>
            <View style={styles.boasVindasIcone}>
              <Link2 size={16} color={cores.teal} />
            </View>
            <Text style={styles.boasVindasOpcaoTitulo}>Mande o link de convite</Text>
          </View>
          <Text style={styles.boasVindasOpcaoTexto}>
            Em <Text style={styles.boasVindasDestaque}>Convidar</Text>, copie o link e mande
            no WhatsApp. Cada um entra sozinho.
          </Text>
        </View>
        <View style={styles.boasVindasOpcao}>
          <View style={styles.boasVindasOpcaoTopo}>
            <View style={styles.boasVindasIcone}>
              <UserPlus size={16} color={cores.teal} />
            </View>
            <Text style={styles.boasVindasOpcaoTitulo}>Ou cadastre você mesmo</Text>
          </View>
          <Text style={styles.boasVindasOpcaoTexto}>
            Em <Text style={styles.boasVindasDestaque}>Gerenciar jogadores</Text> → Novo
            jogador. Bom pra quem não usa o app.
          </Text>
        </View>
        <Pressable style={[styles.modalBotao, { marginTop: 4 }]} onPress={() => setBoasVindasAberto(false)}>
          <Text style={styles.modalBotaoTexto}>Entendi</Text>
        </Pressable>
      </ModalCartao>

      {/* Modal: quadra */}
      <ModalCartao aberto={aba === "quadra" && !!grupo.quadraId} onFechar={() => setAba(null)}>
        <ModalQuadra grupo={grupo} quadra={dados.quadra} />
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
        Icone={Pencil}
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
        Icone={NotebookPen}
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
        <View style={styles.descricaoModalTituloLinha}>
          <Users size={16} color={cores.branco} />
          <Text style={styles.descricaoModalTitulo}>{grupo.nome}</Text>
        </View>
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
        Icone={NotebookPen}
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
        Icone={Ban}
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

      {/* key: remonta a cada abertura, pro formulário nascer com os valores atuais. */}
      {meuId ? (
        <ModalMeuScore
          key={meuScoreAberto ? "aberto" : "fechado"}
          aberto={meuScoreAberto}
          onFechar={() => setMeuScoreAberto(false)}
          grupo={grupo}
          jogadorId={meuId}
          chamarApi={chamarApi}
          onSalvo={({ score, posicaoId }) =>
            setDados((d) =>
              d?.grupo
                ? {
                    ...d,
                    grupo: {
                      ...d.grupo,
                      meuScore: score,
                      meuPosicaoId: posicaoId,
                      // Mesma regra do site: só sai do PADRAO se o valor mudou.
                      meuScoreOrigem:
                        score !== d.grupo.meuScore
                          ? souAdmin
                            ? "ADMIN"
                            : "AUTOAVALIACAO"
                          : d.grupo.meuScoreOrigem,
                    },
                  }
                : d
            )
          }
        />
      ) : null}

      <MenuAcoes
        aberto={menu !== null}
        titulo={menu?.titulo}
        IconeTitulo={menu?.icone}
        itens={menu?.itens ?? []}
        onFechar={() => setMenu(null)}
      />

      {/* Confirmações */}
      <ModalConfirmar
        aberto={confirmando?.tipo === "excluirGrupo"}
        Icone={Trash2}
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
        Icone={LogOut}
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
        Icone={RefreshCw}
        eyebrow="Convite"
        titulo="Gerar link de convite novo?"
        descricao="O link antigo para de funcionar na hora. Quem já entrou continua normalmente."
        confirmarLabel="Gerar novo link"
        ocupado={confOcupado}
        erro={confErro}
        onConfirmar={() => void confirmar()}
        onFechar={() => { setConfirmando(null); setConfErro(null); setAba("convidar"); }}
      />
      <ModalConfirmar
        aberto={confirmando?.tipo === "excluirPartida"}
        Icone={Trash2}
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
          {passada ? (
            // Partida anterior numa linha só, igual o site: "Ter, 21/10 · 20:00"
            // na cor do status, sem a duração.
            <Text
              style={[
                styles.cardDataPassada,
                p.cancelada
                  ? styles.textoPassadaCancelada
                  : concluida
                    ? styles.textoPassadaConcluida
                    : styles.textoPassadaPendente,
              ]}
              numberOfLines={1}
            >
              {formatarDiaSemanaData(data)} · {formatarHora(data)}
            </Text>
          ) : (
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardData, p.cancelada && styles.textoCancelado]}>
                {formatarDiaSemanaData(data)}
                {ehHoje(data) ? " · hoje" : ""}
              </Text>
              <Text style={[styles.cardHora, p.cancelada && styles.textoCanceladoFraco]}>
                {formatarHora(data)} · {duracaoDaPartida(grupo, p)}min
              </Text>
            </View>
          )}
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
              // Botão (não só etiqueta), igual o site: o toque vai direto pro
              // check-in em vez de cair no card e abrir o modal da partida.
              <Pressable
                style={styles.confirmadoPill}
                onPress={onCheckin}
                accessibilityRole="button"
                accessibilityLabel="Confirmado. Abrir o check-in"
              >
                <Text style={styles.confirmadoTexto}>Confirmado</Text>
                <ArrowRight size={14} color={cores.dark} />
              </Pressable>
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
          ) : souAdmin ? null : (
            <ChevronRight size={18} color={cores.slate500} />
          )}
          {/* Partida anterior: o site mostra a seta depois do selo pra quem não é admin. */}
          {passada && !souAdmin ? (
            <ChevronRight
              size={18}
              color={p.cancelada ? "rgba(248, 113, 113, 0.6)" : cores.slate500}
            />
          ) : null}
          {/* ⋮ dentro do cartão (e não ao lado) pra ele ocupar a largura toda,
              alinhado com os banners. Pressable aninhado: o toque aqui não
              chega no onAbrir do cartão. */}
          {souAdmin && (
            <Pressable
              style={styles.cardMenu}
              hitSlop={8}
              onPress={onMenu}
              accessibilityRole="button"
              accessibilityLabel="Mais opções da partida"
            >
              <EllipsisVertical size={18} color={cores.slate400} />
            </Pressable>
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
  temToken: boolean;
  onCopiar: () => void;
  onCompartilhar: () => void;
  onIr: (rota: "checkin" | "ao-vivo" | "resultado") => void;
  onFechar: () => void;
}) {
  const data = new Date(p.data);
  const podeConvidar = !p.cancelada && !encerrada;
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
        <PilulaEsporte esporte={grupo.esporte} />
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

// Só leitura: a pílula da quadra só aparece com quadra vinculada. Cadastrar ou
// vincular é na tela própria (grupos/[id]/quadra), a partir do aviso pro admin.
function ModalQuadra({ grupo, quadra }: { grupo: Grupo; quadra?: Quadra }) {
  return (
    <>
      <View style={styles.modalEyebrowLinha}>
        <MapPin size={16} color={cores.teal} />
        <Text style={styles.modalEyebrow}>Quadra</Text>
      </View>
      <Text style={styles.modalTitulo}>{quadra?.nome ?? "Quadra não encontrada"}</Text>
      {quadra && quadra.status !== "VALIDADA" && (
        <View style={styles.pendentePill}>
          <Text style={styles.pendenteTexto}>Em validação</Text>
        </View>
      )}
      <Text style={styles.modalDesc}>{quadra?.endereco ?? "Endereço não informado."}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  aviso: { fontSize: 14, color: cores.slate400, textAlign: "center" },
  // Mesmo ritmo do site (/grupos/[id]): 16 entre avisos/atalhos (mb-4) e 20
  // entre seções (mt-5): cabeçalho, Próximas partidas e Partidas anteriores
  // ganham +4 em cima do gap. Igual ao painel (20 entre seções).
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 190, gap: 16 },

  topoGrupo: { gap: 8, marginBottom: 4 },
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
  descricaoModalTituloLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  descricaoModalTitulo: { flexShrink: 1, fontSize: 18, fontWeight: "600", color: cores.branco },
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
  pillsLinha: { flexDirection: "row", gap: 6 },
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

  secao: { gap: 8, marginTop: 4 },
  secaoCabecalho: { gap: 2 },
  secaoTituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    letterSpacing: 2,
    color: cores.teal,
    textTransform: "uppercase",
    includeFontPadding: false,
  },
  // lineHeight + includeFontPadding: sem isso o Android afasta a frase do título.
  secaoSub: { fontSize: 14, lineHeight: 20, includeFontPadding: false, color: cores.slate400 },
  secaoTituloEntre: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  verTudo: { flexDirection: "row", alignItems: "center", gap: 2 },
  verTudoTexto: { fontSize: 12, fontWeight: "500", color: cores.slate400 },
  vazio: { fontSize: 14, color: cores.slate400, textAlign: "center", paddingVertical: 24 },
  notaExcluida: { marginTop: 4, fontSize: 12, color: cores.slate500, textAlign: "center" },

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
  // Partida anterior (linha única, igual o site: text-sm na cor do status).
  cardDataPassada: { flex: 1, fontSize: 14 },
  textoPassadaCancelada: { color: "#f87171" },
  textoPassadaConcluida: { color: "#34d399" },
  textoPassadaPendente: { color: cores.slate400 },
  textoCancelado: { color: cores.erroTexto },
  textoCanceladoFraco: { color: "rgba(252,165,165,0.7)" },
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
  confirmadoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10b981",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmadoTexto: { fontSize: 12, fontWeight: "700", color: cores.dark },
  canceladaPill: { backgroundColor: "rgba(239, 68, 68, 0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  canceladaTexto: { fontSize: 12, fontWeight: "600", color: cores.erroTexto },
  concluidaPill: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  concluidaTexto: { fontSize: 12, fontWeight: "600", color: "#6ee7b7" },
  partidaPendentePill: { backgroundColor: "rgba(100,116,139,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  partidaPendenteTexto: { fontSize: 12, fontWeight: "600", color: cores.slate300 },
  cardMenu: { padding: 6, marginVertical: -6, marginRight: -8 },

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
  },
  rodapeBotaoLaranja: {
    height: 45,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeBotaoLaranjaTexto: { fontSize: 16, fontWeight: "700", color: cores.dark },

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
  convidarTituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  convidarAcoes: { flexDirection: "row", gap: 8, marginTop: 4 },
  convidarBotaoIcone: { width: 48 },
  convidarBotaoLink: { flex: 1, flexDirection: "row", gap: 8 },
  convidarPassos: { gap: 10, marginTop: 6 },
  convidarPasso: { flexDirection: "row", alignItems: "center", gap: 10 },
  convidarPassoNumero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(31, 179, 163, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  convidarPassoNumeroTexto: { fontSize: 12, fontWeight: "600", color: cores.teal },
  convidarPassoTexto: { fontSize: 14, color: cores.slate300, flexShrink: 1 },
  convidarPrevia: {
    height: 44,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(31, 179, 163, 0.3)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  convidarPreviaTexto: { flex: 1, fontSize: 13, fontFamily: fontes.mono, color: cores.slate300 },

  boasVindasOpcao: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    gap: 6,
  },
  boasVindasOpcaoTopo: { flexDirection: "row", alignItems: "center", gap: 8 },
  boasVindasIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(31, 179, 163, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  boasVindasOpcaoTitulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  boasVindasOpcaoTexto: { fontSize: 14, lineHeight: 19, color: cores.slate400 },
  boasVindasDestaque: { fontWeight: "600", color: cores.slate200 },
  modalBotaoContornoTexto: { fontSize: 15, fontWeight: "600", color: cores.branco },

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
