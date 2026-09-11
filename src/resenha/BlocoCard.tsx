import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { router } from "expo-router";

import { ChatResenha } from "@/resenha/ChatResenha";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { EllipsisVertical, Goal, MessageCircle, Play, Sparkles } from "@/ui/Icone";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import type { BlocoFeedResenha, ComentarioResenha, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

export function BlocoCard({
  bloco,
  grupoId,
  chamarApi,
  podeModerar,
  meuJogadorId,
  podeComentar,
}: {
  bloco: BlocoFeedResenha;
  grupoId: string;
  chamarApi: ChamarApi;
  podeModerar: boolean;
  meuJogadorId: string;
  podeComentar: PodeComentar;
}) {
  const ehLance = bloco.tipo === "LANCE";
  const tituloConversa = ehLance
    ? "Lance importante"
    : `Gol de ${bloco.jogador?.nome ?? "Jogador"}`;
  const dataPartida = new Date(bloco.partidaData);

  const [cam, setCam] = useState(0);
  const [chatAberto, setChatAberto] = useState(false);
  const [comentarios, setComentarios] = useState<ComentarioResenha[]>(bloco.comentariosPreview);
  const [total, setTotal] = useState(bloco.totalComentarios);

  const aoAtualizarComentarios = useCallback((lista: ComentarioResenha[]) => {
    setComentarios(lista);
    setTotal(lista.length);
  }, []);

  const video = bloco.videos[cam] ?? bloco.videos[0];
  const preview = comentarios.slice(-2);
  const faltam = total > preview.length;

  function abrirMenu() {
    const opcoes: { text: string; onPress?: () => void; style?: "cancel" }[] = [];
    if (bloco.videos.length > 1) {
      bloco.videos.forEach((v, i) => {
        opcoes.push({
          text: `Câmera ${v.idCamera}${i === cam ? " ✓" : ""}`,
          onPress: () => setCam(i),
        });
      });
    }
    opcoes.push({
      text: "Ver resultado da partida",
      onPress: () =>
        router.push(`/grupos/${grupoId}/partidas/${bloco.partidaId}/resultado`),
    });
    if (video) {
      opcoes.push({ text: "Abrir vídeo", onPress: () => void Linking.openURL(video.link) });
    }
    opcoes.push({ text: "Fechar", style: "cancel" });
    Alert.alert("Ações do replay", undefined, opcoes, { cancelable: true });
  }

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <View style={styles.cabecalhoEsq}>
          {ehLance ? (
            <View style={styles.lanceIcone}>
              <Sparkles size={15} color={cores.orange} />
            </View>
          ) : bloco.jogador ? (
            <AvatarJogador
              id={bloco.jogador.id}
              nome={bloco.jogador.nome}
              fotoUrl={bloco.jogador.fotoUrl}
              tamanho={26}
            />
          ) : (
            <View style={styles.lanceIcone}>
              <Goal size={15} color={cores.teal} />
            </View>
          )}
          <View style={styles.cabecalhoTextos}>
            <Text style={styles.cabecalhoNome} numberOfLines={1}>
              {ehLance
                ? "Lance importante"
                : bloco.jogador
                  ? bloco.jogador.nome +
                    (bloco.jogador.apelido ? ` (${bloco.jogador.apelido})` : "")
                  : "Replay de gol"}
            </Text>
            <Text style={styles.cabecalhoData}>
              {formatarDiaSemanaData(dataPartida)} · {formatarHora(dataPartida)}
            </Text>
          </View>
        </View>
        <Pressable hitSlop={8} onPress={abrirMenu}>
          <EllipsisVertical size={18} color={cores.slate400} />
        </Pressable>
      </View>

      <Pressable
        style={styles.video}
        onPress={() => video && Linking.openURL(video.link)}
        disabled={!video}
      >
        {video ? (
          <>
            <Play size={22} color={cores.branco} fill={cores.branco} />
            <Text style={styles.videoLegenda}>
              Toque pra ver o replay
              {bloco.videos.length > 1 ? ` · câmera ${video.idCamera}` : ""}
            </Text>
          </>
        ) : (
          <Text style={styles.videoLegenda}>Replay ainda não chegou</Text>
        )}
      </Pressable>

      <View style={styles.resenha}>
        <View style={styles.resenhaTituloLinha}>
          <MessageCircle size={14} color={cores.slate300} />
          <Text style={styles.resenhaTitulo}>Resenha · {total}</Text>
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
          <Text style={styles.responderTexto}>Responder</Text>
        </Pressable>
      </View>

      <ChatResenha
        aberto={chatAberto}
        onFechar={() => setChatAberto(false)}
        chamarApi={chamarApi}
        pedidoReplayId={bloco.pedidoReplayId}
        titulo={tituloConversa}
        meuJogadorId={meuJogadorId}
        podeComentar={podeComentar}
        podeModerar={podeModerar}
        comentariosIniciais={comentarios}
        onComentarios={aoAtualizarComentarios}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    overflow: "hidden",
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cabecalhoEsq: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  lanceIcone: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: cores.superficieMedia,
  },
  cabecalhoTextos: { flex: 1 },
  cabecalhoNome: { fontSize: 14, fontWeight: "700", color: cores.branco },
  cabecalhoData: { fontSize: 12, color: cores.slate500, marginTop: 2 },
  video: {
    marginHorizontal: 14,
    height: 150,
    borderRadius: raio.campo,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoLegenda: { fontSize: 12, color: cores.slate400 },
  resenha: { padding: 14, gap: 10 },
  resenhaTituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  resenhaTitulo: {
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
