import { useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollViewProps,
} from "react-native";

// ScrollView padrão das telas com formulário. Faz duas coisas que uma ScrollView comum
// não faz:
// 1. `KeyboardAvoidingView` em volta: quando o teclado abre, a área rolável encolhe pra
//    parte que sobra, em vez do teclado ficar em cima dos campos de baixo.
// 2. Rola até o campo que ganhou foco: depois que o teclado sobe, se o campo (ex.: o
//    "Título" no topo ou a "Mensagem" no fim) ficou fora da área visível, a lista rola
//    o suficiente pra ele aparecer.
//
// Use no lugar de `ScrollView` em toda tela logada que tenha `TextInput` no meio da rolagem
// (os modais já se ajustam sozinhos no Android). Aceita as mesmas props da ScrollView.
export function ScrollTeclado({ children, onScroll, ...props }: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  // A ScrollView em si não mede posição na janela; o View que a envolve ocupa o mesmo espaço.
  const areaRef = useRef<View>(null);
  const scrollY = useRef(0);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidShow", (e) => {
      // Espera o KeyboardAvoidingView terminar de encolher a área rolável.
      setTimeout(() => {
        const campo = TextInput.State.currentlyFocusedInput?.();
        const scroll = scrollRef.current;
        const area = areaRef.current;
        if (!campo || !scroll || !area) return;
        area.measureInWindow((_x, topo, _w, altura) => {
          campo.measureInWindow((_cx, campoTopo, _cw, campoAltura) => {
            // Limite visível: fim da lista ou topo do teclado, o que vier primeiro.
            const limite = Math.min(topo + altura, e.endCoordinates.screenY) - 16;
            const excesso = campoTopo + campoAltura - limite;
            if (excesso > 0) {
              scroll.scrollTo({ y: scrollY.current + excesso, animated: true });
            }
          });
        });
      }, 300);
    });
    return () => sub.remove();
  }, []);

  function aoRolar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollY.current = e.nativeEvent.contentOffset.y;
    onScroll?.(e);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <View ref={areaRef} style={styles.flex} collapsable={false}>
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          {...props}
          onScroll={aoRolar}
        >
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
