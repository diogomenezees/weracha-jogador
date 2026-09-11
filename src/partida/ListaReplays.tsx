import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { ChatResenha } from "@/resenha/ChatResenha";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import type { ComentarioResenha, GolComVideos, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(
  caminho: string,
  opcoes?: import("@/api/cliente").OpcoesRequisicao
) => Promise<T>;

// Lista vertical simples de replays (gols ou lances). Sem pager estilo Stories
// (a resenha do app abandonou esse caminho, ver memória
// weracha_pager_replay_scroll_snap). Vídeo abre no player do sistema
// (Linking.openURL), igual a resenha. Comentar é opcional (só a tela de
// Resultado passa o suporte a comentário).
export function ListaReplays({
  gols,
  vazioTexto,
  comentar,
}: {
  gols: GolComVideos[];
  vazioTexto: string;
  comentar?: {
    chamarApi: ChamarApi;
    meuJogadorId: string | null;
    podeComentar: PodeComentar;
    podeModerar: boolean;
    porPedido: Record<string, ComentarioResenha[]>;
    onComentarios: (pedidoReplayId: string, lista: ComentarioResenha[]) => void;
  };
}) {
  const [chatDe, setChatDe] = useState<{ pedidoReplayId: string; titulo: string } | null>(null);

  if (gols.length === 0) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTexto}>{vazioTexto}</Text>
      </View>
    );
  }

  async function assistir(g: GolComVideos) {
    const nuvem = g.videos.find((v) => v.origem === "NUVEM");
    if (nuvem) {
      await Linking.openURL(nuvem.link).catch(() => {});
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {gols.map((g) => {
        const nuvem = g.videos.some((v) => v.origem === "NUVEM");
        const soLocal = !nuvem && g.videos.length > 0;
        const titulo = g.tipo === "LANCE" ? "Lance importante" : g.jogador?.nome ?? "Gol";
        const nComentarios = comentar?.porPedido[g.pedidoReplayId ?? ""]?.length ?? 0;
        return (
          <View key={g.golId} style={[styles.card, g.cancelado && styles.cardCancelado]}>
            <View style={styles.linha}>
              {g.tipo === "GOL" && g.jogador ? (
                <AvatarJogador
                  id={g.jogador.id}
                  nome={g.jogador.nome}
                  fotoUrl={g.jogador.fotoUrl}
                  tamanho={34}
                />
              ) : (
                <View style={styles.lanceIcone}>
                  <Text style={{ fontSize: 16 }}>✨</Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.titulo} numberOfLines={1}>
                  {titulo}
                  {g.cancelado ? "  (cancelado)" : ""}
                </Text>
                <Text style={styles.hora}>{formatarHora(new Date(g.criadoEm))}</Text>
              </View>
            </View>

            {g.migracao && (
              <Text style={styles.nota}>
                Movido de {g.migracao.deNome} por {g.migracao.porNome}
              </Text>
            )}

            <View style={styles.acoes}>
              {nuvem ? (
                <Pressable style={styles.acaoAssistir} onPress={() => void assistir(g)}>
                  <Text style={styles.acaoAssistirTexto}>▶ Assistir</Text>
                </Pressable>
              ) : soLocal ? (
                <Text style={styles.acaoLocal}>Salvo só no celular da câmera</Text>
              ) : (
                <Text style={styles.acaoSemVideo}>Sem replay ainda</Text>
              )}
              {comentar && g.pedidoReplayId && (
                <Pressable
                  style={styles.acaoComentar}
                  onPress={() =>
                    setChatDe({ pedidoReplayId: g.pedidoReplayId!, titulo })
                  }
                >
                  <Text style={styles.acaoComentarTexto}>
                    💬 {nComentarios > 0 ? nComentarios : "Comentar"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        );
      })}

      {comentar && chatDe && (
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

const styles = StyleSheet.create({
  vazio: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 14,
  },
  vazioTexto: { fontSize: 13, color: cores.slate400 },
  card: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 12,
    gap: 8,
  },
  cardCancelado: { opacity: 0.55 },
  linha: { flexDirection: "row", alignItems: "center", gap: 10 },
  lanceIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: cores.laranjaFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  hora: { fontSize: 12, color: cores.slate500 },
  nota: { fontSize: 11, color: cores.slate400 },
  acoes: { flexDirection: "row", alignItems: "center", gap: 8 },
  acaoAssistir: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: cores.orange,
    alignItems: "center",
    justifyContent: "center",
  },
  acaoAssistirTexto: { fontSize: 13, fontWeight: "700", color: cores.dark },
  acaoLocal: { flex: 1, fontSize: 12, color: cores.slate400 },
  acaoSemVideo: { flex: 1, fontSize: 12, color: cores.slate500 },
  acaoComentar: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    alignItems: "center",
    justifyContent: "center",
  },
  acaoComentarTexto: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
});
