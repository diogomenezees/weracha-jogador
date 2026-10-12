import { useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { ChevronRight } from "@/ui/Icone";
import { cores } from "@/tema";

// Linha com rolagem horizontal (Ações rápidas, Destaques dos grupos, Funções do
// grupo). Quando os cards cabem quase certinho na largura, ninguém percebe que
// dá pra arrastar: enquanto houver conteúdo à direita, uma seta sobre um
// degradê no canto direito avisa (e rola ao tocar). Some ao chegar no fim.
// Espelha weracha-site/components/carrossel.tsx.

// Degradê sem lib: faixas com opacidade crescente do fundo da tela.
const FAIXAS = [0.15, 0.35, 0.55, 0.75, 0.9];

export function Carrossel({ children }: { children: ReactNode }) {
  const ref = useRef<ScrollView>(null);
  const largura = useRef(0);
  const conteudo = useRef(0);
  const posicao = useRef(0);
  const [temMais, setTemMais] = useState(false);

  // Folga de 8px: no Android a rolagem para uns pixels antes do fim calculado
  // (densidade fracionária), e sem folga a seta ficava presa no fim da lista.
  function medir() {
    setTemMais(posicao.current + largura.current < conteudo.current - 8);
  }

  // Usa as medidas do próprio evento (não só as guardadas do layout), que são
  // as que o Android usou pra parar a rolagem.
  function aoRolar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    posicao.current = contentOffset.x;
    largura.current = layoutMeasurement.width;
    conteudo.current = contentSize.width;
    medir();
  }

  // Toque na seta: anda ~70% da largura, sem passar do fim (pedir além do fim
  // deixava a rolagem parar antes e a seta não sumia).
  function avancar() {
    const fim = Math.max(0, conteudo.current - largura.current);
    const alvo = Math.min(fim, posicao.current + largura.current * 0.7);
    ref.current?.scrollTo({ x: alvo, animated: true });
    if (alvo >= fim - 8) setTemMais(false);
  }

  return (
    <View>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.linha}
        scrollEventThrottle={32}
        onScroll={aoRolar}
        onMomentumScrollEnd={aoRolar}
        onScrollEndDrag={aoRolar}
        onLayout={(e) => {
          largura.current = e.nativeEvent.layout.width;
          medir();
        }}
        onContentSizeChange={(w) => {
          conteudo.current = w;
          medir();
        }}
      >
        {children}
      </ScrollView>
      {temMais && (
        <View style={styles.borda} pointerEvents="box-none">
          <View style={styles.degrade} pointerEvents="none">
            {FAIXAS.map((o) => (
              <View key={o} style={[styles.faixa, { opacity: o }]} />
            ))}
          </View>
          <Pressable
            accessibilityLabel="Ver mais opções"
            hitSlop={8}
            style={styles.seta}
            onPress={avancar}
          >
            <ChevronRight size={16} color={cores.teal} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { gap: 8 },
  borda: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 56,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  degrade: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, flexDirection: "row" },
  faixa: { flex: 1, backgroundColor: cores.dark },
  seta: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(31, 179, 163, 0.4)",
    backgroundColor: cores.dark,
  },
});
