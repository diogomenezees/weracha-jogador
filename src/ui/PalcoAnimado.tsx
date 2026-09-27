import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { cores, raio } from "@/tema";

// "Palco" dos carrosséis de apresentação (intro de antes do login e onboarding
// pós-login): peças de UI de mentira espalhadas e levemente inclinadas, que entram
// animadas quando o slide fica ativo e depois flutuam devagar, com um brilho suave
// atrás.

export type CorPalco = "teal" | "orange";

export function rgba(cor: CorPalco, alpha: number) {
  const base = cor === "teal" ? "31, 179, 163" : "242, 140, 30";
  return `rgba(${base}, ${alpha})`;
}

// Fundo opaco das peças (não translúcido, porque elas se sobrepõem).
export const FUNDO_PECA = "#1a1f29";

// Brilho atrás do palco: dois círculos concêntricos translúcidos.
export function Halo({ cor, tamanho }: { cor: CorPalco; tamanho: number }) {
  return (
    <View pointerEvents="none" style={styles.haloCentro}>
      <View
        style={{
          position: "absolute",
          width: tamanho,
          height: tamanho,
          borderRadius: tamanho / 2,
          backgroundColor: rgba(cor, 0.05),
        }}
      />
      <View
        style={{
          width: tamanho * 0.62,
          height: tamanho * 0.62,
          borderRadius: tamanho,
          backgroundColor: rgba(cor, 0.07),
        }}
      />
    </View>
  );
}

// Área fixa onde as peças são posicionadas em absoluto (proporcional à largura).
export function Palco({ palco, children }: { palco: number; children: React.ReactNode }) {
  return <View style={{ width: palco, height: palco * 0.9 }}>{children}</View>;
}

// Peça do palco: entra (sobe + aparece + cresce) quando o slide fica ativo, com
// atraso escalonado, e depois flutua devagar. Sai do ar ao deixar o slide, pra
// entrar de novo na volta.
export function Peca({
  ativo,
  atraso = 0,
  flutua = 5,
  giro = "0deg",
  style,
  children,
}: {
  ativo: boolean;
  atraso?: number;
  flutua?: number;
  giro?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const [entrada] = useState(() => new Animated.Value(0));
  const [boia] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!ativo) {
      entrada.setValue(0);
      return;
    }
    const anim = Animated.spring(entrada, {
      toValue: 1,
      delay: atraso,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [ativo, atraso, entrada]);

  useEffect(() => {
    const meia = 1800 + atraso * 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(boia, { toValue: 1, duration: meia, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(boia, { toValue: 0, duration: meia, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [atraso, boia]);

  return (
    <Animated.View
      style={[
        { position: "absolute" },
        style,
        {
          opacity: entrada,
          transform: [
            { translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
            { translateY: boia.interpolate({ inputRange: [0, 1], outputRange: [0, -flutua] }) },
            { scale: entrada.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
            { rotate: giro },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const sombra = {
  shadowColor: "#000",
  shadowOpacity: 0.35,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 9,
} as const;

// Estilos base das peças, compartilhados entre os palcos.
export const pecaEstilos = StyleSheet.create({
  card: {
    borderRadius: raio.card,
    borderWidth: 1,
    backgroundColor: FUNDO_PECA,
    padding: 14,
    gap: 6,
    ...sombra,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    ...sombra,
  },
  chipTexto: { fontSize: 13, fontWeight: "700", color: cores.branco },
});

const styles = StyleSheet.create({
  haloCentro: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
