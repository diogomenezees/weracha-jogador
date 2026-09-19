import { useState, type ReactNode } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { ChatResenha } from "@/resenha/ChatResenha";
import { AvatarJogador } from "@/ui/AvatarJogador";
import {
  ArrowLeftRight,
  Ban,
  Goal,
  MessageCircle,
  MonitorPlay,
  PenLine,
  Play,
  Smartphone,
  Sparkles,
  VideoOff,
} from "@/ui/Icone";
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
// Resultado passa o suporte a comentário). Campos extras (apelido, "Registrado
// por", ícone de status, legenda) espelham o modo cronológico do
// `PainelGols` do site (weracha-site/components/painel-gols.tsx) — sem portar
// o menu de cancelar/migrar/reativar nem o modo agrupado, que não existem
// aqui ainda.
export function ListaReplays({
  gols,
  vazioTexto,
  meuId,
  comentar,
}: {
  gols: GolComVideos[];
  vazioTexto: string;
  /** Realça (borda teal) a linha do gol de quem está logado, igual ao site. */
  meuId?: string | null;
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
        const cancelado = !!g.cancelado;
        const titulo =
          g.tipo === "LANCE" ? "Lance importante" : `Gol de ${g.jogador?.nome ?? "Ex-jogador"}`;
        const nComentarios = comentar?.porPedido[g.pedidoReplayId ?? ""]?.length ?? 0;

        let IconeTitulo: typeof Goal;
        let corIconeTitulo: string;
        if (cancelado) {
          IconeTitulo = Ban;
          corIconeTitulo = cores.erroTexto;
        } else if (g.migracao) {
          IconeTitulo = ArrowLeftRight;
          corIconeTitulo = cores.ambar;
        } else if (g.origem === "CORRECAO") {
          IconeTitulo = PenLine;
          corIconeTitulo = cores.ambar;
        } else if (g.tipo === "LANCE") {
          IconeTitulo = Sparkles;
          corIconeTitulo = cores.orange;
        } else {
          IconeTitulo = Goal;
          corIconeTitulo = cores.teal;
        }

        let IconeStatus: typeof MonitorPlay;
        let corIconeStatus: string;
        let rotuloStatus: string;
        if (cancelado) {
          IconeStatus = Ban;
          corIconeStatus = cores.erroTexto;
          rotuloStatus = "Gol cancelado";
        } else if (nuvem) {
          IconeStatus = MonitorPlay;
          corIconeStatus = cores.teal;
          rotuloStatus = "Replay na nuvem";
        } else if (soLocal) {
          IconeStatus = Smartphone;
          corIconeStatus = cores.teal;
          rotuloStatus = "Replay salvo no celular";
        } else {
          IconeStatus = VideoOff;
          corIconeStatus = cores.slate500;
          rotuloStatus = "Sem replay";
        }

        const souGol = !!g.jogador && g.jogador.id === meuId;

        return (
          <View
            key={g.golId}
            style={[
              styles.card,
              souGol && !cancelado && styles.cardEu,
              cancelado && styles.cardCancelado,
            ]}
          >
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
                  <Sparkles size={15} color={cores.orange} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <View style={styles.tituloLinha}>
                  <IconeTitulo size={13} color={corIconeTitulo} />
                  <Text
                    style={[styles.titulo, cancelado && styles.tituloCancelado]}
                    numberOfLines={1}
                  >
                    {titulo}
                  </Text>
                </View>
                {!cancelado && g.jogador?.apelido && (
                  <Text style={styles.apelido} numberOfLines={1}>
                    {g.jogador.apelido}
                  </Text>
                )}
                {g.marcadoPor && (
                  <Text style={styles.registradoPor} numberOfLines={1}>
                    {g.origem === "CORRECAO" ? "Corrigido por " : "Registrado por "}
                    {g.marcadoPor.nome}
                  </Text>
                )}
              </View>
              <View style={styles.direita}>
                <Text style={styles.hora}>{formatarHora(new Date(g.criadoEm))}</Text>
                <IconeStatus size={15} color={corIconeStatus} accessibilityLabel={rotuloStatus} />
              </View>
            </View>

            {g.migracao && !cancelado && (
              <Text style={styles.nota}>
                Movido de {g.migracao.deNome} por {g.migracao.porNome}
              </Text>
            )}
            {cancelado && (
              <Text style={styles.notaCancelado}>Cancelado por {g.cancelado!.porNome}</Text>
            )}

            {(nuvem || soLocal || (comentar && g.pedidoReplayId)) && (
              <View style={styles.acoes}>
                {nuvem ? (
                  <Pressable style={styles.acaoAssistir} onPress={() => void assistir(g)}>
                    <Play size={13} color={cores.dark} fill={cores.dark} />
                    <Text style={styles.acaoAssistirTexto}>Assistir</Text>
                  </Pressable>
                ) : soLocal ? (
                  <Text style={styles.acaoLocal}>Salvo só no celular da câmera</Text>
                ) : null}
                {comentar && g.pedidoReplayId && (
                  <Pressable
                    style={styles.acaoComentar}
                    onPress={() =>
                      setChatDe({ pedidoReplayId: g.pedidoReplayId!, titulo })
                    }
                  >
                    <MessageCircle size={13} color={cores.slate300} />
                    <Text style={styles.acaoComentarTexto}>
                      {nComentarios > 0 ? nComentarios : "Comentar"}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        );
      })}

      <View style={styles.legenda}>
        <LegendaItem Icone={MonitorPlay} texto="Replay na nuvem" />
        <LegendaItem Icone={Smartphone} texto="Salvo no celular que gravou" />
        <LegendaItem Icone={VideoOff} texto="Sem replay" />
      </View>

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

function LegendaItem({
  Icone,
  texto,
}: {
  Icone: typeof MonitorPlay;
  texto: string;
}): ReactNode {
  return (
    <View style={styles.legendaItem}>
      <Icone size={13} color={cores.slate500} />
      <Text style={styles.legendaTexto}>{texto}</Text>
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
  cardEu: { borderColor: cores.teal, borderWidth: 2 },
  cardCancelado: { opacity: 0.7 },
  linha: { flexDirection: "row", alignItems: "center", gap: 10 },
  lanceIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: cores.laranjaFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 5 },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  tituloCancelado: { color: cores.slate500, textDecorationLine: "line-through" },
  apelido: { marginTop: 1, fontSize: 12, color: cores.slate400 },
  registradoPor: { marginTop: 1, fontSize: 11, color: cores.slate500 },
  direita: { alignItems: "flex-end", gap: 4 },
  hora: { fontSize: 13, fontWeight: "600", color: cores.teal },
  nota: { fontSize: 11, color: cores.ambar },
  notaCancelado: { fontSize: 11, fontWeight: "600", color: cores.erroTexto },
  acoes: { flexDirection: "row", alignItems: "center", gap: 8 },
  acaoAssistir: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  acaoAssistirTexto: { fontSize: 13, fontWeight: "700", color: cores.dark },
  acaoLocal: { flex: 1, fontSize: 12, color: cores.slate400 },
  acaoComentar: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: cores.campoBorda,
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  acaoComentarTexto: { fontSize: 13, fontWeight: "600", color: cores.slate300 },
  legenda: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 2 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendaTexto: { fontSize: 11, color: cores.slate500 },
});
