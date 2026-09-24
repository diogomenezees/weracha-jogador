import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import {
  buscarElencoDoGrupo,
  definirMensalista,
  definirPapel,
  definirPosicao,
  definirScore,
  deixarCargoAdmin,
  ehMensalistaHoje,
  removerJogador,
  transferirDono,
} from "@/api/jogadores";
import { mensagemDoErro } from "@/mensagens-erro";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalConfirmar } from "@/grupo/modais";
import { FormNovoJogador } from "@/jogadores/FormNovoJogador";
import { ModalPerfil, ModalPosicao, ModalScore, ModalTransferirDono } from "@/jogadores/modais";
import { TelaCarregando, TelaErro } from "@/painel/ui";
import { AvatarJogador } from "@/ui/AvatarJogador";
import {
  ArrowDownAZ,
  Clock,
  Crown,
  Eye,
  EyeOff,
  MessageCircle,
  Pencil,
  Shield,
  ShieldCheck,
  ShieldOff,
  Star,
  Trash2,
  UserCog,
  Users,
  Wallet,
} from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { useSessao } from "@/sessao/contexto";
import { useDialogos } from "@/ui/Dialogos";
import { cores, raio } from "@/tema";
import type { DadosDaTelaJogadoresDoGrupo, JogadorDoGrupo, MembroGrupo } from "@/contrato/tipos";

type Ordenacao = "NOME" | "CHEGADA" | "MENSALISTA" | "SCORE";

