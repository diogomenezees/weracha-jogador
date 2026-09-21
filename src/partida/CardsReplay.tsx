import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import type { OpcoesRequisicao } from "@/api/cliente";
import { RespostaReplay } from "@/resenha/RespostaReplay";
import { AvatarJogador } from "@/ui/AvatarJogador";
import { Ban, Clock, Goal, Smartphone, Sparkles, Users, VideoOff } from "@/ui/Icone";
import { BotaoBaixarVideo } from "@/replay/BotaoBaixarVideo";
import { nomeArquivoReplay } from "@/replay/baixarReplay";
import { PlayerReplay } from "@/replay/PlayerReplay";
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
// (o app abandonou o pager, ver memória weracha_pager_replay_scroll_snap) e o vídeo toca
// embutido no card (`PlayerReplay`, expo-video), igual ao <video> do site.
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
  // Trocar de câmera depois de já ter dado play continua tocando (o site faz igual).
  const [jaTocou, setJaTocou] = useState(false);

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
  // Gol cancelado só chega aqui quando a linha do tempo do resultado abre o replay dele
  // (prova de que o gol não era do jogador ou foi marcado errado). Ele não conta pra
  // nada, e o servidor recusa comentário nele, então o card não mostra a resenha.
  const cancelado = !!gol.cancelado;
  const tituloResenha = ehLance
    ? "Lance importante"
    : gol.jogador
      ? `Gol de ${gol.jogador.nome}`
      : "Gol";

  return (
    <View style={[styles.card, cancelado && styles.cardCancelado]}>
      <View style={styles.cabecalho}>
        <View style={{ flex: 1 }}>
          <View style={styles.tituloLinha}>
            {cancelado ? (
              <Ban size={15} color={cores.erroTexto} />
            ) : ehLance ? (
              <Sparkles size={15} color={cores.orange} />
            ) : (
              <Goal size={15} color={cores.teal} />
            )}
            <Text style={styles.titulo}>
              {cancelado ? "Gol cancelado" : ehLance ? "Lance importante" : "Gol marcado"}
            </Text>
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

      {gol.cancelado && (
        <View style={styles.avisoCancelado}>
          <Ban size={14} color={cores.erroTexto} style={{ marginTop: 1 }} />
          <Text style={styles.avisoCanceladoTexto}>
            Cancelado por <Text style={styles.avisoCanceladoNome}>{gol.cancelado.porNome}</Text>. Esse
            gol não conta no placar nem no ranking. O replay fica aqui só como registro.
          </Text>
        </View>
      )}

      {temVideoNuvem ? (
        <View style={styles.corpo}>
          <PlayerReplay
            key={videoAtual.link}
            link={videoAtual.link}
            legenda={`Toque pra ver o replay${
              videosNuvem.length > 1 ? ` · câmera ${videoAtual.idCamera}` : ""
            }`}
            autoIniciar={jaTocou}
            aoIniciar={() => setJaTocou(true)}
          />
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
          <BotaoBaixarVideo
            link={videoAtual.link}
            nomeArquivo={nomeArquivoReplay(gol.tipo, gol.golId)}
          />
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
            Gol adicionado pelo admin depois da partida. Não tem replay.
          </Text>
        </View>
      ) : (
        <View style={[styles.aviso, styles.avisoTeal]}>
          <VideoOff size={20} color={cores.slate500} />
          <Text style={[styles.avisoTexto, { color: cores.slate400 }]}>Replay ainda não chegou</Text>
        </View>
      )}

      {comentar && temVideoNuvem && gol.pedidoReplayId && !cancelado && (
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
      {(!comentar || !temVideoNuvem || !gol.pedidoReplayId || cancelado) && (
        <View style={{ height: 14 }} />
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
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    overflow: "hidden",
  },
  cardCancelado: { borderColor: "rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.04)" },
  avisoCancelado: {
    marginHorizontal: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avisoCanceladoTexto: { flex: 1, fontSize: 12, lineHeight: 17, color: cores.erroTexto },
  avisoCanceladoNome: { fontWeight: "700" },
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
  registrado: { fontSize: 12, color: cores.slate400, textAlign: "right" },
  registradoNome: { color: cores.slate200, fontWeight: "600" },
  migracao: { fontSize: 12, color: "rgba(251, 191, 36, 0.8)", textAlign: "right" },
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
