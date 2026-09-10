import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { abrirNoNavegador } from "@/config/links";
import { BotaoContorno } from "@/painel/ui";
import { cores, tipografia } from "@/tema";

// Stub genérico pras partes ainda não portadas pro app (criar grupo, entrar por
// convite). Some quando a tela de verdade entrar numa próxima leva.
export default function EmBreve() {
  const { titulo } = useLocalSearchParams<{ titulo?: string }>();

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <View style={styles.topo}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={styles.voltar}>‹ Painel</Text>
        </Pressable>
      </View>

      <View style={styles.centro}>
        <Text style={styles.emoji}>🚧</Text>
        <Text style={tipografia.titulo}>{titulo ?? "Em breve"}</Text>
        <Text style={styles.texto}>
          Essa parte ainda está sendo trazida pro app. Por enquanto, dá pra fazer isso pelo
          site.
        </Text>
        <BotaoContorno titulo="Abrir o site" onPress={() => abrirNoNavegador("https://weracha.app")} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.dark },
  topo: { paddingHorizontal: 20, paddingTop: 4 },
  voltar: { fontSize: 16, color: cores.slate400 },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  emoji: { fontSize: 40 },
  texto: { fontSize: 14, lineHeight: 21, color: cores.slate400, textAlign: "center" },
});
