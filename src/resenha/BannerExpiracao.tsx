import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "@/ui/Texto";

import { MESES_COMUNICADOS } from "@/contrato/expiracaoReplays";
import { ModalExpiracao } from "@/resenha/AjudaExpiracao";
import { cores, raio } from "@/tema";
import { Hourglass } from "@/ui/Icone";

// Aviso de que os replays duram 3 meses, no mesmo formato da faixa do Instagram
// (BannerInstagram.tsx), intercalado no feed por bannerDoFeedDepoisDe
// (src/contrato/bannersDoFeed.ts). Toque abre o mesmo modal do "!".
// Espelha weracha-site/components/banner-expiracao.tsx.
export function BannerExpiracao() {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.banner, pressed && styles.pressionado]}
        onPress={() => setAberto(true)}
        accessibilityRole="button"
        accessibilityLabel="Por quanto tempo os vídeos ficam guardados"
      >
        <View style={styles.icone}>
          <Hourglass size={24} color={cores.ambar} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.titulo}>Os replays duram {MESES_COMUNICADOS} meses</Text>
          <Text style={styles.texto}>
            Toque no coração dos que você quer guardar por mais tempo.
          </Text>
        </View>
        <View style={styles.botao}>
          <Text style={styles.botaoTexto}>Entenda</Text>
        </View>
      </Pressable>
      <ModalExpiracao aberto={aberto} onFechar={() => setAberto(false)} />
    </>
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
  icone: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  textos: { flex: 1, minWidth: 0, gap: 2 },
  titulo: { fontSize: 14, fontWeight: "600", color: cores.branco },
  texto: { fontSize: 12, lineHeight: 16, color: cores.slate400 },
  botao: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  botaoTexto: { fontSize: 12, fontWeight: "500", color: cores.branco },
});
