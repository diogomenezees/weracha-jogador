import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";
import { router } from "expo-router";

import { MenuAcoes, type ItemMenu } from "@/grupo/MenuAcoes";
import { ChatResenha } from "@/resenha/ChatResenha";
import { AvatarJogador } from "@/ui/AvatarJogador";
import {
  ArrowRight,
  Camera,
  Check,
  Download,
  EllipsisVertical,
  Goal,
  MessageCircle,
  Sparkles,
  Trophy,
  Users,
} from "@/ui/Icone";
import { baixarReplay, mensagemDownload, nomeArquivoReplay } from "@/replay/baixarReplay";
import { PlayerReplay } from "@/replay/PlayerReplay";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { useDialogos } from "@/ui/Dialogos";
import { cores, raio } from "@/tema";
import type { BlocoFeedResenha, ComentarioResenha, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

// O mesmo card serve a tela /replays (meus gols, de qualquer grupo): lá quem chama
// passa `meus`, que acrescenta o nome do grupo no cabeçalho, adiciona o atalho
// "Ir para o grupo" ao menu e, se o jogador saiu do grupo, esconde os atalhos pro
// grupo/resultado e a resenha (ele perdeu o acesso). Espelha ResenhaBlocoCard do site.
export function BlocoCard({
  bloco,
  grupoId,
  chamarApi,
  podeModerar,
  meuJogadorId,
  podeComentar,
  meus,
}: {
  bloco: BlocoFeedResenha;
  grupoId: string;
  chamarApi: ChamarApi;
  podeModerar: boolean;
  meuJogadorId: string | null;
  podeComentar: PodeComentar;
  meus?: { grupoNome: string; grupoRemovido: boolean };
}) {
  const { avisar } = useDialogos();
  const ehLance = bloco.tipo === "LANCE";
  const grupoRemovido = meus?.grupoRemovido ?? false;
  const tituloConversa = meus
    ? `Gol em ${meus.grupoNome}`
    : ehLance
      ? "Lance importante"
      : `Gol de ${bloco.jogador?.nome ?? "Jogador"}`;
  const dataPartida = new Date(bloco.partidaData);

  const [cam, setCam] = useState(0);
  // Trocar de câmera depois de já ter dado play continua tocando.
  const [jaTocou, setJaTocou] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
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

  // Action sheet próprio (MenuAcoes): o Alert.alert do RN corta em 3 botões no Android.
  const itensMenu: ItemMenu[] = [];
  if (bloco.videos.length > 1) {
    bloco.videos.forEach((v, i) => {
      itensMenu.push({
        rotulo: `Câmera ${v.idCamera}`,
        Icone: i === cam ? Check : Camera,
        onPress: () => setCam(i),
      });
    });
  }
  if (meus && !grupoRemovido) {
    itensMenu.push({
      rotulo: "Ir para o grupo",
      Icone: ArrowRight,
      onPress: () => router.push(`/grupos/${grupoId}`),
    });
  }
  if (!grupoRemovido) {
    itensMenu.push({
      rotulo: "Ver resultado da partida",
      Icone: Trophy,
      onPress: () => router.push(`/grupos/${grupoId}/partidas/${bloco.partidaId}/resultado`),
    });
  }
  if (video) {
    itensMenu.push({
      rotulo: "Baixar vídeo",
      Icone: Download,
      cor: cores.orange,
      // O menu fecha ao tocar, então o retorno vem num aviso (o botão do card mostra
      // "Baixando..." inline, aqui não tem onde).
      onPress: () =>
        void baixarReplay(video.link, nomeArquivoReplay(bloco.tipo, bloco.pedidoReplayId)).then(
          (r) => {
            const { titulo, texto } = mensagemDownload(r);
            avisar(titulo, texto);
          }
        ),
    });
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
            {meus && (
              <View style={styles.cabecalhoGrupo}>
                <Users size={12} color={cores.slate500} />
                <Text style={styles.cabecalhoGrupoNome} numberOfLines={1}>
                  {meus.grupoNome}
                </Text>
                {meus.grupoRemovido && (
                  <View style={styles.badgeRemovido}>
                    <Text style={styles.badgeRemovidoTexto}>Removido</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
        <Pressable hitSlop={8} onPress={() => setMenuAberto(true)}>
          <EllipsisVertical size={18} color={cores.slate400} />
        </Pressable>
      </View>

      {video ? (
        <View style={[styles.videoWrap, grupoRemovido && styles.videoSemResenha]}>
          <PlayerReplay
            key={video.link}
            link={video.link}
            legenda={`Toque pra ver o replay${
              bloco.videos.length > 1 ? ` · câmera ${video.idCamera}` : ""
            }`}
            autoIniciar={jaTocou}
            aoIniciar={() => setJaTocou(true)}
          />
        </View>
      ) : (
        <View style={[styles.video, grupoRemovido && styles.videoSemResenha]}>
          <Text style={styles.videoLegenda}>Replay ainda não chegou</Text>
        </View>
      )}

      {!grupoRemovido && (
        <View style={styles.resenha}>
          <View style={styles.resenhaTituloLinha}>
            <MessageCircle size={14} color={cores.teal} />
            <Text style={styles.resenhaTitulo}>Resenha{total > 0 ? ` · ${total}` : ""}</Text>
          </View>
          {preview.map((c) => (
            <View key={c.id} style={styles.comentario}>
              <AvatarJogador
                id={c.autor.id}
                nome={c.autor.nome}
                fotoUrl={c.autor.fotoUrl}
                tamanho={24}
              />
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
        </View>
      )}

      <MenuAcoes
        aberto={menuAberto}
        titulo="Ações do replay"
        itens={itensMenu}
        onFechar={() => setMenuAberto(false)}
      />

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
  cabecalhoGrupo: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  cabecalhoGrupoNome: { flexShrink: 1, fontSize: 12, color: cores.slate500 },
  badgeRemovido: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeRemovidoTexto: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1,
    color: cores.slate400,
    textTransform: "uppercase",
  },
  videoWrap: { marginHorizontal: 14 },
  video: {
    marginHorizontal: 14,
    height: 150,
    borderRadius: raio.campo,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoSemResenha: { marginBottom: 14 },
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
