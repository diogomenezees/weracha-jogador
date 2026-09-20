import { useState, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { AvatarJogador } from "@/ui/AvatarJogador";
import { CardJogadorPartida, Eyebrow } from "@/partida/ui";
import {
  ArrowDownUp,
  ArrowLeftRight,
  Ban,
  EllipsisVertical,
  Goal,
  MonitorPlay,
  PenLine,
  Smartphone,
  Star,
  Users,
  Video,
  VideoOff,
} from "@/ui/Icone";
import { formatarDiaSemanaData, formatarHora } from "@/partidas";
import { cores, raio } from "@/tema";
import type { GolComVideos } from "@/contrato/tipos";

type Modo = "AGRUPADO" | "CRONOLOGICO";

export type JogadorDoPainel = {
  jogadorId: string;
  nome: string;
  score: number;
  apelido: string | null;
  fotoUrl: string | null;
  posicaoNome: string | null;
};

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Aba "Artilheiros" da tela de resultado: porte de `PainelGols` do site
// (weracha-site/components/painel-gols.tsx). A mesma informação (quem fez, quantos,
// quando) em dois formatos, alternados por um botão à direita: agrupado por jogador
// (padrão) e linha do tempo. Tocar num jogador (agrupado) ou numa linha (linha do
// tempo) chama `onAbrirReplayJogador` / `onAbrirReplayGol`; quem cuida de mostrar os
// replays é a tela (inline, no lugar desta lista). O menu ⋮ da linha (cancelar,
// migrar, reativar) é da tela também: aqui só avisa qual gol foi tocado.
export function PainelGols({
  gols,
  golsPorJogador,
  golsGravadosPorJogador,
  jogadores,
  meuId,
  dataPartida,
  mostrarScore = false,
  mostrarStatusGravacao = true,
  slotDireita,
  podeEditarGols = false,
  onMenuGol,
  onAbrirReplayJogador,
  onAbrirReplayGol,
}: {
  /** Todos os gols da partida, mais recente primeiro, com jogador/vídeos/marcadoPor/origem. */
  gols: GolComVideos[];
  golsPorJogador: Record<string, number>;
  golsGravadosPorJogador: Record<string, number>;
  jogadores: JogadorDoPainel[];
  meuId: string | null;
  dataPartida: Date;
  mostrarScore?: boolean;
  /**
   * Ícone de nuvem/celular/sem-replay por gol + legenda no modo linha do tempo. Desliga
   * quando a partida nunca teve o We Racha Cam avisando que gravou (`cameraAtiva`).
   */
  mostrarStatusGravacao?: boolean;
  /** Ex.: botão de Score do admin. */
  slotDireita?: ReactNode;
  /** Admin dentro da janela de edição: liga o menu ⋮ de cada linha da linha do tempo. */
  podeEditarGols?: boolean;
  onMenuGol?: (gol: GolComVideos) => void;
  /** Só é chamado pra jogador com pelo menos um gol gravado. */
  onAbrirReplayJogador: (jogadorId: string) => void;
  onAbrirReplayGol: (golId: string) => void;
}) {
  const [modo, setModo] = useState<Modo>("AGRUPADO");

  const scorePorJogador = new Map(jogadores.map((j) => [j.jogadorId, j.score]));

  const goleadores = jogadores
    .map((j) => ({
      ...j,
      gols: golsPorJogador[j.jogadorId] ?? 0,
      gravados: golsGravadosPorJogador[j.jogadorId] ?? 0,
    }))
    .filter((j) => j.gols > 0)
    .sort((a, b) => b.gols - a.gols || a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <View style={{ gap: 10 }}>
      <View style={styles.topo}>
        <View style={{ flexShrink: 1 }}>
          <Eyebrow>{modo === "AGRUPADO" ? "Gols por jogador" : "Linha do tempo dos gols"}</Eyebrow>
        </View>
        <View style={styles.topoDireita}>
          <View style={styles.ordGrupo}>
            {(
              [
                ["AGRUPADO", Users, "Ver agrupado por jogador"],
                ["CRONOLOGICO", ArrowDownUp, "Ver em ordem cronológica"],
              ] as const
            ).map(([v, Icone, rotulo], i) => (
              <Pressable
                key={v}
                accessibilityLabel={rotulo}
                style={[styles.ordBtn, i > 0 && styles.ordBtnDivisor, modo === v && styles.ordBtnAtivo]}
                onPress={() => setModo(v)}
              >
                <Icone size={16} color={modo === v ? cores.dark : cores.slate400} />
              </Pressable>
            ))}
          </View>
          {slotDireita}
        </View>
      </View>

      {gols.length === 0 ? (
        <View style={styles.vazio}>
          <Text style={styles.vazioTexto}>Nenhum gol registrado ainda.</Text>
        </View>
      ) : modo === "AGRUPADO" ? (
        <View style={{ gap: 10 }}>
          {goleadores.map((j) => (
            <CardJogadorPartida
              key={j.jogadorId}
              id={j.jogadorId}
              nome={j.nome}
              apelido={j.apelido}
              fotoUrl={j.fotoUrl}
              posicaoNome={j.posicaoNome}
              score={j.score}
              mostrarScore={mostrarScore}
              souEu={j.jogadorId === meuId}
              onAbrirPerfil={j.gravados > 0 ? () => onAbrirReplayJogador(j.jogadorId) : undefined}
              direita={
                <View style={styles.agrupadoDireita}>
                  <Text style={styles.agrupadoGols}>
                    {j.gols} gol{j.gols > 1 ? "s" : ""}
                  </Text>
                  {j.gravados > 0 && (
                    <View style={styles.agrupadoGravLinha}>
                      <Video size={11} color={cores.slate400} />
                      <Text style={styles.agrupadoGrav}>
                        {j.gravados} gravado{j.gravados > 1 ? "s" : ""}
                      </Text>
                    </View>
                  )}
                </View>
              }
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {gols.map((g) => {
            const cancelado = !!g.cancelado;
            const souGol = g.jogador?.id === meuId;
            // Gol cancelado nunca abre replay (sai de todas as telas de vídeo). Vídeo
            // NUVEM tem player; só LOCAL = o Cam gravou mas só salvou no celular (o card
            // abre e mostra "salvo no celular").
            const temVideoNuvem = g.videos.some((v) => v.origem === "NUVEM") && !cancelado;
            const soLocal =
              !temVideoNuvem && g.videos.some((v) => v.origem === "LOCAL") && !cancelado;
            const temVideo = temVideoNuvem || soLocal;
            const scoreJogador = g.jogador ? scorePorJogador.get(g.jogador.id) : undefined;
            const nome = g.jogador?.nome ?? "Ex-jogador";
            const criadoEm = new Date(g.criadoEm);

            let IconeTitulo: typeof Goal = Goal;
            let corIconeTitulo: string = cores.teal;
            if (cancelado) {
              IconeTitulo = Ban;
              corIconeTitulo = cores.erroTexto;
            } else if (g.migracao) {
              IconeTitulo = ArrowLeftRight;
              corIconeTitulo = cores.ambar;
            } else if (g.origem === "CORRECAO") {
              IconeTitulo = PenLine;
              corIconeTitulo = cores.ambar;
            }

            const linha = (
              <View style={styles.linha}>
                <View style={cancelado && styles.avatarCancelado}>
                  <AvatarJogador
                    id={g.jogador?.id}
                    nome={nome}
                    fotoUrl={g.jogador?.fotoUrl}
                    tamanho={40}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.tituloLinha}>
                    <IconeTitulo size={13} color={corIconeTitulo} />
                    <Text
                      style={[styles.titulo, cancelado && styles.tituloCancelado]}
                      numberOfLines={1}
                    >
                      Gol de <Text style={styles.tituloNome}>{nome}</Text>
                    </Text>
                  </View>
                  {!cancelado && (g.jogador?.apelido || (mostrarScore && scoreJogador != null)) && (
                    <View style={styles.apelidoLinha}>
                      {g.jogador?.apelido ? (
                        <Text style={styles.apelido} numberOfLines={1}>
                          {g.jogador.apelido}
                        </Text>
                      ) : null}
                      {mostrarScore && scoreJogador != null && (
                        <View style={styles.apelidoLinha}>
                          {g.jogador?.apelido ? <Text style={styles.apelido}>·</Text> : null}
                          <Star size={11} color={cores.slate400} />
                          <Text style={styles.apelido}>Score {scoreJogador}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {g.marcadoPor && (
                    <Text style={styles.registradoPor} numberOfLines={1}>
                      {g.origem === "CORRECAO" ? "Corrigido por " : "Registrado por "}
                      {g.marcadoPor.nome}
                    </Text>
                  )}
                  {g.migracao && !cancelado && (
                    <Text style={styles.nota} numberOfLines={1}>
                      Movido de {g.migracao.deNome} por {g.migracao.porNome}
                    </Text>
                  )}
                  {cancelado && (
                    <Text style={styles.notaCancelado} numberOfLines={1}>
                      Cancelado por {g.cancelado!.porNome}
                    </Text>
                  )}
                </View>
                <View style={styles.direita}>
                  {!mesmoDia(criadoEm, dataPartida) && (
                    <Text style={styles.data}>{formatarDiaSemanaData(criadoEm)}</Text>
                  )}
                  <Text style={[styles.hora, cancelado && styles.horaCancelada]}>
                    {formatarHora(criadoEm)}
                  </Text>
                  {cancelado ? (
                    <Ban size={16} color={cores.erroTexto} accessibilityLabel="Gol cancelado" />
                  ) : !mostrarStatusGravacao ? null : temVideoNuvem ? (
                    <MonitorPlay size={16} color={cores.teal} accessibilityLabel="Replay na nuvem" />
                  ) : soLocal ? (
                    <Smartphone
                      size={16}
                      color={cores.teal}
                      accessibilityLabel="Replay salvo no celular"
                    />
                  ) : (
                    <VideoOff size={16} color={cores.slate500} accessibilityLabel="Sem replay" />
                  )}
                </View>
              </View>
            );

            return (
              <View
                key={g.golId}
                style={[
                  styles.card,
                  cancelado && styles.cardCancelado,
                  souGol && !cancelado && styles.cardEu,
                ]}
              >
                <Pressable
                  style={{ flex: 1 }}
                  disabled={!temVideo}
                  onPress={() => onAbrirReplayGol(g.golId)}
                  accessibilityLabel={temVideo ? `Ver replay do gol de ${nome}` : undefined}
                >
                  {linha}
                </Pressable>
                {podeEditarGols && onMenuGol && (
                  <Pressable
                    style={styles.menu}
                    hitSlop={8}
                    onPress={() => onMenuGol(g)}
                    accessibilityLabel={`Opções do gol de ${nome}`}
                  >
                    <EllipsisVertical size={18} color={cores.slate400} />
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}

      {mostrarStatusGravacao && modo === "CRONOLOGICO" && gols.length > 0 && (
        <View style={styles.legenda}>
          <ItemLegenda Icone={MonitorPlay} corIcone={cores.teal} texto="Replay na nuvem" />
          <ItemLegenda Icone={Smartphone} corIcone={cores.teal} texto="Salvo no celular que gravou" />
          <ItemLegenda Icone={VideoOff} corIcone={cores.slate500} texto="Sem replay" />
        </View>
      )}
    </View>
  );
}

function ItemLegenda({
  Icone,
  corIcone,
  texto,
}: {
  Icone: typeof MonitorPlay;
  corIcone: string;
  texto: string;
}) {
  return (
    <View style={styles.legendaItem}>
      <Icone size={13} color={corIcone} />
      <Text style={styles.legendaTexto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  topoDireita: { flexDirection: "row", alignItems: "center", gap: 8 },
  ordGrupo: {
    flexDirection: "row",
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    overflow: "hidden",
  },
  ordBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  ordBtnDivisor: { borderLeftWidth: 1, borderLeftColor: cores.avisoBorda },
  ordBtnAtivo: { backgroundColor: cores.teal },
  vazio: {
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 14,
  },
  vazioTexto: { fontSize: 13, color: cores.slate400 },
  agrupadoDireita: { alignItems: "flex-end", gap: 3 },
  agrupadoGols: { fontSize: 14, fontWeight: "700", color: cores.teal },
  agrupadoGravLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  agrupadoGrav: { fontSize: 11, color: cores.slate400 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: raio.campo,
    borderWidth: 1,
    borderColor: cores.cardBorda,
    backgroundColor: cores.cardFundo,
    padding: 12,
  },
  cardCancelado: {
    borderColor: "rgba(239, 68, 68, 0.2)",
    backgroundColor: "rgba(239, 68, 68, 0.04)",
  },
  cardEu: { borderColor: cores.teal, borderWidth: 2 },
  linha: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatarCancelado: { opacity: 0.5 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  titulo: { flexShrink: 1, fontSize: 14, color: cores.branco },
  tituloNome: { fontWeight: "700" },
  tituloCancelado: { color: cores.slate500, textDecorationLine: "line-through" },
  apelidoLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  apelido: { fontSize: 12, color: cores.slate400 },
  registradoPor: { fontSize: 11, color: cores.slate500, marginTop: 2 },
  nota: { fontSize: 11, color: "rgba(251, 191, 36, 0.8)" },
  notaCancelado: { fontSize: 11, fontWeight: "600", color: "rgba(248, 113, 113, 0.9)" },
  direita: { alignItems: "flex-end", gap: 4 },
  data: { fontSize: 10, color: cores.slate500 },
  hora: { fontSize: 14, fontWeight: "700", color: cores.teal },
  horaCancelada: { color: cores.slate600 },
  menu: { paddingHorizontal: 2 },
  legenda: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 4, paddingTop: 2 },
  legendaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendaTexto: { fontSize: 11, color: cores.slate500 },
});
