import { Text as TextRN, StyleSheet, type TextProps } from "react-native";

// Todo texto do app usa Space Grotesk, igual o site (globals.css põe
// `--font-sans: Space Grotesk` em tudo). O RN não herda `fontFamily` entre
// componentes nem combina uma família custom com `fontWeight`, então este
// wrapper resolve a família certa a partir do peso declarado no style. As telas
// importam `Text` daqui em vez de "react-native".
//
// Geist Mono (eyebrow) e qualquer outra família entram explícitas via
// `fontFamily` no style e são respeitadas como estão.

const PESO_PARA_FAMILIA: Record<string, string> = {
  "300": "SpaceGrotesk_300Light",
  "400": "SpaceGrotesk_400Regular",
  normal: "SpaceGrotesk_400Regular",
  "500": "SpaceGrotesk_500Medium",
  "600": "SpaceGrotesk_600SemiBold",
  "700": "SpaceGrotesk_700Bold",
  "800": "SpaceGrotesk_700Bold",
  "900": "SpaceGrotesk_700Bold",
  bold: "SpaceGrotesk_700Bold",
};

export const FAMILIA_MONO = "GeistMono_400Regular";

export function familiaDoPeso(peso: string | number | undefined): string {
  return PESO_PARA_FAMILIA[String(peso ?? "400")] ?? "SpaceGrotesk_400Regular";
}

export function Text({ style, ...rest }: TextProps) {
  const plano = StyleSheet.flatten(style) ?? {};
  const familia = plano.fontFamily ?? familiaDoPeso(plano.fontWeight);
  return <TextRN {...rest} style={[style, { fontFamily: familia }]} />;
}
