import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Text } from "@/ui/Texto";

import type { CampanhaNoAr } from "@/contrato/tipos";
import { cores, fontes, raio } from "@/tema";

// Banner da campanha de um parceiro intercalado entre os vídeos da Resenha e de
// Meus replays, espelhando weracha-site/components/banner-campanha.tsx. Mesmo
// formato do BannerInstagram pra ler como parte do feed: foto do parceiro no
// lugar do quadrado do Instagram, nome dele como título e o texto da campanha
// embaixo. O toque abre o link da campanha com Linking (cai no app certo
// quando o link é de Instagram, WhatsApp etc.). Onde ele entra:
// bannerDoFeedDepoisDe (src/contrato/bannersDoFeed.ts).
export function BannerCampanha({ campanha }: { campanha: CampanhaNoAr }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.banner, pressed && styles.pressionado]}
      onPress={() => void Linking.openURL(campanha.link).catch(() => {})}
      accessibilityRole="link"
      accessibilityLabel={`${campanha.parceiroNome}, parceiro: ${campanha.texto}`}
    >
      <Image source={{ uri: campanha.parceiroFotoUrl }} style={styles.foto} contentFit="cover" />
      <View style={styles.textos}>
        <View style={styles.tituloLinha}>
          <Text style={styles.titulo} numberOfLines={1}>
            {campanha.parceiroNome}
          </Text>
          <Text style={styles.selo}>PARCEIRO</Text>
        </View>
        <Text style={styles.texto}>{campanha.texto}</Text>
      </View>
      <View style={styles.ver}>
        <Text style={styles.verTexto}>Ver</Text>
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
  foto: { width: 44, height: 44, borderRadius: 12, backgroundColor: cores.superficieMedia },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  tituloLinha: { flexDirection: "row", alignItems: "center", gap: 6 },
  titulo: { flexShrink: 1, fontSize: 14, fontWeight: "600", color: cores.branco },
  selo: { fontFamily: fontes.mono, fontSize: 10, letterSpacing: 0.5, color: cores.slate500 },
  texto: { fontSize: 12, lineHeight: 16, color: cores.slate400 },
  ver: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  verTexto: { fontSize: 12, fontWeight: "500", color: cores.branco },
});
