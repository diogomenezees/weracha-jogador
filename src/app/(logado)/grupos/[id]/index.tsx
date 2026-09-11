import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";

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
  nomeDoMes,
  partidaEncerrada,
} from "@/partidas";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalCartao, ModalConfirmar, ModalTexto } from "@/grupo/modais";
import { SeletorData, SeletorDuracao, SeletorHora } from "@/grupo/pickers";
import { Navbar } from "@/ui/Navbar";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import type { DadosDaTelaGrupo, Grupo, PartidaResumo, Quadra } from "@/contrato/tipos";

type Aba = "detalhe" | "quadra" | "horarios" | "adicionar" | null;

export default function TelaGrupo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { estado, chamarApi } = useSessao();
  const meuId = estado.fase === "logado" ? estado.jogador.id : "";

  const [dados, setDados] = useState<DadosDaTelaGrupo | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [contaPendente, setContaPendente] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  const [aba, setAba] = useState<Aba>(null);
  const [partidaSel, setPartidaSel] = useState<PartidaResumo | null>(null);
  const [tokenConvite, setTokenConvite] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ titulo?: string; itens: ItemMenu[] } | null>(null);

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
        { rotulo: "Editar nome", onPress: () => iniciarEdicao({ tipo: "nome" }, grupo.nome) },
        {
          rotulo: grupo.descricao ? "Editar descrição" : "Adicionar descrição",
          onPress: () => iniciarEdicao({ tipo: "descGrupo" }, grupo.descricao ?? ""),
        },
        {
          rotulo: "Gerar link de convite novo",
          onPress: () => setConfirmando({ tipo: "novoLink" }),
        }
      );
      if (dados && dados.idsComResultado.length === 0) {
        itens.push({
          rotulo: "Excluir grupo",
          destrutivo: true,
          onPress: () => setConfirmando({ tipo: "excluirGrupo" }),
        });
      }
    }
    itens.push({
      rotulo: "Sair do grupo",
      destrutivo: true,
      onPress: () =>
        souDono
          ? Alert.alert(
              "Você é o dono",
              "Pra sair, transfira o grupo pra outra pessoa admin primeiro (pelo site, em Gerenciar jogadores).",
              [{ text: "Entendi" }]
            )
          : setConfirmando({ tipo: "sair" }),
    });
    setMenu({ titulo: grupo.nome, itens });
  }

  function abrirMenuPartida(p: PartidaResumo, temResultado: boolean) {
    const itens: ItemMenu[] = [
      {
        rotulo: p.descricao ? "Editar descrição" : "Adicionar descrição",
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
          { rotulo: "Reativar partida", onPress: () => void handleReativar(p.id) },
          {
            rotulo: "Excluir partida",
            destrutivo: true,
            onPress: () => setConfirmando({ tipo: "excluirPartida", partidaId: p.id }),
          }
        );
      } else {
        itens.push({
          rotulo: "Cancelar partida",
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
      (m) => Alert.alert("Não deu pra reativar", m)
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
      (m) => Alert.alert("Não deu pra renovar", m)
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
    Alert.alert(
      "Vincular quadra",
      `Vincular "${q.nome}" a esse grupo? Não dá pra trocar a quadra depois.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Vincular",
          onPress: async () => {
            setSalvandoQuadra(true);
            const r = await comApi(
              () => vincularQuadra(chamarApi, grupo.id, q.id),
              setErroQuadra
            );
            setSalvandoQuadra(false);
            if (r !== null) {
              setAba(null);
              recarregar();
            }
          },
        },
      ]
    );
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
    await Clipboard.setStringAsync(linkConvite(p));
    Alert.alert("Link copiado", "Cole no WhatsApp pra chamar a galera.");
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
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cabecalho}>
          <Text style={styles.h1} numberOfLines={2}>
            {grupo.nome}
          </Text>
          <Pressable hitSlop={10} onPress={abrirMenuGrupo}>
            <Text style={styles.menu}>⋯</Text>
          </Pressable>
        </View>

        {grupo.descricao ? (
          <Text style={styles.descricao} numberOfLines={3}>
            {grupo.descricao}
          </Text>
        ) : null}

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
            <Text style={styles.pillTexto}>
              📍 {grupo.quadraId ? (dados.quadra?.nome ?? "Quadra") : grupo.esporte}
            </Text>
          </Pressable>
          <Pressable style={styles.pill} onPress={() => setAba("horarios")}>
            <Text style={styles.pillTexto}>🕒 Horários</Text>
          </Pressable>
          <View style={styles.pill}>
            <Text style={styles.pillTexto}>⭐ Score {grupo.meuScore}</Text>
          </View>
        </View>

        {souAdmin && !grupo.quadraId && (
          <Banner
            cor="orange"
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
            titulo="Nenhuma partida agendada ainda."
            chamada={`Criar as partidas de ${proximoMes}`}
            onPress={() => void handleRenovar()}
          />
        )}
        {renovar && !souAdmin && (
          <Banner
            cor="red"
            titulo="As partidas acabaram, mas o grupo não."
            chamada="Chamar todo mundo pra jogar"
            onPress={() => void chamarGalera()}
          />
        )}

        {proximas.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Próximas partidas</Text>
            <Text style={styles.secaoSub}>O check-in abre 30 minutos antes de cada partida.</Text>
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
              />
            ))}
          </View>
        )}

        {!renovar && proximas.length === 0 && grupo.tipo === "AVULSO" && (
          <Banner
            cor={souAdmin ? "orange" : "red"}
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
            <Text style={styles.secaoTitulo}>Partidas anteriores</Text>
            {passadas.map((p) => (
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
              />
            ))}
          </View>
        )}

        {dados.temPartidaExcluida && (
          <Text style={styles.notaExcluida}>Esse grupo teve partidas excluídas.</Text>
        )}
      </ScrollView>

      <View style={styles.rodape}>
        <View style={styles.rodapeLinha}>
          {grupo.tipo === "AVULSO" && souAdmin && (
            <Pressable style={styles.rodapeIcone} onPress={() => abrirAdicionarPartida()}>
              <Text style={styles.rodapeIconeTexto}>＋</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.rodapeIcone}
            onPress={() => router.push(`/grupos/${grupo.id}/enquetes`)}
          >
            <Text style={styles.rodapeIconeTexto}>📊</Text>
          </Pressable>
          <Pressable
            style={styles.rodapeBotao}
            onPress={() => router.push(`/grupos/${grupo.id}/artilheiros`)}
          >
            <Text style={styles.rodapeBotaoTexto}>🏆 Artilheiros</Text>
          </Pressable>
        </View>
        <View style={styles.rodapeLinha}>
          <Pressable
            style={styles.rodapeIconeTeal}
            onPress={() => router.push(`/grupos/${grupo.id}/resenha`)}
          >
            <Text style={styles.rodapeIconeTexto}>💬</Text>
          </Pressable>
          <Pressable
            style={styles.rodapeBotaoLaranja}
            onPress={() => router.push(`/grupos/${grupo.id}/jogadores`)}
          >
            <Text style={styles.rodapeBotaoLaranjaTexto}>
              👥 {souAdmin ? "Gerenciar jogadores" : "Ver jogadores"} · {dados.totalMembros}
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
        <Text style={styles.modalEyebrow}>Horários</Text>
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
        <Text style={styles.modalEyebrow}>Adicionar partida</Text>
        <Text style={styles.modalTitulo}>Marcar mais um jogo</Text>
        <Text style={styles.modalDesc}>Esporte e quadra continuam os mesmos do grupo.</Text>
        <SeletorData iso={novaData} onChange={setNovaData} />
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
  titulo,
  chamada,
  onPress,
}: {
  cor: "teal" | "orange" | "red";
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
      <Text style={styles.bannerTitulo}>{titulo}</Text>
      <Text style={[styles.bannerChamada, { color: paleta.texto }]}>{chamada}</Text>
    </Pressable>
  );
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
}) {
  const data = new Date(p.data);
  const concluida = passada && !p.cancelada && temResultado;
  const corBorda = p.cancelada ? "#dc2626" : concluida ? "#10b981" : cores.teal;

  return (
    <View style={styles.cardLinha}>
      <Pressable style={[styles.card, { borderLeftColor: corBorda }]} onPress={onAbrir}>
        <View style={styles.cardTopo}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardData, p.cancelada && styles.textoCancelado]}>
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
                <Text style={styles.checkinBtnTexto}>Check-in →</Text>
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
          ) : (
            <Text style={styles.chevron}>›</Text>
          )}
        </View>
        {p.descricao ? (
          <Text style={[styles.cardDescricao, p.cancelada && styles.textoCanceladoFraco]} numberOfLines={2}>
            {p.descricao}
          </Text>
        ) : null}
      </Pressable>
      {souAdmin && (
        <Pressable style={styles.cardMenu} hitSlop={8} onPress={onMenu}>
          <Text style={styles.cardMenuTexto}>⋯</Text>
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

  return (
    <>
      <Text
        style={[
          styles.modalEyebrow,
          p.cancelada && { color: cores.erroTexto },
          encerrada && !p.cancelada && { color: cores.slate400 },
        ]}
      >
        {p.cancelada ? "Partida cancelada" : encerrada ? "Partida encerrada" : "Contagem regressiva"}
      </Text>
      <Text style={styles.detalheGrande}>
        {p.cancelada || encerrada
          ? `${formatarDiaSemanaData(data)}, ${formatarHora(data)}`
          : formatarContagemRegressiva(data)}
      </Text>

      <View style={styles.detalheLinha}>
        <Text style={styles.modalTitulo} numberOfLines={1}>
          {grupo.nome}
        </Text>
        {podeConvidar && (
          <View style={styles.detalheAcoes}>
            <Pressable style={styles.detalheAcao} onPress={onCopiar} disabled={!temToken}>
              <Text style={styles.detalheAcaoTexto}>Copiar link</Text>
            </Pressable>
            <Pressable style={styles.detalheAcaoLaranja} onPress={onCompartilhar} disabled={!temToken}>
              <Text style={styles.detalheAcaoLaranjaTexto}>Compartilhar</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!p.cancelada && (
        <Text style={styles.modalDesc}>
          {formatarDiaSemanaData(data)} · {formatarHora(data)} · {duracaoDaPartida(grupo, p)} min
        </Text>
      )}
      <Text style={styles.modalDesc}>
        📍 {quadra?.nome ?? "Quadra não cadastrada"}
        {quadra?.endereco ? ` · ${quadra.endereco}` : ""}
      </Text>

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
        </View>
      ) : emCheckin ? (
        <Pressable style={styles.modalBotao} onPress={() => onIr("checkin")}>
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
        <Text style={styles.modalEyebrow}>Quadra</Text>
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
        <Text style={styles.modalEyebrow}>Quadra</Text>
        <Text style={styles.modalTitulo}>Sem quadra vinculada</Text>
        <Text style={styles.modalDesc}>O admin do grupo ainda não cadastrou uma quadra.</Text>
      </>
    );
  }
  if (nova) {
    return (
      <>
        <Text style={styles.modalEyebrow}>Quadra</Text>
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
      <Text style={styles.modalEyebrow}>Quadra</Text>
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
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 190, gap: 16 },

  cabecalho: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  h1: { flex: 1, fontSize: 24, fontWeight: "700", color: cores.branco },
  menu: { fontSize: 26, color: cores.slate400, lineHeight: 26 },
  descricao: { fontSize: 13, lineHeight: 19, color: cores.slate400 },

  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pill: {
    borderRadius: 999,
    backgroundColor: cores.tealDark,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillTexto: { fontSize: 12, fontWeight: "600", color: cores.branco },

  banner: { borderRadius: raio.campo, borderWidth: 1, padding: 12, gap: 3 },
  bannerTitulo: { fontSize: 13, color: cores.slate300 },
  bannerChamada: { fontSize: 13, fontWeight: "700" },

  secao: { gap: 8 },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  secaoSub: { fontSize: 13, color: cores.slate400 },
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
    borderRadius: raio.campo,
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
  cardDescricao: {
    fontSize: 13,
    color: cores.slate400,
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
    paddingTop: 6,
  },
  chevron: { fontSize: 20, color: cores.slate500 },
  checkinBtn: {
    backgroundColor: cores.orange,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  checkinBtnTexto: { fontSize: 12, fontWeight: "700", color: cores.dark },
  confirmadoPill: { backgroundColor: "#10b981", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  confirmadoTexto: { fontSize: 12, fontWeight: "700", color: cores.dark },
  canceladaPill: { backgroundColor: "rgba(220,38,38,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  canceladaTexto: { fontSize: 12, fontWeight: "600", color: cores.erroTexto },
  concluidaPill: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  concluidaTexto: { fontSize: 12, fontWeight: "600", color: "#6ee7b7" },
  cardMenu: { padding: 6 },
  cardMenuTexto: { fontSize: 22, color: cores.slate400 },

  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 26,
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
  rodapeIconeTexto: { fontSize: 18 },
  rodapeBotao: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeBotaoTexto: { fontSize: 14, fontWeight: "600", color: cores.branco },
  rodapeBotaoLaranja: {
    flex: 1,
    height: 48,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeBotaoLaranjaTexto: { fontSize: 14, fontWeight: "700", color: cores.dark },

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
  detalheLinha: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
  detalheAcoes: { flexDirection: "row", gap: 6 },
  detalheAcao: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: cores.superficieMedia },
  detalheAcaoTexto: { fontSize: 12, fontWeight: "600", color: cores.slate300 },
  detalheAcaoLaranja: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: cores.laranjaFundo },
  detalheAcaoLaranjaTexto: { fontSize: 12, fontWeight: "700", color: cores.orange },
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
