import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { apagarComentario, buscarComentarios, enviarComentario } from "@/api/resenha";
import { ErroApi } from "@/api/erros";
import { mensagemDoErro } from "@/mensagens-erro";
import { podeApagarComentario, reconciliarComentarios } from "@/resenha/reconciliar";
import { AvatarJogador } from "@/ui/AvatarJogador";
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
  const [comentarios, setComentarios] = useState<ComentarioResenha[]>(comentariosIniciais);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    onComentarios(comentarios);
  }, [comentarios, onComentarios]);

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
        await buscar();
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

  function confirmarApagar(c: ComentarioResenha) {
    Alert.alert("Apagar comentário?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await apagarComentario(chamarApi, c.id);
            setComentarios((atual) => atual.filter((x) => x.id !== c.id));
          } catch (e) {
            Alert.alert("Não deu pra apagar", mensagemDoErro(e));
          }
        },
      },
    ]);
  }

  const aviso = avisoComposer(podeComentar);

  return (
    <Modal visible={aberto} transparent animationType="slide" onRequestClose={onFechar}>
      <View style={styles.fundo}>
        <Pressable style={styles.fundoToque} onPress={onFechar} />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.folha}
        >
          <View style={styles.cabecalho}>
            <Text style={styles.titulo} numberOfLines={1}>
              💬 {titulo}
            </Text>
            <Pressable hitSlop={10} onPress={onFechar}>
              <Text style={styles.fechar}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.avisoGrupo}>
            <Text style={styles.avisoGrupoTexto}>
              Essa resenha é aberta pro grupo inteiro. Vale a zoeira, sem passar do ponto.
            </Text>
          </View>

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
                return (
                  <Pressable
                    style={styles.item}
                    onLongPress={() =>
                      podeApagarComentario(c, meuJogadorId, podeModerar) && confirmarApagar(c)
                    }
                  >
                    <AvatarJogador
                      id={c.autor.id}
                      nome={c.autor.nome}
                      fotoUrl={c.autor.fotoUrl}
                      tamanho={28}
                    />
                    <View style={styles.itemCorpo}>
                      <Text style={styles.itemAutor}>{meu ? "Você" : c.autor.nome}</Text>
                      <Text style={styles.itemTexto}>{c.texto}</Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}

          {erro ? <Text style={styles.erro}>{erro}</Text> : null}

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
                  <Text style={styles.enviarBtnTexto}>Enviar</Text>
                )}
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)" },
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
  titulo: { flex: 1, fontSize: 14, fontWeight: "700", color: cores.branco },
  fechar: { fontSize: 16, color: cores.slate400 },
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
  vazio: { paddingVertical: 40, alignItems: "center" },
  vazioTexto: { fontSize: 14, color: cores.slate500 },
  lista: { padding: 16, gap: 14 },
  item: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  itemCorpo: { flex: 1, gap: 2 },
  itemAutor: { fontSize: 12, fontWeight: "600", color: cores.teal },
  itemTexto: { fontSize: 14, lineHeight: 19, color: cores.slate200 },
  erro: { fontSize: 13, color: cores.erroTexto, paddingHorizontal: 16, paddingBottom: 6 },
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
    height: 42,
    paddingHorizontal: 16,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  enviarBtnOff: { opacity: 0.5 },
  enviarBtnTexto: { fontSize: 14, fontWeight: "700", color: cores.dark },
});
