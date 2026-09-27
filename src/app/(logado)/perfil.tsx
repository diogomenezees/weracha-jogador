import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { buscarStatusExclusao, cancelarExclusao } from "@/api/conta";
import { listarMeusGrupos } from "@/api/grupos";
import {
  definirApelido,
  definirDataNascimento,
  definirEmail,
  definirNome,
} from "@/api/perfil";
import { definirPosicao, definirScore, listarPosicoes } from "@/api/jogadores";
import { formatarTelefoneBR } from "@/contrato/telefone";
import { meuPapelNoGrupo, proximaPartida } from "@/grupos";
import { mensagemDoErro } from "@/mensagens-erro";
import { scoreCongelado } from "@/partidas";
import { BotaoLaranja, TelaCarregando, TelaErro } from "@/painel/ui";
import { MenuAcoes } from "@/grupo/MenuAcoes";
import { Stepper } from "@/partida/ui";
import { FotoPerfil } from "@/perfil/FotoPerfil";
import { CampoDataNascimento, CampoLeitura, CampoTexto, Checkbox } from "@/perfil/ui";
import { ModalExcluirConta, ModalTrocarSenha } from "@/perfil/modais";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { Check, ChevronDown, ChevronRight, CircleUserRound, Lock, Pencil, Users } from "@/ui/Icone";
import { Navbar } from "@/ui/Navbar";
import { SeloPapel } from "@/ui/SeloPapel";
import { ScrollTeclado } from "@/ui/ScrollTeclado";
import type { Grupo, PosicaoEsporte } from "@/contrato/tipos";

