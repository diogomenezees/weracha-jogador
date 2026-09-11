import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
import { proximaPartida } from "@/grupos";
import { mensagemDoErro } from "@/mensagens-erro";
import { scoreCongelado } from "@/partidas";
import { BotaoLaranja, TelaCarregando, TelaErro } from "@/painel/ui";
import { ModalPosicao, ModalScore } from "@/jogadores/modais";
import { FotoPerfil } from "@/perfil/FotoPerfil";
import { CampoDataNascimento, CampoLeitura, CampoTexto, Checkbox } from "@/perfil/ui";
import { ModalExcluirConta, ModalTrocarSenha } from "@/perfil/modais";
import { useSessao } from "@/sessao/contexto";
import { cores, raio } from "@/tema";
import { Navbar } from "@/ui/Navbar";
import type { Grupo, PosicaoEsporte } from "@/contrato/tipos";

export default function Perfil() {
  const { estado, chamarApi, urlBase, recarregarPerfil } = useSessao();
  const jogador = estado.fase === "logado" ? estado.jogador : null;

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
  const [scoreDe, setScoreDe] = useState<Grupo | null>(null);
  const [posicaoDe, setPosicaoDe] = useState<Grupo | null>(null);
  const [salvandoGrupo, setSalvandoGrupo] = useState(false);
  const [erroGrupo, setErroGrupo] = useState<string | null>(null);

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
  const sujo =
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

  async function salvarScore(score: number) {
    if (!scoreDe) return;
    setSalvandoGrupo(true);
    setErroGrupo(null);
    try {
      await definirScore(chamarApi, scoreDe.id, jogador!.id, score);
      setGrupos((gs) => gs.map((g) => (g.id === scoreDe.id ? { ...g, meuScore: score } : g)));
      setScoreDe(null);
    } catch (e) {
      setErroGrupo(mensagemDoErro(e));
    } finally {
      setSalvandoGrupo(false);
    }
  }

  async function salvarPosicao(posicaoId: string | null) {
    if (!posicaoDe) return;
    setSalvandoGrupo(true);
    setErroGrupo(null);
    try {
      await definirPosicao(chamarApi, posicaoDe.id, jogador!.id, posicaoId);
      setGrupos((gs) =>
        gs.map((g) => (g.id === posicaoDe.id ? { ...g, meuPosicaoId: posicaoId } : g))
      );
      setPosicaoDe(null);
    } catch (e) {
      setErroGrupo(mensagemDoErro(e));
    } finally {
      setSalvandoGrupo(false);
    }
  }

  function nomeDaPosicao(g: Grupo): string {
    const lista = posicoesPorEsporte[g.esporte] ?? [];
    return lista.find((p) => p.id === g.meuPosicaoId)?.nome ?? "Nenhuma";
  }

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Painel" />

      {carregando ? (
        <TelaCarregando mensagem="Carregando perfil..." />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.h1}>Seu perfil</Text>

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
              rotulo="Quero receber novidades e avisos do We Racha por e-mail"
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
                const congelado =
                  g.meuPapel !== "ADMIN" &&
                  scoreCongelado(prox ? new Date(prox.data) : null);
                return (
                  <View key={g.id} style={styles.grupoCard}>
                    <Pressable
                      style={styles.grupoTopo}
                      onPress={() => router.push(`/grupos/${g.id}`)}
                    >
                      <View style={styles.grupoInfo}>
                        <Text style={styles.grupoNome} numberOfLines={1}>
                          {g.nome}
                        </Text>
                        <Text style={styles.grupoEsporte}>{g.esporte}</Text>
                      </View>
                      <Text style={styles.grupoChevron}>›</Text>
                    </Pressable>
                    <View style={styles.grupoAcoes}>
                      <Pressable
                        style={styles.grupoAcao}
                        onPress={() => !congelado && setScoreDe(g)}
                        disabled={congelado}
                      >
                        <Text style={styles.grupoAcaoRotulo}>Score</Text>
                        <Text style={[styles.grupoAcaoValor, congelado && styles.grupoAcaoTravado]}>
                          {g.meuScore}
                          {congelado ? " 🔒" : ""}
                        </Text>
                      </Pressable>
                      <Pressable style={styles.grupoAcao} onPress={() => setPosicaoDe(g)}>
                        <Text style={styles.grupoAcaoRotulo}>Posição</Text>
                        <Text style={styles.grupoAcaoValor} numberOfLines={1}>
                          {nomeDaPosicao(g)}
                        </Text>
                      </Pressable>
                    </View>
                    {congelado && (
                      <Text style={styles.grupoNota}>
                        O score travou porque a próxima partida já vai começar.
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}

      <View style={styles.rodape}>
        {erroSalvar && <Text style={styles.rodapeErro}>{erroSalvar}</Text>}
        <View style={styles.rodapeLinha}>
          <Pressable
            style={[styles.rodapeVoltar, !sujo && styles.rodapeVoltarFull]}
            onPress={() => router.push("/painel")}
          >
            <Text style={styles.rodapeVoltarTexto}>‹ Painel</Text>
          </Pressable>
          {sujo && (
            <View style={styles.rodapeSalvar}>
              <BotaoLaranja
                titulo={salvando ? "Salvando..." : "Salvar"}
                onPress={() => void salvar()}
                carregando={salvando}
              />
            </View>
          )}
        </View>
      </View>

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
      {scoreDe && (
        <ModalScore
          aberto
          nome="você"
          scoreAtual={scoreDe.meuScore}
          salvando={salvandoGrupo}
          erro={erroGrupo}
          onSalvar={(s) => void salvarScore(s)}
          onFechar={() => {
            setScoreDe(null);
            setErroGrupo(null);
          }}
        />
      )}
      {posicaoDe && (
        <ModalPosicao
          aberto
          nome="você"
          posicaoAtualId={posicaoDe.meuPosicaoId}
          posicoes={posicoesPorEsporte[posicaoDe.esporte] ?? []}
          salvando={salvandoGrupo}
          erro={erroGrupo}
          onSalvar={(p) => void salvarPosicao(p)}
          onFechar={() => {
            setPosicaoDe(null);
            setErroGrupo(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  scroll: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 130, gap: 18 },
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
  grupoCard: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  grupoTopo: { flexDirection: "row", alignItems: "center", gap: 10 },
  grupoInfo: { flex: 1 },
  grupoNome: { fontSize: 15, fontWeight: "700", color: cores.branco },
  grupoEsporte: { fontSize: 12, color: cores.slate400, textTransform: "capitalize" },
  grupoChevron: { fontSize: 20, color: cores.slate500 },
  grupoAcoes: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
    paddingTop: 10,
  },
  grupoAcao: {
    flex: 1,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  grupoAcaoRotulo: { fontSize: 11, color: cores.slate500, textTransform: "uppercase", letterSpacing: 1 },
  grupoAcaoValor: { fontSize: 15, fontWeight: "700", color: cores.teal },
  grupoAcaoTravado: { color: cores.slate400 },
  grupoNota: { fontSize: 12, color: cores.slate500 },

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
    paddingBottom: 28,
    gap: 8,
  },
  rodapeErro: { fontSize: 12, color: cores.erroTexto, textAlign: "center" },
  rodapeLinha: { flexDirection: "row", gap: 10 },
  rodapeVoltar: {
    height: 52,
    paddingHorizontal: 18,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  rodapeVoltarFull: { flex: 1 },
  rodapeVoltarTexto: { fontSize: 15, color: cores.branco },
  rodapeSalvar: { flex: 1 },
});
