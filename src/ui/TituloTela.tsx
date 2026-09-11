import { StyleSheet, View } from "react-native";

import { Text } from "@/ui/Texto";
import type { LucideIcon } from "@/ui/Icone";
import { cores } from "@/tema";

// Título de tela no padrão do site: `<h1 class="flex items-center gap-2">` com um
// ícone lucide à esquerda (ex.: BarChart3 em Enquetes, Goal em Artilheiros).
export function TituloTela({ Icone, children }: { Icone?: LucideIcon; children: string }) {
  return (
    <View style={styles.linha}>
      {Icone ? <Icone size={20} color={cores.branco} /> : null}
      <Text style={styles.h1}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: { flexDirection: "row", alignItems: "center", gap: 8 },
  h1: { fontSize: 24, fontWeight: "700", color: cores.branco },
});
