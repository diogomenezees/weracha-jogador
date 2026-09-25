import { useCallback, useEffect, useState } from "react";
import { BlurView } from "expo-blur";
import { ActivityIndicator, AppState, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from "react-native";
import { Text } from "@/ui/Texto";

import {
  apagarComentario,
  bloquearJogador,
  buscarComentarios,
  denunciarComentario,
  desbloquearJogador,
  enviarComentario,
} from "@/api/resenha";
import { ErroApi } from "@/api/erros";
import {
  Ban,
  CircleUserRound,
  Flag,
  MessageCircle,
  MoreHorizontal,
  Send,
  Trash2,
  X,
} from "@/ui/Icone";
import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ModalConfirmar } from "@/grupo/modais";
import { mensagemDoErro } from "@/mensagens-erro";
import {
  podeApagarComentario,
  podeDenunciarComentario,
  reconciliarComentarios,
} from "@/resenha/reconciliar";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { useBlurTarget } from "@/ui/BlurTarget";
import { cores, raio } from "@/tema";
import type { ComentarioResenha, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: import("@/api/cliente").OpcoesRequisicao) => Promise<T>;

const MAX = 500;

function avisoComposer(pc: PodeComentar): string | null {
  if (pc.ok) return null;
  if (pc.motivo === "sem-data-nascimento")
    return "Pra comentar, informe sua data de nascimento no perfil (pelo site, por enquanto).";
  if (pc.motivo === "menor") return "A resenha é 18+.";
  return "Essa partida foi cancelada.";
}

