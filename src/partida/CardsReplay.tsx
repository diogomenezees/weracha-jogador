import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import type { OpcoesRequisicao } from "@/api/cliente";
import { RespostaReplay } from "@/resenha/RespostaReplay";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { Clock, Download, Goal, Play, Smartphone, Sparkles, Users, VideoOff } from "@/ui/Icone";
import { formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import type { ComentarioResenha, GolComVideos, PodeComentar } from "@/contrato/tipos";

type ChamarApi = <T>(caminho: string, opcoes?: OpcoesRequisicao) => Promise<T>;

function formatarHoraCompleta(d: Date): string {
  return `${formatarHora(d)}:${String(d.getSeconds()).padStart(2, "0")}`;
}

// Lista vertical de replays (lances ou gols de um jogador) no formato do `GolCard` do
// site (weracha-site/components/gols-pager.tsx): cabeçalho com quem/tipo + horário
// completo, vídeo, "Registrado por", "Baixar vídeo", chips de câmera e a resenha
// embaixo. O site mostra um por tela num pager de Stories; aqui é uma lista vertical
// (o app abandonou o pager, ver memória weracha_pager_replay_scroll_snap) e o vídeo abre
// no player do sistema (`Linking.openURL`), sem `expo-video`.
export function CardsReplay({
  gols,
  grupoNome,
  vazioTexto,
  comentar,
}: {
  gols: GolComVideos[];
  /** Só usado no card de lance (sem jogador vinculado). */
  grupoNome: string;
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
  if (gols.length === 0) {
    return (
      <View style={styles.vazio}>
        <Text style={styles.vazioTexto}>{vazioTexto}</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {gols.map((g) => (
        <CardReplay key={g.golId} gol={g} grupoNome={grupoNome} comentar={comentar} />
      ))}
    </View>
  );
}

function CardReplay({
  gol,
  grupoNome,
  comentar,
}: {
  gol: GolComVideos;
  grupoNome: string;
  comentar?: Parameters<typeof CardsReplay>[0]["comentar"];
}) {
  const [cam, setCam] = useState(0);

  // Só vídeo NUVEM tem player; replay que o Cam só salvou no celular (origem LOCAL) vira
  // o aviso "salvo no celular" com o nome do arquivo.
  const videosNuvem = gol.videos.filter((v) => v.origem === "NUVEM");
  const temVideoNuvem = videosNuvem.length > 0;
  const videoLocal = temVideoNuvem ? undefined : gol.videos.find((v) => v.origem === "LOCAL");
  const partesLocal = videoLocal?.link.split("/") ?? [];
  const nomeLocal = partesLocal.at(-1) ?? "";
  const pastaLocal = partesLocal.slice(0, -1).join("/");
  const videoAtual = videosNuvem[cam] ?? videosNuvem[0];

  // Nunca inferir o tipo por `!gol.jogador`: a lista de replays de um jogador é sempre GOL
  // mas pode vir sem `jogador` preenchido.
  const ehLance = gol.tipo === "LANCE";
  const tituloResenha = ehLance
    ? "Lance importante"
    : gol.jogador
      ? `Gol de ${gol.jogador.nome}`
      : "Gol";

  return (
    <View style={styles.card}>
      <View style={styles.cabecalho}>
        <View style={{ flex: 1 }}>
          <View style={styles.tituloLinha}>
            {ehLance ? (
              <Sparkles size={15} color={cores.orange} />
            ) : (
              <Goal size={15} color={cores.teal} />
            )}
            <Text style={styles.titulo}>{ehLance ? "Lance importante" : "Gol marcado"}</Text>
          </View>
          {ehLance ? (
            <View style={styles.subLinha}>
              <Users size={13} color={cores.slate400} />
              <Text style={styles.subTexto} numberOfLines={1}>
                {grupoNome}
              </Text>
            </View>
          ) : (
            gol.jogador && (
              <View style={styles.subLinha}>
                <AvatarJogador
                  id={gol.jogador.id}
                  nome={gol.jogador.nome}
                  fotoUrl={gol.jogador.fotoUrl}
                  tamanho={20}
                />
                <Text style={[styles.subTexto, { color: cores.slate300 }]} numberOfLines={1}>
                  {gol.jogador.apelido || gol.jogador.nome}
                </Text>
              </View>
            )
          )}
        </View>
        <View style={styles.horaLinha}>
          <Clock size={13} color={cores.slate400} />
          <Text style={styles.hora}>{formatarHoraCompleta(new Date(gol.criadoEm))}</Text>
        </View>
      </View>

      {temVideoNuvem ? (
        <View style={styles.corpo}>
          <Pressable
            style={styles.video}
            onPress={() => void Linking.openURL(videoAtual.link).catch(() => {})}
          >
            <Play size={22} color={cores.branco} fill={cores.branco} />
            <Text style={styles.videoLegenda}>
              Toque pra ver o replay
              {videosNuvem.length > 1 ? ` · câmera ${videoAtual.idCamera}` : ""}
            </Text>
          </Pressable>
          {gol.marcadoPor && (
            <Text style={styles.registrado}>
              Registrado por <Text style={styles.registradoNome}>{gol.marcadoPor.nome}</Text>
            </Text>
          )}
          {gol.migracao && (
            <Text style={styles.migracao}>
              Movido de {gol.migracao.deNome} por {gol.migracao.porNome}
            </Text>
          )}
          <Pressable
            style={styles.baixar}
            onPress={() => void Linking.openURL(videoAtual.link).catch(() => {})}
          >
            <Download size={16} color={cores.dark} />
            <Text style={styles.baixarTexto}>Baixar vídeo</Text>
          </Pressable>
          {videosNuvem.length > 1 && (
            <View style={styles.cams}>
              {videosNuvem.map((v, i) => (
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
        </View>
      ) : videoLocal ? (
        <View style={[styles.aviso, styles.avisoTeal]}>
          <Smartphone size={20} color={cores.teal} />
          <Text style={styles.avisoTexto}>Salvo no celular que gravou</Text>
          <View style={{ alignItems: "center", paddingHorizontal: 12 }}>
            {pastaLocal ? <Text style={styles.arquivoPasta}>{pastaLocal}/</Text> : null}
            <Text style={styles.arquivoNome}>{nomeLocal}</Text>
          </View>
        </View>
      ) : gol.origem === "CORRECAO" ? (
        <View style={[styles.aviso, styles.avisoAmbar]}>
          <VideoOff size={20} color="rgba(245, 158, 11, 0.7)" />
          <Text style={[styles.avisoTexto, { color: cores.ambar }]}>
            Gol corrigido pelo admin depois da partida. Não tem replay.
          </Text>
        </View>
      ) : (
        <View style={[styles.aviso, styles.avisoTeal]}>
          <VideoOff size={20} color={cores.slate500} />
          <Text style={[styles.avisoTexto, { color: cores.slate400 }]}>Replay ainda não chegou</Text>
        </View>
      )}

      {comentar && temVideoNuvem && gol.pedidoReplayId && (
        <RespostaReplay
          chamarApi={comentar.chamarApi}
          pedidoReplayId={gol.pedidoReplayId}
          titulo={tituloResenha}
          comentariosIniciais={comentar.porPedido[gol.pedidoReplayId] ?? []}
          meuJogadorId={comentar.meuJogadorId}
          podeComentar={comentar.podeComentar}
          podeModerar={comentar.podeModerar}
          onComentarios={(lista) => comentar.onComentarios(gol.pedidoReplayId!, lista)}
        />
      )}
      {(!comentar || !temVideoNuvem || !gol.pedidoReplayId) && <View style={{ height: 14 }} />}
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
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  titulo: { fontSize: 14, fontWeight: "700", color: cores.branco },
  subLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  subTexto: { flexShrink: 1, fontSize: 12, color: cores.slate400 },
  horaLinha: { flexDirection: "row", alignItems: "center", gap: 5 },
  hora: { fontSize: 12, color: cores.slate400 },
  corpo: { paddingHorizontal: 14, gap: 8, paddingBottom: 14 },
  video: {
    height: 150,
    borderRadius: raio.campo,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  videoLegenda: { fontSize: 12, color: cores.slate400 },
  registrado: { fontSize: 12, color: cores.slate400, textAlign: "right" },
  registradoNome: { color: cores.slate200, fontWeight: "600" },
  migracao: { fontSize: 12, color: "rgba(251, 191, 36, 0.8)", textAlign: "right" },
  baixar: {
    height: 40,
    borderRadius: raio.campo,
    backgroundColor: cores.orange,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  baixarTexto: { fontSize: 14, fontWeight: "700", color: cores.dark },
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
  aviso: {
    marginHorizontal: 14,
    marginBottom: 14,
    alignItems: "center",
    gap: 6,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingVertical: 22,
  },
  avisoTeal: { borderColor: cores.cardBorda },
  avisoAmbar: { borderColor: cores.ambarBorda },
  avisoTexto: { fontSize: 12, color: cores.slate300, textAlign: "center", paddingHorizontal: 12 },
  arquivoPasta: { fontSize: 11, color: cores.slate600, textAlign: "center" },
  arquivoNome: { fontSize: 11, color: cores.slate300, textAlign: "center" },
});
