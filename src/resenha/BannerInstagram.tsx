import { Linking, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Line, Rect, Stop } from "react-native-svg";
import { Text } from "@/ui/Texto";

import {
  INSTAGRAM_URL,
  INSTAGRAM_USUARIO,
  MENSAGENS_BANNER_INSTAGRAM,
} from "@/contrato/bannerInstagram";
import { cores, raio } from "@/tema";

// Faixa de divulgação do Instagram intercalada entre os vídeos da Resenha e de
// Meus replays, espelhando weracha-site/components/banner-instagram.tsx. Onde
// ela entra é decidido por bannerInstagramDepoisDe (src/contrato/bannerInstagram.ts);
// aqui é só o visual. O quadrado com o degradê do Instagram é a única cor de
// marca de terceiro na tela, de propósito: é o que faz a faixa ser reconhecida
// de relance no meio do feed.
//
// Abre com Linking (não com o navegador embutido) pra cair direto no app do
// Instagram quando ele está instalado.

// lucide não tem logo de marca. Glifo do Feather Icons (base do lucide), o
// mesmo do site, desenhado sobre o quadrado com o degradê.
function IconeInstagram() {
  return (
    <Svg width={44} height={44} viewBox="0 0 44 44">
      <Defs>
        <LinearGradient id="degradeInstagram" x1="0" y1="1" x2="1" y2="0">
          <Stop offset="0" stopColor="#f9ce34" />
          <Stop offset="0.5" stopColor="#ee2a7b" />
          <Stop offset="1" stopColor="#6228d7" />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={44} height={44} rx={12} fill="url(#degradeInstagram)" />
      <Rect
        x={12}
        y={12}
        width={20}
        height={20}
        rx={5}
        fill="none"
        stroke={cores.branco}
        strokeWidth={2}
      />
      <Circle cx={22} cy={22} r={4} fill="none" stroke={cores.branco} strokeWidth={2} />
      <Line
        x1={27.5}
        y1={16.5}
        x2={27.51}
        y2={16.5}
        stroke={cores.branco}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function BannerInstagram({ mensagem }: { mensagem: number }) {
  const { titulo, texto } = MENSAGENS_BANNER_INSTAGRAM[mensagem];
  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.pressionado]}
      onPress={() => void Linking.openURL(INSTAGRAM_URL).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`Abrir o perfil @${INSTAGRAM_USUARIO} no Instagram`}
    >
      <IconeInstagram />
      <View style={styles.textos}>
        <Text style={styles.titulo}>{titulo}</Text>
        <Text style={styles.texto}>{texto}</Text>
      </View>
      <View style={styles.seguir}>
        <Text style={styles.seguirTexto}>Seguir</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  pressionado: { backgroundColor: "rgba(255, 255, 255, 0.06)" },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  texto: { fontSize: 12, lineHeight: 16, color: cores.slate400 },
  seguir: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  seguirTexto: { fontSize: 12, fontWeight: "500", color: cores.branco },
});