export function ChatResenha({
  aberto,
  onFechar,
  chamarApi,
  pedidoReplayId,
  titulo,
  meuJogadorId,
  podeComentar,
  podeModerar,
  comentariosIniciais,
  onComentarios,
}: {
  aberto: boolean;
  onFechar: () => void;
  chamarApi: ChamarApi;
  pedidoReplayId: string;
  titulo: string;
  meuJogadorId: string | null;
  podeComentar: PodeComentar;
  podeModerar: boolean;
  comentariosIniciais: ComentarioResenha[];
  onComentarios: (lista: ComentarioResenha[]) => void;
}) {
  const blurTarget = useBlurTarget();
  const [comentarios, setComentarios] = useState<ComentarioResenha[]>(comentariosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [menuDe, setMenuDe] = useState<ComentarioResenha | null>(null);
  const [confirmando, setConfirmando] = useState<{
    tipo: "apagar" | "denunciar" | "bloquear";
    c: ComentarioResenha;
  } | null>(null);
  const [confOcupado, setConfOcupado] = useState(false);
  const [confErro, setConfErro] = useState<string | null>(null);
  const [avisoChat, setAvisoChat] = useState<string | null>(null);

  // Só avisa o card depois da 1ª sincronização com o servidor. Antes disso a
  // lista é só a prévia (2 últimos): avisar já no mount faria o card trocar o
  // total real (ex.: 11) por 2 e esconder o "ver todos os N comentários".
  const [sincronizado, setSincronizado] = useState(false);
  useEffect(() => {
    if (sincronizado) onComentarios(comentarios);
  }, [sincronizado, comentarios, onComentarios]);

  const buscar = useCallback(async () => {
    const servidor = await buscarComentarios(chamarApi, pedidoReplayId);
    setComentarios((atual) => reconciliarComentarios(atual, servidor));
  }, [chamarApi, pedidoReplayId]);

  useEffect(() => {
    if (!aberto) return;
    let vivo = true;
    (async () => {
      setErro(null);
      setCarregando(true);
      try {
        try {
          await buscar();
        } catch {
          // Uma conexão ruim (ex.: reaproveitada depois de o servidor fechá-la)
          // costuma passar na 2ª tentativa; só então mostra erro.
          await buscar();
        }
        setSincronizado(true);
      } catch {
        if (vivo) setErro("Não foi possível carregar a conversa.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    const t = setInterval(() => {
      if (AppState.currentState === "active") buscar().catch(() => {});
    }, 3000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [aberto, buscar]);

  async function enviar() {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      const novo = await enviarComentario(chamarApi, pedidoReplayId, t);
      setComentarios((atual) => [...atual, novo]);
      setTexto("");
    } catch (e) {
      setErro(
        e instanceof ErroApi && e.codigo === "COMENTARIO_COOLDOWN"
          ? "Espere alguns segundos antes de comentar de novo."
          : mensagemDoErro(e)
      );
    } finally {
      setEnviando(false);
    }
  }

  // Confirmações no mesmo padrão das outras telas (ModalConfirmar, escuro com
  // blur), não o Alert nativo do Android. Uma ação por vez; erro aparece dentro
  // do próprio modal.
  function executarConfirmacao() {
    if (!confirmando) return;
    const { tipo, c } = confirmando;
    setConfOcupado(true);
    setConfErro(null);
    (async () => {
      try {
        if (tipo === "apagar") {
          await apagarComentario(chamarApi, c.id);
          setComentarios((atual) => atual.filter((x) => x.id !== c.id));
        } else if (tipo === "denunciar") {
          await denunciarComentario(chamarApi, c.id);
          setAvisoChat("Denúncia enviada. Obrigado por avisar, vamos analisar.");
        } else {
          // Bloqueio pessoal: o servidor passa a devolver os comentários dessa
          // pessoa com aviso no lugar do texto. Recarrega a thread pra refletir.
          await bloquearJogador(chamarApi, c.autor.id);
          await buscar();
          setAvisoChat("Usuário bloqueado. Você não vê mais os comentários dele.");
        }
        setConfirmando(null);
      } catch (e) {
        setConfErro(mensagemDoErro(e));
      } finally {
        setConfOcupado(false);
      }
    })();
  }

  function fecharConfirmacao() {
    setConfirmando(null);
    setConfErro(null);
  }

  async function desbloquear(c: ComentarioResenha) {
    try {
      setErro(null);
      await desbloquearJogador(chamarApi, c.autor.id);
      await buscar();
      setAvisoChat("Usuário desbloqueado.");
    } catch (e) {
      setErro(mensagemDoErro(e));
    }
  }

  function abrirConfirmacao(tipo: "apagar" | "denunciar" | "bloquear", c: ComentarioResenha) {
    setConfErro(null);
    setAvisoChat(null);
    setConfirmando({ tipo, c });
  }

  // Ações do comentário no menu ⋯. Quem pode apagar (admin sempre, autor só na
  // janela de 5 min) e quem pode denunciar (todo mundo, menos o próprio autor).
  function itensDoMenu(c: ComentarioResenha): ItemMenu[] {
    const itens: ItemMenu[] = [];
    // Autor que eu bloqueei: o texto nem chegou aqui, só resta desbloquear.
    if (c.bloqueado) {
      itens.push({ rotulo: "Desbloquear usuário", Icone: Ban, onPress: () => void desbloquear(c) });
      return itens;
    }
    if (podeDenunciarComentario(c, meuJogadorId)) {
      itens.push({ rotulo: "Denunciar", Icone: Flag, onPress: () => abrirConfirmacao("denunciar", c) });
      itens.push({ rotulo: "Bloquear usuário", Icone: Ban, onPress: () => abrirConfirmacao("bloquear", c) });
    }
    if (podeApagarComentario(c, meuJogadorId, podeModerar)) {
      itens.push({
        rotulo: "Apagar",
        Icone: Trash2,
        destrutivo: true,
        onPress: () => abrirConfirmacao("apagar", c),
      });
    }
    return itens;
  }

  const aviso = avisoComposer(podeComentar);

  return (
    // "fade" como o MenuAcoes: com "slide" o BlurView do fundo sobe junto com a
    // folha e parece uma imagem embaçada subindo.
    <Modal visible={aberto} transparent animationType="fade" onRequestClose={onFechar}>
      <BlurView
        intensity={40}
        tint="dark"
        blurMethod="dimezisBlurView"
        blurTarget={blurTarget}
        style={styles.fundo}
      >
        <Pressable style={styles.fundoToque} onPress={onFechar} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.folha}
        >
          <View style={styles.cabecalho}>
            <View style={styles.tituloLinha}>
              <MessageCircle size={16} color={cores.slate300} />
              <Text style={styles.titulo} numberOfLines={1}>
                {titulo}
              </Text>
            </View>
            <Pressable hitSlop={10} onPress={onFechar}>
              <X size={18} color={cores.slate400} />
            </Pressable>
          </View>

          <View style={styles.avisoGrupo}>
            <Text style={styles.avisoGrupoTexto}>
              Essa resenha é aberta pro grupo inteiro. Vale a zoeira, sem passar do ponto.
            </Text>
          </View>

          {carregando && !sincronizado && comentarios.length > 0 ? (
            <Text style={styles.carregandoRestante}>Carregando as outras mensagens...</Text>
          ) : null}

          {comentarios.length === 0 ? (
            <View style={styles.vazio}>
              <Text style={styles.vazioTexto}>
                {carregando ? "Carregando..." : "Ninguém comentou ainda. Seja o primeiro."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={comentarios}
              keyExtractor={(c) => c.id}
              contentContainerStyle={styles.lista}
              renderItem={({ item: c }) => {
                const meu = !!meuJogadorId && c.autor.id === meuJogadorId;
                const temMenu = itensDoMenu(c).length > 0;
                return (
                  <View style={styles.item}>
                    {c.bloqueado ? (
                      <View style={styles.avatarBloqueado}>
                        <CircleUserRound size={16} color={cores.slate500} />
                      </View>
                    ) : (
                      <AvatarJogador
                        id={c.autor.id}
                        nome={c.autor.nome}
                        fotoUrl={c.autor.fotoUrl}
                        tamanho={28}
                      />
                    )}
                    <View style={styles.itemCorpo}>
                      <Text style={[styles.itemAutor, c.bloqueado && styles.itemAutorBloqueado]}>
                        {meu ? "Você" : c.autor.nome}
                      </Text>
                      {c.bloqueado ? (
                        <Text style={styles.itemTextoBloqueado}>Mensagem de usuário bloqueado.</Text>
                      ) : (
                        <Text style={styles.itemTexto}>{c.texto}</Text>
                      )}
                    </View>
                    {temMenu ? (
                      <Pressable
                        hitSlop={10}
                        style={styles.itemMenu}
                        onPress={() => setMenuDe(c)}
                        accessibilityRole="button"
                        accessibilityLabel="Mais opções do comentário"
                      >
                        <MoreHorizontal size={18} color={cores.slate500} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              }}
            />
          )}

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}
          {avisoChat ? <Text style={styles.avisoOk}>{avisoChat}</Text> : null}

          {aviso ? (
            <View style={styles.composerAviso}>
              <Text style={styles.composerAvisoTexto}>{aviso}</Text>
            </View>
          ) : (
            <View style={styles.composer}>
              <TextInput
                style={styles.composerInput}
                value={texto}
                onChangeText={(v) => setTexto(v.slice(0, MAX))}
                placeholder="Escreva um comentário..."
                placeholderTextColor={cores.slate500}
                multiline
                editable={!enviando}
              />
              <Pressable
                style={[styles.enviarBtn, (!texto.trim() || enviando) && styles.enviarBtnOff]}
                onPress={() => void enviar()}
                disabled={!texto.trim() || enviando}
              >
                {enviando ? (
                  <ActivityIndicator color={cores.dark} size="small" />
                ) : (
                  <Send size={16} color={cores.dark} />
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
        <ModalConfirmar
          aberto={confirmando?.tipo === "denunciar"}
          Icone={Flag}
          eyebrow="Denunciar"
          titulo="Denunciar comentário?"
          descricao="O dono do WeRacha vai analisar. Quem escreveu não é avisado."
          destrutivo
          confirmarLabel="Denunciar"
          ocupado={confOcupado}
          erro={confErro}
          onConfirmar={executarConfirmacao}
          onFechar={fecharConfirmacao}
        />
        <ModalConfirmar
          aberto={confirmando?.tipo === "bloquear"}
          Icone={Ban}
          eyebrow="Bloquear"
          titulo={`Bloquear ${confirmando?.c.autor.nome ?? "usuário"}?`}
          descricao="Você não vai mais ver os comentários dessa pessoa na resenha. Só você é afetado, e dá pra desbloquear no menu de uma mensagem dela."
          destrutivo
          confirmarLabel="Bloquear"
          ocupado={confOcupado}
          erro={confErro}
          onConfirmar={executarConfirmacao}
          onFechar={fecharConfirmacao}
        />
        <ModalConfirmar
          aberto={confirmando?.tipo === "apagar"}
          Icone={Trash2}
          eyebrow="Ação irreversível"
          titulo="Apagar comentário?"
          descricao="Essa ação não pode ser desfeita."
          destrutivo
          confirmarLabel="Apagar"
          ocupado={confOcupado}
          erro={confErro}
          onConfirmar={executarConfirmacao}
          onFechar={fecharConfirmacao}
        />
        <MenuAcoes
          aberto={menuDe !== null}
          titulo={menuDe ? (menuDe.autor.id === meuJogadorId ? "Seu comentário" : menuDe.autor.nome) : undefined}
          itens={menuDe ? itensDoMenu(menuDe) : []}
          onFechar={() => setMenuDe(null)}
        />
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  fundoToque: { flex: 1 },
  folha: {
    maxHeight: "85%",
    backgroundColor: "#12161f",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingBottom: 24,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: cores.linhaSutil,
  },
  tituloLinha: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  titulo: { flex: 1, fontSize: 14, fontWeight: "700", color: cores.branco },
  avisoGrupo: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
    padding: 10,
  },
  avisoGrupoTexto: { fontSize: 12, lineHeight: 17, color: cores.slate400 },
  carregandoRestante: {
    fontSize: 12,
    color: cores.slate500,
    textAlign: "center",
    paddingTop: 10,
  },
  vazio: { paddingVertical: 40, alignItems: "center" },
  vazioTexto: { fontSize: 14, color: cores.slate500 },
  lista: { padding: 16, gap: 14 },
  item: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  itemCorpo: { flex: 1, gap: 2 },
  itemMenu: { paddingTop: 2 },
  avatarBloqueado: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemAutorBloqueado: { color: cores.slate500 },
  itemTextoBloqueado: { fontSize: 14, lineHeight: 19, color: cores.slate500, fontStyle: "italic" },
  itemAutor: { fontSize: 12, fontWeight: "600", color: cores.teal },
  itemTexto: { fontSize: 14, lineHeight: 19, color: cores.slate200 },
  erro: { fontSize: 13, color: cores.erroTexto, paddingHorizontal: 16, paddingBottom: 6 },
  avisoOk: { fontSize: 13, color: cores.teal, paddingHorizontal: 16, paddingBottom: 6 },
  composerAviso: {
    marginHorizontal: 16,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    backgroundColor: cores.superficieSutil,
    padding: 12,
  },
  composerAvisoTexto: { fontSize: 13, color: cores.slate400, textAlign: "center" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: cores.linhaSutil,
  },
  composerInput: {
    flex: 1,
    maxHeight: 100,
    minHeight: 42,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    backgroundColor: cores.campoFundo,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: cores.branco,
  },
  enviarBtn: {
    width: 42,
    height: 42,
    borderRadius: raio.campo,
    backgroundColor: cores.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  enviarBtnOff: { opacity: 0.5 },
});
