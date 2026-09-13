import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { Text } from "@/ui/Texto";
import { cores, fontes } from "@/tema";

// Comemoração de gol/lance na tela "Ao vivo", espelho do site
// (weracha-site/app/grupos/[id]/partidas/[partidaId]/ao-vivo/page.tsx + o
// keyframe `gol-confete` do globals.css): título grande "GOOOL!/LANCE!" +
// partículas de emoji que explodem em leque. O parent remonta via `key` a cada
// gol; `onFim` limpa o estado quando a animação termina.

const EMOJIS = ["⚽", "🎉", "🔥", "🥳"];
const N_PARTICULAS = 14;

type Particula = { emoji: string; tx: number; ty: number };

function gerarParticulas(): Particula[] {
  return Array.from({ length: N_PARTICULAS }, (_, i) => {
    const angulo = (Math.PI * 2 * i) / N_PARTICULAS + Math.random() * 0.4;
    const distancia = 100 + Math.random() * 100;
    return {
      emoji: EMOJIS[i % EMOJIS.length],
      tx: Math.cos(angulo) * distancia,
      ty: Math.sin(angulo) * distancia,
    };
  });
}

export function Comemoracao({
  titulo,
  sub,
  onFim,
}: {
  titulo: string;
  sub?: string;
  onFim: () => void;
}) {
  const particulas = useMemo(() => gerarParticulas(), []);
  const [texto] = useState(() => new Animated.Value(0)); // 0 → 1 → 0
  const [explosao] = useState(() => new Animated.Value(0)); // 0 → 1

  // `onFim` é uma closure nova a cada render do pai (ex.: o ticker de 1s da
  // tela de ao vivo). Guardar num ref em vez de listar como dependência: senão
  // o efeito de baixo reinicia a animação (e o Animated.stop() do cleanup
  // cancela com finished:false) toda vez que o pai re-renderiza, e a
  // comemoração nunca termina de rodar pra chamar onFim de verdade.
  const onFimRef = useRef(onFim);
  useEffect(() => {
    onFimRef.current = onFim;
  }, [onFim]);

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.sequence([
        Animated.timing(texto, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(1400),
        Animated.timing(texto, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]),
      Animated.timing(explosao, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);
    anim.start(({ finished }) => {
      if (finished) onFimRef.current();
    });
    return () => anim.stop();
  }, [texto, explosao]);

  return (
    <View pointerEvents="none" style={styles.raiz}>
      <View style={styles.centro}>
        {particulas.map((p, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.particula,
              {
                opacity: explosao.interpolate({
                  inputRange: [0, 0.15, 1],
                  outputRange: [0, 1, 0],
                }),
                transform: [
                  { translateX: explosao.interpolate({ inputRange: [0, 1], outputRange: [0, p.tx] }) },
                  { translateY: explosao.interpolate({ inputRange: [0, 1], outputRange: [0, p.ty] }) },
                  { scale: explosao.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.1] }) },
                ],
              },
            ]}
          >
            {p.emoji}
          </Animated.Text>
        ))}

        <Animated.View
          style={{
            alignItems: "center",
            opacity: texto,
            transform: [
              { scale: texto.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
            ],
          }}
        >
          <Text style={styles.titulo}>{titulo}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 30,
  },
  centro: { alignItems: "center", justifyContent: "center" },
  particula: { position: "absolute", fontSize: 30 },
  titulo: {
    fontFamily: fontes.bold,
    fontSize: 72,
    color: cores.orange,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
  sub: {
    fontFamily: fontes.bold,
    fontSize: 28,
    color: cores.branco,
    textAlign: "center",
    marginTop: 4,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 16,
  },
});