export default function Perfil() {
  const { estado, chamarApi, urlBase, recarregarPerfil } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;
  const insets = useSafeAreaInsets();

  const [nome, setNome] = useState("");
  const [apelido, setApelido] = useState("");
  const [email, setEmail] = useState("");
  const [receberNotif, setReceberNotif] = useState(false);
  const [dataNascimento, setDataNascimento] = useState<string | null>(null);

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [posicoesPorEsporte, setPosicoesPorEsporte] = useState<Record<string, PosicaoEsporte[]>>({});
  const [exclusaoPendenteEm, setExclusaoPendenteEm] = useState<string | null>(null);

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [reativando, setReativando] = useState(false);

  const [modalSenha, setModalSenha] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [senhaTrocada, setSenhaTrocada] = useState(false);
  // Grupos: igual ao site, "Score: N" abre a edição dentro do card e as mudanças
  // de score/posição ficam pendentes até o Salvar do rodapé (junto do resto do perfil).
  const [grupoAberto, setGrupoAberto] = useState<string | null>(null);
  const [edicoesScore, setEdicoesScore] = useState<Record<string, number>>({});
  const [edicoesPosicao, setEdicoesPosicao] = useState<Record<string, string | null>>({});
  const [posicaoMenuDe, setPosicaoMenuDe] = useState<Grupo | null>(null);

  const preencher = useCallback((p: {
    nome: string;
    apelido: string | null;
    email: string | null;
    emailNotificacoes: boolean;
    dataNascimento: string | null;
  }) => {
    setNome(p.nome);
    setApelido(p.apelido ?? "");
    setEmail(p.email ?? "");
    setReceberNotif(p.emailNotificacoes);
    setDataNascimento(p.dataNascimento);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [perfil, status, lista] = await Promise.all([
          recarregarPerfil(),
          buscarStatusExclusao(chamarApi),
          listarMeusGrupos(chamarApi),
        ]);
        if (!vivo) return;
        preencher(perfil);
        setExclusaoPendenteEm(status.solicitacaoPendente?.criadoEm ?? null);
        setGrupos(lista);

        const esportes = [...new Set(lista.map((g) => g.esporte))];
        const listas = await Promise.all(esportes.map((e) => listarPosicoes(chamarApi, e)));
        if (!vivo) return;
        setPosicoesPorEsporte(Object.fromEntries(esportes.map((e, i) => [e, listas[i]])));
      } catch (e) {
        if (vivo) setErro(mensagemDoErro(e));
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [chamarApi, recarregarPerfil, preencher, tentativa]);

  if (!jogador) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaCarregando mensagem="Carregando perfil..." />
      </SafeAreaView>
    );
  }
  if (erro) {
    return (
      <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
        <Navbar voltar="Painel" />
        <TelaErro mensagem={erro} onTentar={() => setTentativa((t) => t + 1)} />
      </SafeAreaView>
    );
  }

  const exclusaoPendente = exclusaoPendenteEm !== null;
  const nomeVazio = nome.trim() === "";
  const gruposComScoreAlterado = grupos.filter(
    (g) => edicoesScore[g.id] !== undefined && edicoesScore[g.id] !== g.meuScore
  );
  const gruposComPosicaoAlterada = grupos.filter(
    (g) => edicoesPosicao[g.id] !== undefined && edicoesPosicao[g.id] !== g.meuPosicaoId
  );
  const sujo =
    gruposComScoreAlterado.length > 0 ||
    gruposComPosicaoAlterada.length > 0 ||
    nome.trim() !== jogador.nome ||
    (apelido.trim() || null) !== (jogador.apelido ?? null) ||
    (email.trim() || null) !== (jogador.email ?? null) ||
    receberNotif !== jogador.emailNotificacoes ||
    (dataNascimento ?? null) !== (jogador.dataNascimento ?? null);

  async function salvar() {
    if (nomeVazio) return;
    setSalvando(true);
    setErroSalvar(null);
    const novoNome = nome.trim();
    const novoApelido = apelido.trim() || null;
    const novoEmail = email.trim() || null;
    try {
      if (novoNome !== jogador!.nome) await definirNome(chamarApi, novoNome);
      if (novoApelido !== (jogador!.apelido ?? null)) await definirApelido(chamarApi, novoApelido);
      if (
        novoEmail !== (jogador!.email ?? null) ||
        receberNotif !== jogador!.emailNotificacoes
      ) {
        await definirEmail(chamarApi, novoEmail, receberNotif);
      }
      if ((dataNascimento ?? null) !== (jogador!.dataNascimento ?? null)) {
        await definirDataNascimento(chamarApi, dataNascimento);
      }
      for (const g of gruposComPosicaoAlterada) {
        await definirPosicao(chamarApi, g.id, jogador!.id, edicoesPosicao[g.id]!);
      }
      await Promise.all(
        gruposComScoreAlterado.map((g) => definirScore(chamarApi, g.id, jogador!.id, edicoesScore[g.id]!))
      );
      if (gruposComScoreAlterado.length > 0 || gruposComPosicaoAlterada.length > 0) {
        setGrupos((gs) =>
          gs.map((g) => ({
            ...g,
            ...(edicoesScore[g.id] !== undefined
              ? {
                  meuScore: edicoesScore[g.id]!,
                  meuScoreOrigem: g.meuPapel === "ADMIN" ? "ADMIN" : "AUTOAVALIACAO",
                }
              : {}),
            ...(edicoesPosicao[g.id] !== undefined ? { meuPosicaoId: edicoesPosicao[g.id]! } : {}),
          }))
        );
        setEdicoesScore({});
        setEdicoesPosicao({});
        setGrupoAberto(null);
      }
      const atualizado = await recarregarPerfil();
      preencher(atualizado);
    } catch (e) {
      setErroSalvar(mensagemDoErro(e));
    } finally {
      setSalvando(false);
    }
  }

  async function reativar() {
    setReativando(true);
    try {
      await cancelarExclusao(chamarApi);
      setExclusaoPendenteEm(null);
    } catch (e) {
      setErroSalvar(mensagemDoErro(e));
    } finally {
      setReativando(false);
    }
  }

  function posicaoDoGrupo(g: Grupo): string | null {
    return edicoesPosicao[g.id] !== undefined ? edicoesPosicao[g.id]! : g.meuPosicaoId;
  }

  function nomeDaPosicao(g: Grupo): string {
    const lista = posicoesPorEsporte[g.esporte] ?? [];
    return lista.find((p) => p.id === posicaoDoGrupo(g))?.nome ?? "Nenhuma";
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />

      {carregando ? (
        <TelaCarregando mensagem="Carregando perfil..." />
      ) : (
        <ScrollTeclado
          contentContainerStyle={[styles.scroll, { paddingBottom: (sujo ? 130 : 24) + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tituloLinha}>
            <CircleUserRound size={20} color={cores.branco} />
            <Text style={styles.h1}>Seu Perfil</Text>
          </View>

          {exclusaoPendente && (
            <View style={styles.bannerExclusao}>
              <Text style={styles.bannerTitulo}>Conta marcada para exclusão</Text>
              <Text style={styles.bannerTexto}>
                Pedido feito em {new Date(exclusaoPendenteEm!).toLocaleDateString("pt-BR")}.
                Enquanto não for atendido, dá pra voltar atrás.
              </Text>
              <Pressable
                style={styles.bannerBotao}
                onPress={() => void reativar()}
                disabled={reativando}
              >
                <Text style={styles.bannerBotaoTexto}>
                  {reativando ? "Reativando..." : "Reativar minha conta"}
                </Text>
              </Pressable>
            </View>
          )}

          <FotoPerfil
            jogadorId={jogador.id}
            nome={jogador.nome}
            fotoUrl={jogador.fotoUrl}
            chamarApi={chamarApi}
            onAtualizada={() => void recarregarPerfil()}
          />

          <View style={styles.card}>
            <CampoLeitura
              rotulo="Telefone"
              valor={formatarTelefoneBR(jogador.telefone)}
              nota="Não pode ser alterado por aqui."
            />
            <CampoTexto
              rotulo="Nome"
              valor={nome}
              onChangeText={setNome}
              erro={nomeVazio ? "O nome não pode ficar em branco." : null}
            />
            <CampoTexto
              rotulo="Apelido"
              valor={apelido}
              onChangeText={setApelido}
              placeholder="Opcional"
            />
            <CampoDataNascimento iso={dataNascimento} onChange={setDataNascimento} />
            <CampoTexto
              rotulo="E-mail"
              valor={email}
              onChangeText={(t) => {
                setEmail(t);
                if (!t.trim()) setReceberNotif(false);
              }}
              placeholder="Opcional"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Checkbox
              marcado={receberNotif}
              onToggle={() => setReceberNotif((v) => !v)}
              desabilitado={!email.trim()}
              rotulo="Quero receber novidades e avisos do WeRacha por e-mail"
            />

            <View style={styles.senhaBloco}>
              <Text style={styles.senhaRotulo}>Senha</Text>
              <Text style={styles.senhaValor}>••••••••</Text>
              <View style={styles.senhaAcoes}>
                <Pressable
                  hitSlop={6}
                  onPress={() => {
                    setSenhaTrocada(false);
                    setModalSenha(true);
                  }}
                >
                  <Text style={styles.link}>Trocar senha</Text>
                </Pressable>
                {senhaTrocada && <Text style={styles.ok}>Senha atualizada.</Text>}
                {!exclusaoPendente && (
                  <Pressable hitSlop={6} onPress={() => setModalExcluir(true)} style={styles.excluirBotao}>
                    <Text style={styles.excluirTexto}>Excluir meus dados</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {grupos.length > 0 && (
            <View style={styles.grupos}>
              <Text style={styles.secaoRotulo}>Grupos</Text>
              <Text style={styles.secaoSub}>
                Os grupos dos quais você faz parte, com o seu score em cada um.
              </Text>
              {grupos.map((g) => {
                const prox = proximaPartida(g);
                const souAdmin = g.meuPapel === "ADMIN";
                const congelado = !souAdmin && scoreCongelado(prox ? new Date(prox.data) : null);
                const editando = grupoAberto === g.id && !congelado;
                const valor = edicoesScore[g.id] ?? g.meuScore;
                const avisoOrigem =
                  !congelado &&
                  !editando &&
                  g.meuScoreOrigem !== "AUTOAVALIACAO" &&
                  !(souAdmin && g.meuScoreOrigem === "ADMIN")
                    ? g.meuScoreOrigem === "ADMIN"
                      ? "Esse valor foi definido por um admin do grupo. Pode ajustar como quiser."
                      : "Esse é o valor padrão desse grupo. Pode mudar como quiser."
                    : null;
                return (
                  <View key={g.id} style={styles.grupoCard}>
                    <View style={styles.grupoLinha}>
                      <Pressable
                        style={({ pressed }) => [styles.grupoLink, pressed && styles.pressionado]}
                        onPress={() => router.push(`/grupos/${g.id}`)}
                      >
                        <View style={styles.grupoInfo}>
                          <View style={styles.grupoNomeLinha}>
                            <Users size={14} color={cores.slate400} style={styles.grupoIcone} />
                            <Text style={styles.grupoNome} numberOfLines={1}>
                              {g.nome}
                            </Text>
                            <SeloPapel papel={meuPapelNoGrupo(g, jogador.id)} />
                          </View>
                          <Text style={styles.grupoEsporte}>{g.esporte}</Text>
                        </View>
                        <ChevronRight size={20} color={cores.slate500} />
                      </Pressable>
                      {congelado ? (
                        <View style={styles.score}>
                          <Text style={styles.scoreTravado}>Score: {valor}</Text>
                          <Lock size={13} color={cores.slate500} />
                        </View>
                      ) : (
                        <Pressable
                          hitSlop={8}
                          style={({ pressed }) => [styles.score, pressed && styles.pressionado]}
                          onPress={() => setGrupoAberto(editando ? null : g.id)}
                          accessibilityRole="button"
                          accessibilityState={{ expanded: editando }}
                          accessibilityLabel={`Editar score no grupo ${g.nome}`}
                        >
                          <Text style={styles.scoreTexto}>Score: {valor}</Text>
                          <Pencil size={14} color={cores.teal} />
                        </Pressable>
                      )}
                    </View>
                    {congelado && (
                      <Text style={styles.grupoNota}>Foi congelado porque a partida já vai começar.</Text>
                    )}
                    {avisoOrigem && <Text style={styles.grupoNota}>{avisoOrigem}</Text>}
                    {editando && (
                      <>
                        <View style={styles.grupoEdicao}>
                          <Text style={styles.grupoEdicaoRotulo}>Seu score nesse grupo</Text>
                          <Stepper
                            valor={valor}
                            min={0}
                            max={100}
                            onChange={(v) => setEdicoesScore((e) => ({ ...e, [g.id]: v }))}
                          />
                        </View>
                        <View style={styles.grupoEdicao}>
                          <Text style={styles.grupoEdicaoRotulo}>Sua posição nesse grupo</Text>
                          <Pressable
                            style={styles.seletor}
                            onPress={() => setPosicaoMenuDe(g)}
                            accessibilityRole="button"
                            accessibilityLabel={`Posição no grupo ${g.nome}`}
                          >
                            <Text style={styles.seletorTexto} numberOfLines={1}>
                              {nomeDaPosicao(g)}
                            </Text>
                            <ChevronDown size={16} color={cores.slate400} />
                          </Pressable>
                        </View>
                      </>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollTeclado>
      )}

      {/* Rodapé só com o Salvar, quando há alteração: o voltar pro Painel já fica na navbar. */}
      {sujo && (
        <View style={[styles.rodape, { paddingBottom: 12 + insets.bottom }]}>
          {erroSalvar && <Text style={styles.rodapeErro}>{erroSalvar}</Text>}
          <BotaoLaranja
            titulo={salvando ? "Salvando..." : "Salvar"}
            onPress={() => void salvar()}
            carregando={salvando}
          />
        </View>
      )}

      {modalSenha && (
        <ModalTrocarSenha
          telefone={jogador.telefone ?? ""}
          urlBase={urlBase}
          onFechar={() => setModalSenha(false)}
          onSucesso={() => setSenhaTrocada(true)}
        />
      )}
      {modalExcluir && (
        <ModalExcluirConta
          chamarApi={chamarApi}
          onFechar={() => setModalExcluir(false)}
          onSolicitado={() => setExclusaoPendenteEm(new Date().toISOString())}
        />
      )}
      <MenuAcoes
        aberto={posicaoMenuDe !== null}
        titulo={posicaoMenuDe ? `Sua posição em ${posicaoMenuDe.nome}` : undefined}
        onFechar={() => setPosicaoMenuDe(null)}
        itens={
          posicaoMenuDe
            ? [
                { id: null, nome: "Nenhuma" },
                ...(posicoesPorEsporte[posicaoMenuDe.esporte] ?? []),
              ].map((p) => ({
                rotulo: p.nome,
                Icone: posicaoDoGrupo(posicaoMenuDe) === p.id ? Check : undefined,
                cor: posicaoDoGrupo(posicaoMenuDe) === p.id ? cores.teal : undefined,
                onPress: () => setEdicoesPosicao((e) => ({ ...e, [posicaoMenuDe.id]: p.id })),
              }))
            : []
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 16, paddingTop: 8, gap: 18 },
  // Igual ao h1 do site (app/perfil/page.tsx): ícone de usuário + "Seu Perfil".
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },

  bannerExclusao: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
    padding: 14,
    gap: 8,
  },
  bannerTitulo: { fontSize: 14, fontWeight: "700", color: cores.erroTexto },
  bannerTexto: { fontSize: 13, lineHeight: 19, color: cores.slate300 },
  bannerBotao: {
    alignSelf: "flex-start",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.erroBorda,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerBotaoTexto: { fontSize: 13, fontWeight: "600", color: cores.erroTexto },

  card: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 14,
  },
  senhaBloco: { paddingTop: 10, gap: 2 },
  senhaRotulo: { fontSize: 12, color: cores.slate500 },
  senhaValor: { fontSize: 16, color: cores.branco, letterSpacing: 2 },
  senhaAcoes: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6, flexWrap: "wrap" },
  link: { fontSize: 13, color: cores.teal },
  ok: { fontSize: 12, color: cores.teal },
  excluirBotao: { marginLeft: "auto" },
  excluirTexto: { fontSize: 12, color: cores.slate400, textDecorationLine: "underline" },

  grupos: { gap: 8 },
  secaoRotulo: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: cores.teal,
    textTransform: "uppercase",
  },
  secaoSub: { fontSize: 13, color: cores.slate400 },
  // Card do grupo espelhando o do site (app/perfil/page.tsx): linha compacta com
  // nome + papel + esporte à esquerda e "Score: N ✎" à direita; o resto
  // (avisos, edição) vem em faixas separadas por uma linha teal suave.
  grupoCard: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  grupoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  grupoLink: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 12 },
  pressionado: { opacity: 0.7 },
  grupoInfo: { flex: 1, minWidth: 0 },
  grupoNomeLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Ícone mais colado no nome (4px) que o gap da linha (8px, que separa nome e selo).
  grupoIcone: { marginRight: -4 },
  grupoNome: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: cores.branco },
  grupoEsporte: { fontSize: 14, color: cores.slate400, textTransform: "capitalize" },
  score: { flexDirection: "row", alignItems: "center", gap: 5 },
  scoreTexto: { fontSize: 14, fontWeight: "600", color: cores.teal },
  scoreTravado: { fontSize: 14, color: cores.slate500 },
  grupoNota: {
    fontSize: 12,
    color: cores.slate500,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,179,163,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  grupoEdicao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(31,179,163,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  grupoEdicaoRotulo: { flexShrink: 1, fontSize: 14, color: cores.slate400 },
  seletor: {
    maxWidth: "55%",
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 10,
  },
  seletorTexto: { flexShrink: 1, fontSize: 14, color: cores.branco },

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
  rodapeErro: { fontSize: 12, color: cores.erroTexto, textAlign: "center" },
});
