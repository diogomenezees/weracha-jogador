import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";

import type { OpcoesRequisicao } from "@/api/cliente";
import { formatarDataPartida } from "@/formato";
import { formatarHora } from "@/partidas";
import { ChatResenha } from "@/resenha/ChatResenha";
import { cores, raio } from "@/tema";
import type { ComentarioResenha, MeuReplay, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

// Lista vertical dos replays do próprio jogador (tela /replays). Mesmo espírito
// de `src/partida/ListaReplays.tsx`: vídeo abre no player do sistema
// (Linking.openURL), sem pager estilo Stories (o app abandonou esse caminho, ver
// memória weracha_pager_replay_scroll_snap). Cabeçalho mostra grupo/esporte/data
// (o jogador é sempre "eu"). Replay de grupo que o jogador deixou (`grupoRemovido`)
// fica sem os atalhos nem a resenha.
export function ListaMeusReplays({
  replays,
  comentar,
}: {
  replays: MeuReplay[];
  comentar: {
    chamarApi: ChamarApi;
    meuJogadorId: string | null;
    podeComentar: PodeComentar;
    podeModerar: boolean;
    porPedido: Record<string, ComentarioResenha[]>;
    onComentarios: (pedidoReplayId: string, lista: ComentarioResenha[]) => void;
  };
}) {
  const [chatDe, setChatDe] = useState<{ pedidoReplayId: string; titulo: string } | null>(null);

  return (
    <View style={{ gap: 12 }}>
      {replays.map((r) => (
        <CardReplay
          key={r.golId}
          replay={r}
          nComentarios={comentar.porPedido[r.pedidoReplayId]?.length ?? 0}
          onComentar={() =>
            setChatDe({ pedidoReplayId: r.pedidoReplayId, titulo: `Gol em ${r.grupoNome}` })
          }
        />
      ))}

      {chatDe && (
        <ChatResenha
          aberto
          onFechar={() => setChatDe(null)}
          chamarApi={comentar.chamarApi}
          pedidoReplayId={chatDe.pedidoReplayId}
          titulo={chatDe.titulo}
          meuJogadorId={comentar.meuJogadorId}
          podeComentar={comentar.podeComentar}
          podeModerar={comentar.podeModerar}
          comentariosIniciais={comentar.porPedido[chatDe.pedidoReplayId] ?? []}
          onComentarios={(lista) => comentar.onComentarios(chatDe.pedidoReplayId, lista)}
        />
      )}
    </View>
  );
}

function CardReplay({
  replay,
  nComentarios,
  onComentar,
}: {
  replay: MeuReplay;
  nComentarios: number;
  onComentar: () => void;
}) {
  const [cam, setCam] = useState(0);
  const video = replay.videos[cam] ?? replay.videos[0];

  return (
    <View style={styles.card}>
      <View style={styles.topo}>
        <View style={{ flex: 1 }}>
          <View style={styles.tituloLinha}>
            <Text style={styles.grupo} numberOfLines={1}>
              {replay.grupoNome}
            </Text>
            {replay.grupoRemovido && (
              <View style={styles.badgeRemovido}>
                <Text style={styles.badgeRemovidoTexto}>Removido</Text>
              </View>
            )}
          </View>
          <Text style={styles.meta}>
            {replay.esporte} · {formatarDataPartida(replay.partidaData)}
          </Text>
        </View>
        <Text style={styles.hora}>{formatarHora(new Date(replay.criadoEm))}</Text>
      </View>

      {replay.videos.length > 1 && (
        <View style={styles.cams}>
          {replay.videos.map((v, i) => (
            <Pressable
              key={v.link}
              style={[styles.camChip, i === cam && styles.camChipOn]}
              onPress={() => setCam(i)}
            >
              <Text style={[styles.camTexto, i === cam && styles.camTextoOn]}>{v.idCamera}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <Pressable style={styles.assistir} onPress={() => void Linking.openURL(video.link).catch(() => {})}>
        <Text style={styles.assistirTexto}>▶ Assistir</Text>
      </Pressable>

      <Text style={styles.registrado}>
        Registrado por <Text style={styles.registradoNome}>{replay.marcadoPor.nome}</Text>
      </Text>

      {!replay.grupoRemovido && (
        <View style={styles.acoes}>
          <Pressable
            style={styles.acaoSec}
            onPress={() => router.push(`/grupos/${replay.grupoId}`)}
          >
            <Text style={styles.acaoSecTexto}>Grupo ›</Text>
          </Pressable>
          <Pressable
            style={styles.acaoSec}
            onPress={() =>
              router.push(
                `/grupos/${replay.grupoId}/partidas/${replay.partidaId}/resultado`
              )
            }
          >
            <Text style={styles.acaoSecTexto}>Resultado ›</Text>
          </Pressable>
          <Pressable style={styles.acaoComentar} onPress={onComentar}>
            <Text style={styles.acaoComentarTexto}>
              💬 {nComentarios > 0 ? nComentarios : "Comentar"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 14,
    gap: 10,
  },
  topo: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  grupo: { fontSize: 15, fontWeight: "700", color: cores.branco, flexShrink: 1 },
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
  meta: { fontSize: 12, color: cores.slate400, marginTop: 2, textTransform: "capitalize" },
  hora: { fontSize: 12, color: cores.slate500 },
  cams: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  camChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  camChipOn: { backgroundColor: cores.teal, borderColor: cores.teal },
  camTexto: { fontSize: 12, color: cores.slate300 },
  camTextoOn: { color: cores.dark, fontWeight: "700" },
  assistir: {
    height: 42,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  assistirTexto: { fontSize: 14, fontWeight: "700", color: cores.dark },
  registrado: { fontSize: 11, color: cores.slate400, textAlign: "right" },
  registradoNome: { color: cores.slate200, fontWeight: "600" },
  acoes: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  acaoSec: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.linhaSutil,
    backgroundColor: cores.superficieMedia,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acaoSecTexto: { fontSize: 12, fontWeight: "600", color: cores.slate200 },
  acaoComentar: {
    marginLeft: "auto",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  acaoComentarTexto: { fontSize: 12, fontWeight: "600", color: cores.slate300 },
});
