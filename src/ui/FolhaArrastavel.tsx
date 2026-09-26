import { useEffect, type ReactNode } from "react";
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useBlurTarget } from "@/ui/BlurTarget";

// Folha de baixo arrastável (bottom sheet no estilo nativo): barrinha no topo,
// arrasta pra baixo pra fechar, fundo escurece junto com o arrasto. Base do
// MenuAcoes e dos formulários de baixo (ex.: FormNovoJogador).
//
// `arrastarPor`:
// - "folha": a folha inteira arrasta (menus, só têm botões);
// - "topo": só a barrinha + o `topo` arrastam, pra não brigar com os campos
//   de um formulário. Com o teclado aberto, o primeiro puxão só fecha o
//   teclado; com ele fechado, o próximo fecha a folha.
//
// O Modal é controlado pelo pai (`aberto`). Os fechamentos iniciados aqui
// (arrastar, tocar fora, voltar do Android, ou `fechar()` recebido pelos
// filhos) animam a descida primeiro e só então chamam `onFechar` e, se
// passado, `depois` — pra ação que abre outro Modal não empilhar com este.
// Fechar pelo pai (`aberto` vira false) desmonta na hora, sem animação.

const ALTURA_TELA = Dimensions.get("window").height;
// Arrastou mais que isso da altura da folha (ou soltou rápido pra baixo): fecha.
const FRACAO_PRA_FECHAR = 0.3;
const VELOCIDADE_PRA_FECHAR = 900;

export type FecharFolha = (depois?: () => void) => void;

export function FolhaArrastavel({
  aberto,
  onFechar,
  arrastarPor = "folha",
  topo,
  children,
}: {
  aberto: boolean;
  onFechar: () => void;
  arrastarPor?: "folha" | "topo";
  /** Fica logo abaixo da barrinha e, em `arrastarPor="topo"`, também arrasta. */
  topo?: ReactNode;
  children: (fechar: FecharFolha) => ReactNode;
}) {
  const blurTarget = useBlurTarget();
  const insets = useSafeAreaInsets();
  // No Android o Modal (sem navigationBarTranslucent) já termina acima da
  // barra de navegação; somar o inset de novo dobrava o espaço embaixo. No
  // iOS o Modal vai até a borda e precisa desviar do indicador de gesto.
  const folgaInferior = Platform.OS === "ios" ? insets.bottom : 0;
  // Posição da folha = quanto falta abrir (altura × (1 − progresso)) + arrasto.
  // Separados pra abertura não depender da ordem entre o efeito abaixo e o
  // onLayout da folha: antes da medida, `altura` é a da tela (fora de vista) e
  // a posição se corrige sozinha quando a medida chega.
  const altura = useSharedValue(ALTURA_TELA);
  const progresso = useSharedValue(0);
  const arrasto = useSharedValue(0);
  // Trava contra fechar duas vezes (ex.: dois toques rápidos num item rodariam a ação 2×).
  const fechando = useSharedValue(false);
  const tecladoAberto = useSharedValue(false);
  // O gesto atual só serviu pra fechar o teclado: a folha não acompanha.
  const soTeclado = useSharedValue(false);

  useEffect(() => {
    if (!aberto) return;
    fechando.set(false);
    arrasto.set(0);
    progresso.set(0);
    progresso.set(withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
  }, [aberto, fechando, arrasto, progresso]);

  useEffect(() => {
    const mostrou = Keyboard.addListener("keyboardDidShow", () => tecladoAberto.set(true));
    const escondeu = Keyboard.addListener("keyboardDidHide", () => tecladoAberto.set(false));
    return () => {
      mostrou.remove();
      escondeu.remove();
    };
  }, [tecladoAberto]);

  function concluir(depois?: () => void) {
    onFechar();
    depois?.();
  }

  function fecharTeclado() {
    Keyboard.dismiss();
  }

  const fechar: FecharFolha = (depois) => {
    if (fechando.get()) return;
    fechando.set(true);
    Keyboard.dismiss();
    arrasto.set(
      withTiming(altura.get() + 40, { duration: 220, easing: Easing.in(Easing.cubic) }, (fim) => {
        if (fim) scheduleOnRN(concluir, depois);
      })
    );
  };

  const gesto = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      soTeclado.set(tecladoAberto.get());
      if (tecladoAberto.get()) scheduleOnRN(fecharTeclado);
    })
    .onUpdate((e) => {
      if (fechando.get() || soTeclado.get()) return;
      // Pra baixo segue o dedo; pra cima resiste (a folha já está no tamanho do conteúdo).
      arrasto.set(e.translationY >= 0 ? e.translationY : -Math.pow(-e.translationY, 0.6));
    })
    .onEnd((e) => {
      if (fechando.get() || soTeclado.get()) return;
      if (arrasto.get() > altura.get() * FRACAO_PRA_FECHAR || e.velocityY > VELOCIDADE_PRA_FECHAR) {
        fechando.set(true);
        arrasto.set(
          withTiming(altura.get() + 40, { duration: 180, easing: Easing.out(Easing.quad) }, (fim) => {
            if (fim) scheduleOnRN(concluir);
          })
        );
      } else {
        arrasto.set(withSpring(0, { damping: 26, stiffness: 300, overshootClamping: true }));
      }
    });

  const estiloFolha = useAnimatedStyle(() => ({
    transform: [{ translateY: altura.get() * (1 - progresso.get()) + arrasto.get() }],
  }));
  const estiloFundo = useAnimatedStyle(() => ({
    opacity: interpolate(
      altura.get() * (1 - progresso.get()) + arrasto.get(),
      [0, altura.get()],
      [1, 0],
      "clamp"
    ),
  }));

  const cabecalho = (
    <View>
      <View style={styles.alcaAlvo}>
        <View style={styles.alca} />
      </View>
      {topo}
    </View>
  );

  const folha = (
    <Animated.View
      style={[styles.folha, { paddingBottom: 16 + folgaInferior }, estiloFolha]}
      onLayout={(e) => altura.set(e.nativeEvent.layout.height)}
    >
      {arrastarPor === "topo" ? <GestureDetector gesture={gesto}>{cabecalho}</GestureDetector> : cabecalho}
      {children(fechar)}
    </Animated.View>
  );

  return (
    <Modal visible={aberto} transparent animationType="none" onRequestClose={() => fechar()}>
      <GestureHandlerRootView style={styles.raiz}>
        <Animated.View style={[StyleSheet.absoluteFill, estiloFundo]}>
          <BlurView
            intensity={40}
            tint="dark"
            blurMethod="dimezisBlurView"
            blurTarget={blurTarget}
            style={styles.fundo}
          >
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => fechar()}
              accessibilityRole="button"
              accessibilityLabel="Fechar"
            />
          </BlurView>
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.raiz}
          pointerEvents="box-none"
        >
          {arrastarPor === "folha" ? <GestureDetector gesture={gesto}>{folha}</GestureDetector> : folha}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1, justifyContent: "flex-end" },
  fundo: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  folha: {
    backgroundColor: "#12161f",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
  },
  // Área de toque/arrasto maior que a barrinha em si.
  alcaAlvo: { alignItems: "center", paddingTop: 10, paddingBottom: 14 },
  alca: { width: 40, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)" },
});
