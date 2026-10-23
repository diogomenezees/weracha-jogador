import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";

// Scroll infinito de FlatList que não trava. O `onEndReached` do RN só dispara
// quando o fim é ALCANÇADO: se nessa hora a próxima página não podia carregar
// (outra carga em andamento, troca de aba), ninguém chama de novo e o "Carregar
// mais" fica parado no fim da lista. Aqui a lista guarda se está perto do fim
// (mesma folga do onEndReachedThreshold: 60% da altura visível) e carrega sempre
// que estiver lá E puder carregar, inclusive logo depois que a carga anterior
// termina.
//
// Uso: espalhar o retorno na FlatList (`{...noFim}`) no lugar de
// onEndReached/onEndReachedThreshold.
export function useCarregarNoFim(podeCarregar: boolean, carregar: () => void) {
  const [pertoDoFim, setPertoDoFim] = useState(false);
  const deslocamento = useRef(0);
  const alturaVisivel = useRef(0);
  const alturaConteudo = useRef(0);
  const carregarRef = useRef(carregar);
  useEffect(() => {
    carregarRef.current = carregar;
  });

  const recalcular = useCallback(() => {
    if (alturaVisivel.current === 0) return;
    const falta = alturaConteudo.current - (deslocamento.current + alturaVisivel.current);
    setPertoDoFim(falta < alturaVisivel.current * 0.6);
  }, []);

  // O atraso deixa o onContentSizeChange da página nova chegar antes: se ela
  // empurrou o fim pra longe, pertoDoFim vira false e a carga é cancelada.
  useEffect(() => {
    if (!pertoDoFim || !podeCarregar) return;
    const t = setTimeout(() => carregarRef.current(), 150);
    return () => clearTimeout(t);
  }, [pertoDoFim, podeCarregar]);

  return {
    scrollEventThrottle: 100,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      deslocamento.current = e.nativeEvent.contentOffset.y;
      alturaVisivel.current = e.nativeEvent.layoutMeasurement.height;
      alturaConteudo.current = e.nativeEvent.contentSize.height;
      recalcular();
    },
    onLayout: (e: LayoutChangeEvent) => {
      alturaVisivel.current = e.nativeEvent.layout.height;
      recalcular();
    },
    onContentSizeChange: (_largura: number, altura: number) => {
      alturaConteudo.current = altura;
      recalcular();
    },
  };
}
