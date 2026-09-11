import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";

import { abrirNoNavegador } from "@/config/links";
import { BotaoContorno } from "@/painel/ui";
import { Navbar } from "@/ui/Navbar";
import { cores, tipografia } from "@/tema";

// Stub genérico pras partes ainda não portadas pro app (criar grupo, entrar por
// convite). Some quando a tela de verdade entrar numa próxima leva.
export default function EmBreve() {
  const { titulo } = useLocalSearchParams<{ titulo?: string }>();

  return (
    <SafeAreaView style={styles.tela} edges={["top", "left", "right"]}>
      <Navbar voltar="Voltar" />

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
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  emoji: { fontSize: 40 },
  texto: { fontSize: 14, lineHeight: 21, color: cores.slate400, textAlign: "center" },
});