function normalizar(t: string): string {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

// jogador.telefone só vem real (não mascarado) pra admin — mesma regra do
// site (JogadorDoGrupo em weracha-site/lib/services/membros.ts). O wa.me
// precisa do E.164 sem "+", daí o "55" fixo na frente (espelha
// weracha-site/app/grupos/[id]/jogadores/page.tsx).
function linkWhatsapp(telefone: string): string {
  return `https://wa.me/55${telefone.replace(/\D/g, "")}`;
}

export default function GerenciarJogadores() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { chamarApi } = useSessao();
  const { avisar, confirmar } = useDialogos();
  const insets = useSafeAreaInsets();

  const [dados, setDados] = useState<DadosDaTelaJogadoresDoGrupo | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [busca, setBusca] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("NOME");
  const [verScores, setVerScores] = useState(true);

  const [menu, setMenu] = useState<{ titulo: string; itens: ItemMenu[] } | null>(null);
  const [perfilId, setPerfilId] = useState<string | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [transferindo, setTransferindo] = useState(false);
  const [transfSelId, setTransfSelId] = useState<string | null>(null);
  const [transfSalvando, setTransfSalvando] = useState(false);
  const [transfErro, setTransfErro] = useState<string | null>(null);

  const [scoreDe, setScoreDe] = useState<{ jogadorId: string; nome: string; score: number } | null>(null);
  const [posicaoDe, setPosicaoDe] = useState<
    { jogadorId: string; nome: string; posicaoId: string | null } | null
  >(null);
  const [salvandoModal, setSalvandoModal] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const [removendoJogador, setRemovendoJogador] = useState<JogadorDoGrupo | null>(null);
  const [removendoOcupado, setRemovendoOcupado] = useState(false);
  const [removendoErro, setRemovendoErro] = useState<string | null>(null);

  const carregar = useCallback(
    () => buscarElencoDoGrupo(chamarApi, id),
    [chamarApi, id]
  );

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const d = await carregar();
        if (vivo) {
          setDados(d);
          setErro(null);
        }
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregar, tentativa]);

  const recarregar = useCallback(async () => {
    try {
      setDados(await carregar());
    } catch {
      // mantém
    }
  }, [carregar]);

  async function acao(fn: () => Promise<unknown>) {
    try {
      await fn();
      await recarregar();
    } catch (e) {
      avisar("Não deu certo", mensagemDoErro(e));
    }
  }

  const grupo = dados?.grupo;
  const souAdmin = grupo?.meuPapel === "ADMIN";
  const souDono = !!grupo && !!dados && grupo.adminId === dados.meuId;
  const posicoesPorId = useMemo(
    () => new Map((dados?.posicoes ?? []).map((p) => [p.id, p.nome])),
    [dados?.posicoes]
  );
  const jogadoresPorId = useMemo(
    () => new Map((dados?.jogadores ?? []).map((j) => [j.id, j])),
    [dados?.jogadores]
  );

  const linhas = useMemo(() => {
    if (!dados) return [];
    const ordenados = [...dados.membros].sort((a, b) => {
      const na = jogadoresPorId.get(a.jogadorId)?.nome ?? "";
      const nb = jogadoresPorId.get(b.jogadorId)?.nome ?? "";
      if (ordenacao === "CHEGADA") {
        const ca = new Date(a.criadoEm).getTime();
        const cb = new Date(b.criadoEm).getTime();
        if (ca !== cb) return cb - ca;
      } else if (ordenacao === "MENSALISTA") {
        const ma = ehMensalistaHoje(a);
        const mb = ehMensalistaHoje(b);
        if (ma !== mb) return ma ? -1 : 1;
      } else if (ordenacao === "SCORE" && a.score !== b.score) {
        return b.score - a.score;
      }
      return na.localeCompare(nb, "pt-BR");
    });
    const q = normalizar(busca);
    if (!q) return ordenados;
    return ordenados.filter((m) => {
      const j = jogadoresPorId.get(m.jogadorId);
      return (
        j &&
        (normalizar(j.nome).includes(q) || (j.apelido && normalizar(j.apelido).includes(q)))
      );
    });
  }, [dados, jogadoresPorId, ordenacao, busca]);

  function abrirMenuJogador(m: MembroGrupo, j: JogadorDoGrupo) {
    const ehDono = j.id === grupo!.adminId;
    const itens: ItemMenu[] = [];
    itens.push(
      {
        rotulo: "Editar score",
        Icone: Pencil,
        onPress: () => setScoreDe({ jogadorId: j.id, nome: j.nome, score: m.score }),
      },
      {
        rotulo: "Editar posição",
        Icone: Pencil,
        onPress: () =>
          setPosicaoDe({ jogadorId: j.id, nome: j.nome, posicaoId: m.posicaoId }),
      }
    );
    if (j.id !== dados!.meuId && j.telefone) {
      itens.push({
        rotulo: "Chamar no WhatsApp",
        Icone: MessageCircle,
        onPress: () => void Linking.openURL(linkWhatsapp(j.telefone)),
      });
    }
    if (j.id === dados!.meuId && ehDono) {
      itens.push({
        rotulo: "Mudar de dono",
        Icone: Crown,
        onPress: () => setTransferindo(true),
      });
    }
    if (!ehDono && souDono) {
      if (m.papel === "ADMIN") {
        itens.push({
          rotulo: "Remover admin",
          Icone: ShieldOff,
          onPress: () => void acao(() => definirPapel(chamarApi, id, j.id, "MEMBRO")),
        });
      } else if (!j.exclusaoPendente) {
        itens.push({
          rotulo: "Tornar admin",
          Icone: ShieldCheck,
          onPress: () => void acao(() => definirPapel(chamarApi, id, j.id, "ADMIN")),
        });
      }
    }
    if (j.id === dados!.meuId && m.papel === "ADMIN" && !ehDono) {
      itens.push({
        rotulo: "Deixar o cargo de admin",
        Icone: ShieldOff,
        onPress: () => void acao(() => deixarCargoAdmin(chamarApi, id)),
      });
    }
    if (!ehDono) {
      itens.push({
        rotulo: "Remover jogador",
        Icone: Trash2,
        destrutivo: true,
        onPress: () => confirmarRemover(j),
      });
    }
    setMenu({ titulo: j.nome, itens });
  }

  function confirmarRemover(j: JogadorDoGrupo) {
    setRemovendoErro(null);
    setRemovendoJogador(j);
  }

  async function handleRemoverJogador() {
    if (!removendoJogador) return;
    setRemovendoOcupado(true);
    setRemovendoErro(null);
    try {
      await removerJogador(chamarApi, id, removendoJogador.id);
      const euMesmo = removendoJogador.id === dados!.meuId;
      setRemovendoJogador(null);
      if (euMesmo) {
        router.replace("/painel");
        return;
      }
      await recarregar();
    } catch (e) {
      setRemovendoErro(mensagemDoErro(e));
    } finally {
      setRemovendoOcupado(false);
    }
  }

  function confirmarMensalista(m: MembroGrupo, j: JogadorDoGrupo) {
    const ativar = !ehMensalistaHoje(m);
    confirmar({
      eyebrow: "Mensalista",
      titulo: ativar ? `Tornar ${j.nome} mensalista?` : `Tornar ${j.nome} avulso?`,
      descricao: ativar
        ? "Passa a ser cobrado como mensalista nas próximas partidas."
        : "Passa a ser cobrado como avulso nas próximas partidas.",
      onConfirmar: () => void acao(() => definirMensalista(chamarApi, id, j.id, ativar)),
    });
  }

  async function salvarScore(valor: number) {
    if (!scoreDe) return;
    setSalvandoModal(true);
    setErroModal(null);
    try {
      await definirScore(chamarApi, id, scoreDe.jogadorId, valor);
      setScoreDe(null);
      await recarregar();
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
      setPosicaoDe(null);
      await recarregar();
    } catch (e) {
      setErroModal(mensagemDoErro(e));
    } finally {
      setSalvandoModal(false);
    }
  }

  async function confirmarTransferencia(novoDonoId: string) {
    setTransfSalvando(true);
    setTransfErro(null);
    try {
      await transferirDono(chamarApi, id, novoDonoId);
      setTransferindo(false);
      setTransfSelId(null);
      await recarregar();
    } catch (e) {
      setTransfErro(mensagemDoErro(e));
    } finally {
      setTransfSalvando(false);
    }
  }

  const voltar = <Navbar voltar="Grupo" />;

  if (erro && !dados) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }
  if (!dados || !grupo) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        {voltar}
        {dados && !grupo ? (
          <View style={styles.centro}>
            <Text style={styles.aviso}>Grupo não encontrado.</Text>
          </View>
        ) : (
          <TelaCarregando mensagem="Carregando jogadores..." />
        )}
      </SafeAreaView>
    );
  }

  const podeVerScore = souAdmin && verScores;
  const candidatosDono = dados.membros
    .filter((m) => m.jogadorId !== dados.meuId && m.papel === "ADMIN")
    .map((m) => jogadoresPorId.get(m.jogadorId))
    .filter((j): j is JogadorDoGrupo => !!j && !j.exclusaoPendente);

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      {voltar}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cabecalho}>
          <View style={styles.tituloLinha}>
            <UserCog size={18} color={cores.branco} />
            <Text style={styles.h1}>{souAdmin ? "Gerenciar jogadores" : "Jogadores do grupo"}</Text>
          </View>
          <View style={styles.subLinha}>
            <Users size={12} color={cores.slate400} />
            <Text style={styles.subNome} numberOfLines={1}>
              {grupo.nome}
            </Text>
            <Text style={styles.subPonto}>·</Text>
            <Star size={12} color={cores.slate400} />
            <Text style={styles.sub}>Seu score {grupo.meuScore}</Text>
          </View>
        </View>

        <TextInput
          style={styles.busca}
          value={busca}
          onChangeText={setBusca}
          placeholder="Buscar por nome ou apelido"
          placeholderTextColor={cores.slate500}
        />

        <View style={styles.controles}>
          <Text style={styles.contagem}>Jogadores ({linhas.length})</Text>
          <View style={styles.controlesDireita}>
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
            {souAdmin && (
              <>
                <Text style={styles.scoreRotulo}>Score:</Text>
                <Pressable
                  accessibilityLabel={
                    verScores ? "Ocultar score dos jogadores" : "Mostrar score dos jogadores"
                  }
                  style={[styles.verScore, verScores && styles.verScoreAtivo]}
                  onPress={() => setVerScores((v) => !v)}
                >
                  {verScores ? (
                    <Eye size={16} color={cores.dark} />
                  ) : (
                    <EyeOff size={16} color={cores.slate400} />
                  )}
                </Pressable>
              </>
            )}
          </View>
        </View>

        {linhas.length === 0 && <Text style={styles.sub}>Nenhum jogador encontrado.</Text>}

        {linhas.map((m) => {
          const j = jogadoresPorId.get(m.jogadorId);
          if (!j) return null;
          const mensalista = ehMensalistaHoje(m);
          const ehDono = j.id === grupo.adminId;
          const eu = j.id === dados.meuId;
          const detalhes: ReactNode[] = [];
          if (j.apelido) {
            detalhes.push(<Text style={styles.linhaDetalhesTexto}>{j.apelido}</Text>);
          }
          const nomePosicao = m.posicaoId ? posicoesPorId.get(m.posicaoId) : null;
          if (nomePosicao) {
            detalhes.push(
              <View style={styles.linhaDetalhesItem}>
                <Shield size={11} color={cores.slate400} />
                <Text style={styles.linhaDetalhesTexto}>{nomePosicao}</Text>
              </View>
            );
          }
          if (podeVerScore) {
            detalhes.push(
              <View style={styles.linhaDetalhesItem}>
                <Star size={11} color={cores.slate400} />
                <Text style={styles.linhaDetalhesTexto}>Score {m.score}</Text>
              </View>
            );
          }
          return (
            <View key={m.id} style={[styles.linha, eu && styles.linhaEu]}>
              <Pressable style={styles.linhaEsq} onPress={() => setPerfilId(j.id)}>
                <AvatarJogador id={j.id} nome={j.nome} fotoUrl={j.fotoUrl} tamanho={40} />
                <View style={styles.linhaNomes}>
                  <View style={styles.linhaNomeTopo}>
                    <Text style={styles.linhaNome} numberOfLines={1}>
                      {j.nome}
                    </Text>
                    {(ehDono || m.papel === "ADMIN") && (
                      <View style={styles.badge}>
                        <Text style={styles.badgeTexto}>{ehDono ? "Dono" : "Admin"}</Text>
                      </View>
                    )}
                  </View>
                  {detalhes.length > 0 && (
                    <View style={styles.linhaDetalhes}>
                      {detalhes.map((item, i) => (
                        <View key={i} style={styles.linhaDetalhesItem}>
                          {i > 0 && <Text style={styles.linhaDetalhesSeparador}>·</Text>}
                          {item}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Pressable>
              <View style={styles.linhaAcoes}>
                <Pressable
                  style={[styles.mensalPill, mensalista && styles.mensalPillAtiva]}
                  onPress={() => souAdmin && confirmarMensalista(m, j)}
                  disabled={!souAdmin}
                >
                  <Text style={[styles.mensalTexto, mensalista && styles.mensalTextoAtivo]}>
                    {mensalista ? "MENSAL" : "AVULSO"}
                  </Text>
                </Pressable>
                {souAdmin && (
                  <Pressable hitSlop={8} onPress={() => abrirMenuJogador(m, j)}>
                    <Text style={styles.menuPonto}>⋯</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {linhas.length > 0 && (
          <Text style={styles.rodapeNota}>O score só aparece pra admin do grupo.</Text>
        )}
      </ScrollView>

      <View style={[styles.rodape, { paddingBottom: 14 + insets.bottom }]}>
        {souAdmin && (
          <Pressable style={styles.novoBtn} onPress={() => setFormAberto(true)}>
            <Text style={styles.novoBtnTexto}>Novo jogador</Text>
          </Pressable>
        )}
      </View>

      <MenuAcoes
        aberto={menu !== null}
        titulo={menu?.titulo}
        itens={menu?.itens ?? []}
        onFechar={() => setMenu(null)}
      />

      <ModalPerfil
        key={perfilId ?? "sem-perfil"}
        aberto={perfilId !== null}
        chamarApi={chamarApi}
        grupoId={id}
        jogadorId={perfilId}
        onFechar={() => setPerfilId(null)}
      />

      {scoreDe && (
        <ModalScore
          aberto
          nome={scoreDe.nome}
          scoreAtual={scoreDe.score}
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
          posicoes={dados.posicoes}
          salvando={salvandoModal}
          erro={erroModal}
          onSalvar={(p) => void salvarPosicao(p)}
          onFechar={() => {
            setPosicaoDe(null);
            setErroModal(null);
          }}
        />
      )}

      <ModalTransferirDono
        aberto={transferindo}
        candidatos={candidatosDono}
        selId={transfSelId}
        onSelId={setTransfSelId}
        salvando={transfSalvando}
        erro={transfErro}
        onConfirmar={(novo) => void confirmarTransferencia(novo)}
        onFechar={() => {
          setTransferindo(false);
          setTransfErro(null);
          setTransfSelId(null);
        }}
      />

      <ModalConfirmar
        aberto={removendoJogador !== null}
        Icone={Trash2}
        eyebrow="Ação irreversível"
        titulo="Remover jogador?"
        descricao="O jogador sai do grupo: perde acesso e, se for admin, deixa de ser. Essa ação não pode ser desfeita por aqui."
        confirmarLabel="Sim, remover"
        destrutivo
        ocupado={removendoOcupado}
        erro={removendoErro}
        onConfirmar={() => void handleRemoverJogador()}
        onFechar={() => {
          setRemovendoJogador(null);
          setRemovendoErro(null);
        }}
      />

      <FormNovoJogador
        aberto={formAberto}
        chamarApi={chamarApi}
        grupoId={id}
        esporte={grupo.esporte}
        onFechar={() => setFormAberto(false)}
        onAdicionado={async () => {
          setFormAberto(false);
          await recarregar();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  aviso: { fontSize: 14, color: cores.slate400 },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 12 },
  cabecalho: { gap: 4 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  h1: { fontSize: 23, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  subNome: { flexShrink: 1, fontSize: 13, color: cores.slate400 },
  subPonto: { fontSize: 13, color: cores.slate600 },
  sub: { fontSize: 13, color: cores.slate400 },
  busca: {
    height: 44,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 14,
    fontSize: 15,
    color: cores.branco,
  },
  controles: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  controlesDireita: { flexDirection: "row", alignItems: "center", gap: 8 },
  scoreRotulo: { fontSize: 13, fontWeight: "500", color: cores.slate300 },
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
  contagem: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  linha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 10,
  },
  linhaEu: { borderColor: cores.teal },
  linhaEsq: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  linhaNomes: { flex: 1 },
  linhaNomeTopo: { flexDirection: "row", alignItems: "center", gap: 6 },
  linhaNome: { fontSize: 15, fontWeight: "600", color: cores.branco, flexShrink: 1 },
  badge: {
    backgroundColor: cores.avisoFundo,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeTexto: { fontSize: 10, fontWeight: "700", color: cores.teal },
  linhaDetalhes: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginTop: 2, gap: 4 },
  linhaDetalhesItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  linhaDetalhesTexto: { fontSize: 12, color: cores.slate400 },
  linhaDetalhesSeparador: { fontSize: 12, color: cores.slate400 },
  linhaAcoes: { flexDirection: "row", alignItems: "center", gap: 6 },
  mensalPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mensalPillAtiva: { backgroundColor: cores.tealDark, borderColor: cores.tealDark },
  mensalTexto: { fontSize: 10, fontWeight: "700", color: cores.slate400 },
  mensalTextoAtivo: { color: cores.branco },
  menuPonto: { fontSize: 20, color: cores.slate400, paddingHorizontal: 4 },
  rodapeNota: { fontSize: 11, color: cores.slate500, textAlign: "center", marginTop: 4 },
  rodape: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: cores.cardBorda,
    backgroundColor: cores.dark,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  novoBtn: {
    height: 50,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  novoBtnTexto: { fontSize: 15, fontWeight: "700", color: cores.dark },
});
