import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { ChatResenha } from "@/resenha/ChatResenha";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { MessageCircle } from "@/ui/Icone";
import { cores, raio } from "@/tema";
import type { ComentarioResenha, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

const PREVIA = 2;

// Resenha de um replay nas telas onde o vídeo aparece INLINE (abas Artilheiros e
// Lances do resultado). Porte de `components/resposta-replay.tsx` do site: cabeçalho
// "Resenha · N", preview estático dos 2 comentários mais recentes, "ver todos os N
// comentários" quando há mais e o botão "Comentar" (sem comentário) / "Responder", que
// abre o `ChatResenha` (o polling vive lá dentro, um replay por vez).
export function RespostaReplay({
  chamarApi,
  pedidoReplayId,
  titulo,
  comentariosIniciais,
  meuJogadorId,
  podeComentar,
  podeModerar,
  onComentarios,
}: {
  chamarApi: ChamarApi;
  pedidoReplayId: string;
  titulo: string;
  /** Lote completo de comentários do replay, em ordem cronológica. */
  comentariosIniciais: ComentarioResenha[];
  meuJogadorId: string | null;
  podeComentar: PodeComentar;
  podeModerar: boolean;
  /** Avisa a tela quando o chat devolve a lista atualizada (mantém o preview em dia). */
  onComentarios?: (lista: ComentarioResenha[]) => void;
}) {
  const [chatAberto, setChatAberto] = useState(false);
  // Lista que o chat devolve enquanto está aberto (com polling). Enquanto for null, o
  // preview segue o que vem por prop.
  const [doChat, setDoChat] = useState<ComentarioResenha[] | null>(null);

  // Callback ESTÁVEL pro chat: ele chama `onComentarios` num efeito que depende da
  // identidade da função, e a tela costuma passar uma lambda nova a cada render (o que
  // viraria laço de re-render). Guarda a versão atual numa ref.
  const onComentariosRef = useRef(onComentarios);
  useEffect(() => {
    onComentariosRef.current = onComentarios;
  });
  const aoComentarios = useCallback((lista: ComentarioResenha[]) => {
    setDoChat(lista);
    onComentariosRef.current?.(lista);
  }, []);

  const comentarios = doChat ?? comentariosIniciais;
  const total = comentarios.length;
  const preview = comentarios.slice(-PREVIA);
  const faltam = total > preview.length;

  return (
    <View style={styles.caixa}>
      <View style={styles.tituloLinha}>
        <MessageCircle size={14} color={cores.teal} />
        <Text style={styles.titulo}>Resenha{total > 0 ? ` · ${total}` : ""}</Text>
      </View>

      {preview.map((c) => (
        <View key={c.id} style={styles.comentario}>
          <AvatarJogador id={c.autor.id} nome={c.autor.nome} fotoUrl={c.autor.fotoUrl} tamanho={24} />
          <View style={styles.comentarioCorpo}>
            <Text style={styles.comentarioAutor}>{c.autor.nome}</Text>
            <Text style={styles.comentarioTexto}>{c.texto}</Text>
          </View>
        </View>
      ))}

      {faltam && (
        <Pressable onPress={() => setChatAberto(true)}>
          <Text style={styles.verTodos}>ver todos os {total} comentários</Text>
        </Pressable>
      )}

      <Pressable style={styles.responder} onPress={() => setChatAberto(true)}>
        <MessageCircle size={13} color={cores.slate300} />
        <Text style={styles.responderTexto}>{total === 0 ? "Comentar" : "Responder"}</Text>
      </Pressable>

      <ChatResenha
        aberto={chatAberto}
        onFechar={() => setChatAberto(false)}
        chamarApi={chamarApi}
        pedidoReplayId={pedidoReplayId}
        titulo={titulo}
        meuJogadorId={meuJogadorId}
        podeComentar={podeComentar}
        podeModerar={podeModerar}
        comentariosIniciais={comentarios}
        onComentarios={aoComentarios}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  caixa: {
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  titulo: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    color: cores.teal,
    textTransform: "uppercase",
  },
  comentario: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  comentarioCorpo: { flex: 1, gap: 1 },
  comentarioAutor: { fontSize: 12, fontWeight: "600", color: cores.teal },
  comentarioTexto: { fontSize: 14, lineHeight: 19, color: cores.slate200 },
  verTodos: { fontSize: 12, fontWeight: "600", color: cores.teal },
  responder: {
    height: 40,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  responderTexto: { fontSize: 14, fontWeight: "600", color: cores.branco },
});
