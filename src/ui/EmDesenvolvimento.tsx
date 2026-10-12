import { StyleSheet, View } from "react-native";

import { Text, FAMILIA_MONO } from "@/ui/Texto";
import { Hammer } from "@/ui/Icone";
import { cores, raio } from "@/tema";

// Card "Em desenvolvimento" das telas que dependem dos replays do We Racha Cam
// (Replays e Resenha vazias), que ainda não estão liberados pra todo grupo.
// Espelha o card das mesmas telas no site (app/replays e grupos/[id]/resenha).
export function EmDesenvolvimento({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.icone}>
        <Hammer size={24} color={cores.orange} />
      </View>
      <View style={styles.selo}>
        <Text style={styles.seloTexto}>Em desenvolvimento</Text>
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    gap: 12,
    borderRadius: raio.card,
    borderWidth: 1,
    borderColor: "rgba(242, 140, 30, 0.25)",
    backgroundColor: "rgba(242, 140, 30, 0.06)",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(242, 140, 30, 0.15)",
  },
  selo: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(242, 140, 30, 0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  seloTexto: {
    fontFamily: FAMILIA_MONO,
    fontSize: 10,
    letterSpacing: 1.5,
    color: cores.orange,
    textTransform: "uppercase",
  },
  titulo: { fontSize: 16, fontWeight: "600", color: cores.branco, textAlign: "center" },
  texto: { fontSize: 14, lineHeight: 21, color: cores.slate400, textAlign: "center" },
});
