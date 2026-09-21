import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { useEvent } from "expo";
import { Image } from "expo-image";
import { Text } from "@/ui/Texto";

import { Play, VideoOff } from "@/ui/Icone";
import { cores, raio } from "@/tema";

// `expo-video` é módulo nativo: num APK/dev client compilado antes de ele entrar no app, o
// import lança "Cannot find native module 'ExpoVideo'" já na carga do arquivo e derruba as
// telas que importam este componente (tela vermelha na abertura). Carrega com try/catch
// pra esse build antigo só cair no comportamento anterior (abrir no navegador).
type ExpoVideo = typeof import("expo-video");
let expoVideo: ExpoVideo | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoVideo = require("expo-video") as ExpoVideo;
} catch {
  expoVideo = null;
}

// Player embutido do replay (o equivalente ao <video controls> do site). O vídeo só é
// montado quando o jogador toca no pôster: cada VideoView segura um decoder de hardware
// no Android, e uma lista de replays com dezenas deles montando de uma vez estoura o
// limite de decoders e trava a rolagem (o site faz lazy-mount pelo mesmo motivo).
//
// Só um replay toca por vez: ao iniciar outro, o anterior volta pro pôster.
let pararAtivo: (() => void) | null = null;

// Capa do pôster: o primeiro quadro do vídeo, como o `<video preload="metadata">` do site.
// Sai de `generateThumbnailsAsync` do expo-video (no Android, um MediaMetadataRetriever
// que lê o quadro direto da URL). Ela exige uma instância de player com a fonte, então cada
// capa cria um player só pra isso e o libera em seguida. Fila de 1 em 1: uma lista com
// vários replays não pode subir vários players (e downloads) de uma vez, mesmo motivo do
// lazy-mount do vídeo. Guardada por link, pra voltar pra aba e não gerar de novo.
type Capa = import("expo-video").VideoThumbnail;
const capas = new Map<string, Capa>();
const TEMPO_MAX_CAPA_MS = 15_000;
let filaCapas: Promise<unknown> = Promise.resolve();

function pedirCapa(link: string, aindaQuer: () => boolean): Promise<Capa | null> {
  const pronta = capas.get(link);
  if (pronta) return Promise.resolve(pronta);
  const modulo = expoVideo;
  if (!modulo) return Promise.resolve(null);

  const tarefa = filaCapas.then(async (): Promise<Capa | null> => {
    // O card pode ter saído da tela enquanto esperava a vez.
    if (!aindaQuer()) return null;
    const player = modulo.createVideoPlayer(link);
    try {
      const [capa] = await Promise.race([
        player.generateThumbnailsAsync(0, { maxWidth: 640 }),
        new Promise<never>((_, rejeitar) =>
          setTimeout(() => rejeitar(new Error("capa demorou")), TEMPO_MAX_CAPA_MS)
        ),
      ]);
      if (capa) capas.set(link, capa);
      return capa ?? null;
    } catch {
      return null;
    } finally {
      player.release();
    }
  });
  filaCapas = tarefa;
  return tarefa;
}

export function PlayerReplay({
  link,
  legenda,
  autoIniciar = false,
  aoIniciar,
}: {
  link: string;
  /** Texto do pôster (ex.: "Toque pra ver o replay · câmera 2"). */
  legenda: string;
  /** Já começa tocando (troca de câmera de um vídeo que o jogador já tinha aberto). */
  autoIniciar?: boolean;
  aoIniciar?: () => void;
}) {
  const [ativo, setAtivo] = useState(autoIniciar);
  const [capa, setCapa] = useState<Capa | null>(() => capas.get(link) ?? null);
  const idRef = useRef({});

  // Sem capa enquanto toca (o vídeo ocupa o lugar) e na troca de câmera (o pai remonta o
  // componente por `key`).
  useEffect(() => {
    if (ativo || capa) return;
    let vivo = true;
    void pedirCapa(link, () => vivo).then((c) => {
      if (vivo && c) setCapa(c);
    });
    return () => {
      vivo = false;
    };
  }, [ativo, capa, link]);

  function iniciar() {
    if (!expoVideo) {
      void Linking.openURL(link).catch(() => {});
      return;
    }
    if (pararAtivo) pararAtivo();
    const meuId = idRef.current;
    pararAtivo = () => {
      if (idRef.current === meuId) setAtivo(false);
    };
    setAtivo(true);
    aoIniciar?.();
  }

  // Registra o "parar" também no autoIniciar (troca de câmera monta já ativo).
  useEffect(() => {
    if (!autoIniciar) return;
    const meuId = idRef.current;
    pararAtivo?.();
    pararAtivo = () => {
      if (idRef.current === meuId) setAtivo(false);
    };
    // Só na montagem: o pai troca `key` junto com o link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.caixa}>
      {ativo && expoVideo ? (
        <VideoAtivo link={link} expoVideo={expoVideo} />
      ) : (
        <Pressable style={styles.poster} onPress={iniciar} accessibilityLabel="Reproduzir replay">
          {capa && (
            <>
              <Image
                source={capa}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                transition={200}
              />
              <View style={styles.veuCapa} />
            </>
          )}
          <View style={styles.botaoPlay}>
            <Play size={22} color={cores.branco} fill={cores.branco} />
          </View>
          <Text style={[styles.legenda, capa && styles.legendaSobreCapa]}>{legenda}</Text>
        </Pressable>
      )}
    </View>
  );
}

function VideoAtivo({ link, expoVideo }: { link: string; expoVideo: ExpoVideo }) {
  const { useVideoPlayer, VideoView } = expoVideo;
  const player = useVideoPlayer(link, (p) => {
    p.play();
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });

  return (
    <>
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls
        allowsPictureInPicture={false}
      />
      {status === "loading" && (
        <View style={styles.sobreposicao} pointerEvents="none">
          <ActivityIndicator color={cores.branco} />
        </View>
      )}
      {status === "error" && (
        <View style={styles.sobreposicao}>
          <VideoOff size={22} color={cores.slate500} />
          <Text style={styles.legenda}>Não foi possível carregar o replay</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  // 16:9 fixo (o Cam grava 1280x720): a altura não depende do arquivo, então montar o
  // vídeo depois do toque não faz a lista pular.
  caixa: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: raio.campo,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  poster: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  botaoPlay: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Escurece a capa pro botão e a legenda continuarem legíveis em cima de um quadro claro.
  veuCapa: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0, 0, 0, 0.3)" },
  legenda: { fontSize: 12, color: cores.slate400, textAlign: "center", paddingHorizontal: 12 },
  legendaSobreCapa: { color: cores.branco },
  sobreposicao: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
});
